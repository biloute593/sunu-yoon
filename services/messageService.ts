import { supabase, supabaseEnabled } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { io as createSocket, Socket } from 'socket.io-client';
import { ApiClient, API_ROOT_URL } from './apiClient';
import { authService } from './authService';

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: { id: string; name: string; avatarUrl: string };
  mediaType?: 'text' | 'audio' | 'image' | 'video';
  mediaUrl?: string;
}

export interface Conversation {
  id: string;
  ride?: { id: string; origin: string; destination: string; departureTime: string };
  participants: Array<{ id: string; name: string; avatarUrl?: string }>;
  lastMessage?: { content: string; senderName: string; createdAt: string; isFromMe: boolean };
  unreadCount: number;
  updatedAt: string;
}

type MessageCallback = (message: Message) => void;
type TypingCallback = (data: { conversationId: string; userId: string; isTyping: boolean }) => void;

interface ConversationSeed {
  recipientName?: string;
  recipientAvatar?: string;
  ride?: Conversation['ride'];
}

interface CurrentUserSnapshot {
  id: string;
  name: string;
  avatarUrl?: string;
}

interface SupabaseConversationRow {
  id: string;
  ride_id: string | null;
  participant_1: string;
  participant_2: string;
  updated_at: string;
}

interface SupabaseProfileRow {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface SupabaseRideRow {
  id: string;
  origin: string;
  destination: string;
  departure_time: string;
}

interface SupabaseMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: SupabaseProfileRow | null;
}

interface BackendParticipantRow {
  id: string;
  name: string;
  avatarUrl?: string | null;
}

interface BackendMessageRow {
  id: string;
  conversationId?: string;
  conversation_id?: string;
  senderId?: string;
  sender_id?: string;
  receiverId?: string;
  receiver_id?: string;
  content: string;
  isRead?: boolean;
  is_read?: boolean;
  createdAt?: string;
  created_at?: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl?: string | null;
    avatar_url?: string | null;
  } | null;
}

interface BackendConversationSummaryRow {
  id: string;
  ride?: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
  } | null;
  participants?: BackendParticipantRow[];
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
    isFromMe: boolean;
  } | null;
  unreadCount?: number;
  updatedAt: string;
}

interface BackendConversationCreateRow {
  id: string;
  rideId?: string;
  ride?: {
    origin: string;
    destination: string;
    departureTime: string;
  } | null;
  otherParticipant?: BackendParticipantRow | null;
  messages?: BackendMessageRow[];
}

const LOCAL_CONVERSATIONS_KEY = 'sunu_yoon_conversations_db';
const LOCAL_MESSAGES_KEY = 'sunu_yoon_messages_db';
const BACKEND_ENABLED = !!API_ROOT_URL;

const loadLocalConversations = (): Record<string, Conversation> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_CONVERSATIONS_KEY) || '{}') as Record<string, Conversation>;
  } catch {
    return {};
  }
};

const loadLocalMessages = (): Record<string, Message[]> => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_MESSAGES_KEY) || '{}') as Record<string, Message[]>;
  } catch {
    return {};
  }
};

const localConversations = new Map<string, Conversation>(Object.entries(loadLocalConversations()));
const localMessages = new Map<string, Message[]>(Object.entries(loadLocalMessages()));
const conversationCache = new Map<string, Conversation>();
const remoteMessagesCache = new Map<string, Message[]>();

const persistLocalState = (): void => {
  localStorage.setItem(LOCAL_CONVERSATIONS_KEY, JSON.stringify(Object.fromEntries(localConversations.entries())));
  localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(Object.fromEntries(localMessages.entries())));
};

const getCurrentUser = (): CurrentUserSnapshot => {
  try {
    const rawUser = JSON.parse(localStorage.getItem('sunu_yoon_user') || 'null') as {
      id?: string;
      name?: string;
      firstName?: string;
      lastName?: string;
      avatarUrl?: string;
    } | null;

    const name = rawUser?.name
      || [rawUser?.firstName, rawUser?.lastName].filter(Boolean).join(' ').trim()
      || 'Vous';

    return {
      id: rawUser?.id || 'me',
      name,
      avatarUrl: rawUser?.avatarUrl
    };
  } catch {
    return { id: 'me', name: 'Vous' };
  }
};

const getCurrentUserId = (): string => getCurrentUser().id;

const isBackendMode = (): boolean => {
  return BACKEND_ENABLED && authService.getAuthProvider() === 'backend' && !!authService.getToken();
};

const isSupabaseMode = (): boolean => {
  return !!supabase && !!supabaseEnabled && authService.getAuthProvider() === 'supabase';
};

const buildLocalConversationId = (currentUserId: string, recipientId: string, rideId?: string): string => {
  return `local_${rideId || 'general'}_${[currentUserId, recipientId].sort().join('_')}`;
};

const parseMessageMedia = (message: Message): Message => {
  try {
    if (message.content.startsWith('{') && message.content.endsWith('}')) {
      const parsed = JSON.parse(message.content);
      if (parsed.type && (parsed.url || parsed.fileUrl)) {
        return {
          ...message,
          mediaType: parsed.type,
          mediaUrl: parsed.url || parsed.fileUrl,
          content: parsed.text || ''
        };
      }
    }
  } catch (e) {
    // Not JSON
  }
  return { ...message, mediaType: 'text' };
};

const toMessage = (row: SupabaseMessageRow): Message => parseMessageMedia({
  id: row.id,
  conversationId: row.conversation_id,
  senderId: row.sender_id,
  receiverId: '',
  content: row.content,
  isRead: row.is_read,
  createdAt: row.created_at,
  sender: row.sender
    ? {
        id: row.sender.id,
        name: row.sender.name,
        avatarUrl: row.sender.avatar_url || ''
      }
    : undefined,
});

const toBackendMessage = (row: BackendMessageRow): Message => parseMessageMedia({
  id: row.id,
  conversationId: row.conversationId || row.conversation_id || '',
  senderId: row.senderId || row.sender_id || '',
  receiverId: row.receiverId || row.receiver_id || '',
  content: row.content,
  isRead: row.isRead ?? row.is_read ?? false,
  createdAt: row.createdAt || row.created_at || new Date().toISOString(),
  sender: row.sender
    ? {
        id: row.sender.id,
        name: row.sender.name,
        avatarUrl: row.sender.avatarUrl || row.sender.avatar_url || ''
      }
    : undefined,
});

const enrichLocalConversation = (conversation: Conversation): Conversation => {
  const currentUserId = getCurrentUserId();
  const messages = (localMessages.get(conversation.id) || []).slice().sort((left, right) => {
    return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
  });
  const lastMessage = messages[messages.length - 1];

  return {
    ...conversation,
    unreadCount: messages.filter((message) => !message.isRead && message.senderId !== currentUserId).length,
    updatedAt: lastMessage?.createdAt || conversation.updatedAt,
    lastMessage: lastMessage
      ? {
          content: lastMessage.content,
          senderName: lastMessage.sender?.name || (lastMessage.senderId === currentUserId ? 'Vous' : 'Contact'),
          createdAt: lastMessage.createdAt,
          isFromMe: lastMessage.senderId === currentUserId
        }
      : conversation.lastMessage
  };
};

const mapConversationParticipants = (
  conversation: SupabaseConversationRow,
  profiles: Map<string, SupabaseProfileRow>,
  currentUserId: string
): Conversation['participants'] => {
  return [conversation.participant_1, conversation.participant_2].map((participantId) => {
    const profile = profiles.get(participantId);
    return {
      id: participantId,
      name: profile?.name || (participantId === currentUserId ? getCurrentUser().name : 'Contact'),
      avatarUrl: profile?.avatar_url || undefined
    };
  });
};

const mapBackendConversationSummary = (row: BackendConversationSummaryRow): Conversation => ({
  id: row.id,
  ride: row.ride || undefined,
  participants: (row.participants || []).map((participant) => ({
    id: participant.id,
    name: participant.name,
    avatarUrl: participant.avatarUrl || undefined
  })),
  lastMessage: row.lastMessage || undefined,
  unreadCount: row.unreadCount || 0,
  updatedAt: row.updatedAt
});

const storeConversation = (conversation: Conversation): Conversation => {
  conversationCache.set(conversation.id, conversation);
  return conversation;
};

const storeRemoteMessages = (conversationId: string, messages: Message[]): Message[] => {
  remoteMessagesCache.set(conversationId, messages);
  return messages;
};

const mergeRemoteMessage = (message: Message): void => {
  const existingMessages = remoteMessagesCache.get(message.conversationId) || [];
  if (!existingMessages.some((item) => item.id === message.id)) {
    remoteMessagesCache.set(message.conversationId, [...existingMessages, message]);
  }

  const currentUserId = getCurrentUserId();
  const conversation = conversationCache.get(message.conversationId);
  if (conversation) {
    conversationCache.set(message.conversationId, {
      ...conversation,
      updatedAt: message.createdAt,
      unreadCount: message.senderId === currentUserId ? conversation.unreadCount : conversation.unreadCount + (message.isRead ? 0 : 1),
      lastMessage: {
        content: message.content,
        senderName: message.sender?.name || (message.senderId === currentUserId ? 'Vous' : 'Contact'),
        createdAt: message.createdAt,
        isFromMe: message.senderId === currentUserId
      }
    });
  }
};

const markConversationReadInCache = (conversationId: string): void => {
  const currentUserId = getCurrentUserId();
  const messages = remoteMessagesCache.get(conversationId);
  if (messages) {
    remoteMessagesCache.set(conversationId, messages.map((message) => {
      if (message.senderId === currentUserId) {
        return message;
      }
      return { ...message, isRead: true };
    }));
  }

  const conversation = conversationCache.get(conversationId);
  if (conversation) {
    conversationCache.set(conversationId, { ...conversation, unreadCount: 0 });
  }
};

const getOtherParticipantId = (conversation: Conversation | null | undefined): string => {
  if (!conversation) {
    return '';
  }

  const currentUserId = getCurrentUserId();
  return conversation.participants.find((participant) => participant.id !== currentUserId)?.id
    || conversation.participants[0]?.id
    || '';
};

const buildBackendConversation = (
  row: BackendConversationCreateRow,
  recipientId: string,
  seed?: ConversationSeed
): Conversation => {
  const participant = row.otherParticipant || {
    id: recipientId,
    name: seed?.recipientName || 'Contact',
    avatarUrl: seed?.recipientAvatar || null
  };
  const messages = (row.messages || []).map(toBackendMessage);
  const lastMessage = messages[messages.length - 1];

  if (messages.length > 0) {
    storeRemoteMessages(row.id, messages);
  }

  return storeConversation({
    id: row.id,
    ride: row.ride
      ? {
          id: row.rideId || seed?.ride?.id || '',
          origin: row.ride.origin,
          destination: row.ride.destination,
          departureTime: row.ride.departureTime
        }
      : seed?.ride,
    participants: participant?.id
      ? [{ id: participant.id, name: participant.name, avatarUrl: participant.avatarUrl || undefined }]
      : [],
    lastMessage: lastMessage
      ? {
          content: lastMessage.content,
          senderName: lastMessage.sender?.name || 'Contact',
          createdAt: lastMessage.createdAt,
          isFromMe: lastMessage.senderId === getCurrentUserId()
        }
      : undefined,
    unreadCount: 0,
    updatedAt: lastMessage?.createdAt || new Date().toISOString()
  });
};

async function fetchBackendConversations(): Promise<Conversation[]> {
  const response = await ApiClient.get<{ conversations: BackendConversationSummaryRow[] }>('/messages/conversations');
  if (!response.success) {
    throw new Error(response.error?.message || response.message || 'Impossible de charger les conversations.');
  }

  return (response.data?.conversations || []).map((conversation) => storeConversation(mapBackendConversationSummary(conversation)));
}

async function fetchBackendMessages(conversationId: string, before?: string): Promise<Message[]> {
  const searchParams = new URLSearchParams();
  if (before) {
    searchParams.set('before', before);
  }

  const suffix = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const response = await ApiClient.get<{ messages: BackendMessageRow[] }>(`/messages/conversations/${conversationId}/messages${suffix}`);
  if (!response.success) {
    throw new Error(response.error?.message || response.message || 'Impossible de charger les messages.');
  }

  return storeRemoteMessages(conversationId, (response.data?.messages || []).map(toBackendMessage));
}

let realtimeChannel: RealtimeChannel | null = null;
let socket: Socket | null = null;
let socketHandlersAttached = false;
const joinedConversationIds: Set<string> = new Set();
const messageListeners: Set<MessageCallback> = new Set();
const typingListeners: Set<TypingCallback> = new Set();

function subscribeToConversation(conversationId: string) {
  if (!isSupabaseMode()) {
    return;
  }

  if (realtimeChannel) {
    supabase!.removeChannel(realtimeChannel);
  }

  realtimeChannel = supabase!
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => {
        const row = payload.new as {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          is_read: boolean;
          created_at: string;
        };

        if (row.sender_id === getCurrentUserId()) {
          return;
        }

        messageListeners.forEach((listener) => listener({
          id: row.id,
          conversationId: row.conversation_id,
          senderId: row.sender_id,
          receiverId: '',
          content: row.content,
          isRead: row.is_read,
          createdAt: row.created_at,
        }));
      }
    )
    .subscribe();
}

function attachSocketHandlers(): void {
  if (!socket || socketHandlersAttached) {
    return;
  }

  socketHandlersAttached = true;

  socket.on('connect', () => {
    joinedConversationIds.forEach((conversationId) => {
      socket?.emit('join_conversation', conversationId);
    });
  });

  socket.on('conversation_history', (messages: BackendMessageRow[]) => {
    if (!Array.isArray(messages) || messages.length === 0) {
      return;
    }

    const normalized = messages.map(toBackendMessage);
    const conversationId = normalized[0]?.conversationId;
    if (conversationId) {
      storeRemoteMessages(conversationId, normalized);
    }
  });

  socket.on('new_message', (payload: BackendMessageRow) => {
    const message = toBackendMessage(payload);
    mergeRemoteMessage(message);
    messageListeners.forEach((listener) => listener(message));
  });

  socket.on('user_typing', (payload: { conversationId: string; userId: string }) => {
    typingListeners.forEach((listener) => listener({
      conversationId: payload.conversationId,
      userId: payload.userId,
      isTyping: true
    }));
  });

  socket.on('user_stopped_typing', (payload: { conversationId: string; userId: string }) => {
    typingListeners.forEach((listener) => listener({
      conversationId: payload.conversationId,
      userId: payload.userId,
      isTyping: false
    }));
  });

  socket.on('messages_read', (payload: { conversationId: string }) => {
    markConversationReadInCache(payload.conversationId);
  });
}

function connectBackendSocket(): boolean {
  if (!isBackendMode()) {
    return false;
  }

  const token = authService.getToken();
  if (!token) {
    return false;
  }

  if (!socket) {
    socket = createSocket(API_ROOT_URL, {
      autoConnect: true,
      transports: ['websocket', 'polling'],
      auth: { token }
    });
    socketHandlersAttached = false;
    attachSocketHandlers();
  } else if (!socket.connected) {
    socket.auth = { token };
    socket.connect();
  }

  return true;
}

export const socketService = {
  connect: () => {
    if (isBackendMode()) {
      connectBackendSocket();
    }
  },
  disconnect: () => {
    if (supabase && realtimeChannel) {
      supabase.removeChannel(realtimeChannel);
      realtimeChannel = null;
    }

    joinedConversationIds.clear();
    if (socket) {
      socket.disconnect();
      socket = null;
      socketHandlersAttached = false;
    }
  },
  joinConversation: (id: string) => {
    if (isBackendMode()) {
      joinedConversationIds.add(id);
      if (connectBackendSocket() && socket?.connected) {
        socket.emit('join_conversation', id);
      }
      return;
    }

    subscribeToConversation(id);
  },
  leaveConversation: (id: string) => {
    joinedConversationIds.delete(id);
    if (isBackendMode() && socket?.connected) {
      socket.emit('leave_conversation', id);
    }
  },
  sendMessage: (id: string, content: string) => {
    if (isBackendMode()) {
      if (!connectBackendSocket() || !socket?.connected) {
        return false;
      }

      socket.emit('send_message', { conversationId: id, content });
      return true;
    }

    return false;
  },
  sendTypingIndicator: (id: string, typing: boolean) => {
    if (isBackendMode() && socket?.connected) {
      socket.emit(typing ? 'typing_start' : 'typing_stop', id);
    }
  },
  markAsRead: (id: string) => {
    if (isBackendMode()) {
      markConversationReadInCache(id);
      if (socket?.connected) {
        socket.emit('mark_as_read', id);
      }
    }
  },
  onNewMessage: (cb: MessageCallback) => messageListeners.add(cb),
  offNewMessage: (cb: MessageCallback) => messageListeners.delete(cb),
  onTyping: (cb: TypingCallback) => typingListeners.add(cb),
  offTyping: (cb: TypingCallback) => typingListeners.delete(cb),

  // === Booking Events (proper API, no more .socket hacks) ===
  getSocket: (): Socket | null => {
    if (isBackendMode()) {
      connectBackendSocket();
    }
    return socket;
  },

  requestBooking: (data: { rideId: string; seats: number; passengerName: string; passengerPhone: string }) => {
    if (isBackendMode()) {
      connectBackendSocket();
    }
    if (socket?.connected) {
      socket.emit('request_booking', data);
      return true;
    }
    return false;
  },

  respondBooking: (data: { bookingId: string; accepted: boolean }) => {
    if (socket?.connected) {
      socket.emit('respond_booking', data);
      return true;
    }
    return false;
  },

  onBookingResponse: (cb: (data: any) => void) => {
    if (isBackendMode()) { connectBackendSocket(); }
    if (socket) { socket.on('booking_response', cb); }
  },
  offBookingResponse: (cb: (data: any) => void) => {
    if (socket) { socket.off('booking_response', cb); }
  },

  onBookingError: (cb: (data: any) => void) => {
    if (socket) { socket.on('booking_error', cb); }
  },
  offBookingError: (cb: (data: any) => void) => {
    if (socket) { socket.off('booking_error', cb); }
  },

  onBookingRequested: (cb: (data: any) => void) => {
    if (isBackendMode()) { connectBackendSocket(); }
    if (socket) { socket.on('booking_requested', cb); }
  },
  offBookingRequested: (cb: (data: any) => void) => {
    if (socket) { socket.off('booking_requested', cb); }
  },
};

export const messageService = {
  connect: () => socketService.connect(),
  disconnect: () => socketService.disconnect(),
  joinConversation: (id: string) => socketService.joinConversation(id),
  leaveConversation: (id: string) => socketService.leaveConversation(id),
  sendMessage: (id: string, content: string) => socketService.sendMessage(id, content),
  sendTypingIndicator: (id: string, typing: boolean) => socketService.sendTypingIndicator(id, typing),
  markAsRead: (conversationId: string) => {
    if (isBackendMode()) {
      socketService.markAsRead(conversationId);
      return;
    }

    if (isSupabaseMode()) {
      supabase!
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', getCurrentUserId())
        .then(() => {});
      return;
    }

    const currentUserId = getCurrentUserId();
    const updatedMessages = (localMessages.get(conversationId) || []).map((message) => {
      if (message.senderId === currentUserId) {
        return message;
      }
      return { ...message, isRead: true };
    });

    localMessages.set(conversationId, updatedMessages);
    const conversation = localConversations.get(conversationId);
    if (conversation) {
      localConversations.set(conversationId, enrichLocalConversation({ ...conversation, unreadCount: 0 }));
    }
    persistLocalState();
  },
  onNewMessage: (cb: MessageCallback) => messageListeners.add(cb),
  offNewMessage: (cb: MessageCallback) => messageListeners.delete(cb),
  onTyping: (cb: TypingCallback) => typingListeners.add(cb),
  offTyping: (cb: TypingCallback) => typingListeners.delete(cb),

  // Booking events (proxy to socketService)
  getSocket: () => socketService.getSocket(),
  requestBooking: (data: { rideId: string; seats: number; passengerName: string; passengerPhone: string }) => socketService.requestBooking(data),
  respondBooking: (data: { bookingId: string; accepted: boolean }) => socketService.respondBooking(data),
  onBookingResponse: (cb: (data: any) => void) => socketService.onBookingResponse(cb),
  offBookingResponse: (cb: (data: any) => void) => socketService.offBookingResponse(cb),
  onBookingError: (cb: (data: any) => void) => socketService.onBookingError(cb),
  offBookingError: (cb: (data: any) => void) => socketService.offBookingError(cb),
  onBookingRequested: (cb: (data: any) => void) => socketService.onBookingRequested(cb),
  offBookingRequested: (cb: (data: any) => void) => socketService.offBookingRequested(cb),

  async createConversation(recipientId: string, rideId: string, seed?: ConversationSeed): Promise<Conversation> {
    const currentUser = getCurrentUser();

    if (isBackendMode()) {
      const response = await ApiClient.post<{ conversation: BackendConversationCreateRow }>('/messages/conversations', { rideId });
      if (!response.success || !response.data?.conversation) {
        throw new Error(response.error?.message || response.message || 'Impossible de créer la conversation.');
      }

      return buildBackendConversation(response.data.conversation, recipientId, seed);
    }

    if (isSupabaseMode()) {
      const { data: existing, error: existingError } = await supabase!
        .from('conversations')
        .select('id, ride_id, participant_1, participant_2, updated_at')
        .or(`and(participant_1.eq.${currentUser.id},participant_2.eq.${recipientId}),and(participant_1.eq.${recipientId},participant_2.eq.${currentUser.id})`)
        .eq('ride_id', rideId)
        .maybeSingle();

      if (existingError) {
        throw new Error(existingError.message);
      }

      if (existing) {
        return storeConversation({
          id: existing.id,
          ride: seed?.ride,
          participants: [
            { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
            { id: recipientId, name: seed?.recipientName || 'Contact', avatarUrl: seed?.recipientAvatar }
          ],
          unreadCount: 0,
          updatedAt: existing.updated_at,
        });
      }

      const { data: created, error } = await supabase!
        .from('conversations')
        .insert({ ride_id: rideId || null, participant_1: currentUser.id, participant_2: recipientId })
        .select('id, ride_id, participant_1, participant_2, updated_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      return storeConversation({
        id: created.id,
        ride: seed?.ride,
        participants: [
          { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
          { id: recipientId, name: seed?.recipientName || 'Contact', avatarUrl: seed?.recipientAvatar }
        ],
        unreadCount: 0,
        updatedAt: created.updated_at,
      });
    }

    const conversationId = buildLocalConversationId(currentUser.id, recipientId, rideId);
    const existing = localConversations.get(conversationId);
    if (existing) {
      const updatedConversation = enrichLocalConversation({
        ...existing,
        ride: existing.ride || seed?.ride,
        participants: existing.participants.map((participant) => {
          if (participant.id !== recipientId) {
            return participant;
          }
          return {
            ...participant,
            name: seed?.recipientName || participant.name || 'Contact',
            avatarUrl: seed?.recipientAvatar || participant.avatarUrl,
          };
        })
      });

      localConversations.set(conversationId, updatedConversation);
      persistLocalState();
      return storeConversation(updatedConversation);
    }

    const conversation: Conversation = {
      id: conversationId,
      ride: seed?.ride || (rideId ? {
        id: rideId,
        origin: 'Trajet',
        destination: 'Trajet',
        departureTime: new Date().toISOString()
      } : undefined),
      participants: [
        { id: currentUser.id, name: currentUser.name, avatarUrl: currentUser.avatarUrl },
        { id: recipientId, name: seed?.recipientName || 'Chauffeur', avatarUrl: seed?.recipientAvatar }
      ],
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    };

    localConversations.set(conversationId, conversation);
    localMessages.set(conversationId, []);
    persistLocalState();
    return storeConversation(conversation);
  },

  async getConversations(): Promise<Conversation[]> {
    const currentUserId = getCurrentUserId();

    if (isBackendMode()) {
      return fetchBackendConversations();
    }

    if (isSupabaseMode()) {
      const { data, error } = await supabase!
        .from('conversations')
        .select('id, ride_id, participant_1, participant_2, updated_at')
        .or(`participant_1.eq.${currentUserId},participant_2.eq.${currentUserId}`)
        .order('updated_at', { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

      const conversations = (data || []) as SupabaseConversationRow[];
      if (conversations.length === 0) {
        return [];
      }

      const participantIds = Array.from(new Set(
        conversations.flatMap((conversation) => [conversation.participant_1, conversation.participant_2])
      ));
      const rideIds = Array.from(new Set(
        conversations.map((conversation) => conversation.ride_id).filter(Boolean)
      )) as string[];
      const conversationIds = conversations.map((conversation) => conversation.id);

      const [profilesResult, ridesResult, messagesResult] = await Promise.all([
        participantIds.length > 0
          ? supabase!.from('profiles').select('id, name, avatar_url').in('id', participantIds)
          : Promise.resolve({ data: [] as SupabaseProfileRow[], error: null }),
        rideIds.length > 0
          ? supabase!.from('rides').select('id, origin, destination, departure_time').in('id', rideIds)
          : Promise.resolve({ data: [] as SupabaseRideRow[], error: null }),
        conversationIds.length > 0
          ? supabase!
              .from('messages')
              .select('id, conversation_id, sender_id, content, is_read, created_at')
              .in('conversation_id', conversationIds)
              .order('created_at', { ascending: false })
          : Promise.resolve({ data: [] as SupabaseMessageRow[], error: null })
      ]);

      if (profilesResult.error) {
        throw new Error(profilesResult.error.message);
      }
      if (ridesResult.error) {
        throw new Error(ridesResult.error.message);
      }
      if (messagesResult.error) {
        throw new Error(messagesResult.error.message);
      }

      const profiles = new Map<string, SupabaseProfileRow>(
        (profilesResult.data || []).map((profile) => [profile.id, profile])
      );
      const rides = new Map<string, Conversation['ride']>(
        (ridesResult.data || []).map((ride) => [
          ride.id,
          {
            id: ride.id,
            origin: ride.origin,
            destination: ride.destination,
            departureTime: ride.departure_time
          }
        ])
      );

      const latestMessageByConversation = new Map<string, SupabaseMessageRow>();
      const unreadCountByConversation = new Map<string, number>();

      for (const message of (messagesResult.data || []) as SupabaseMessageRow[]) {
        if (!latestMessageByConversation.has(message.conversation_id)) {
          latestMessageByConversation.set(message.conversation_id, message);
        }
        if (message.sender_id !== currentUserId && !message.is_read) {
          unreadCountByConversation.set(
            message.conversation_id,
            (unreadCountByConversation.get(message.conversation_id) || 0) + 1
          );
        }
      }

      return conversations.map((conversation) => {
        const latestMessage = latestMessageByConversation.get(conversation.id);
        return storeConversation({
          id: conversation.id,
          ride: conversation.ride_id ? rides.get(conversation.ride_id) : undefined,
          participants: mapConversationParticipants(conversation, profiles, currentUserId),
          lastMessage: latestMessage ? {
            content: latestMessage.content,
            senderName: profiles.get(latestMessage.sender_id)?.name || (latestMessage.sender_id === currentUserId ? 'Vous' : 'Contact'),
            createdAt: latestMessage.created_at,
            isFromMe: latestMessage.sender_id === currentUserId
          } : undefined,
          unreadCount: unreadCountByConversation.get(conversation.id) || 0,
          updatedAt: latestMessage?.created_at || conversation.updated_at,
        });
      });
    }

    return Array.from(localConversations.values())
      .map((conversation) => storeConversation(enrichLocalConversation(conversation)))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  },

  async getMessages(conversationId: string, before?: string): Promise<Message[]> {
    if (isBackendMode()) {
      return fetchBackendMessages(conversationId, before);
    }

    if (isSupabaseMode()) {
      const { data, error } = await supabase!
        .from('messages')
        .select('id, conversation_id, sender_id, content, is_read, created_at, sender:profiles(id, name, avatar_url)')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(error.message);
      }

      return ((data || []) as SupabaseMessageRow[]).map(toMessage);
    }

    return (localMessages.get(conversationId) || []).slice().sort((left, right) => {
      return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    });
  },

  async sendMessageREST(conversationId: string, content: string): Promise<Message> {
    const currentUser = getCurrentUser();

    if (isBackendMode()) {
      let conversation = conversationCache.get(conversationId) || null;
      if (!conversation) {
        const conversations = await fetchBackendConversations();
        conversation = conversations.find((item) => item.id === conversationId) || null;
      }

      const receiverId = getOtherParticipantId(conversation);
      if (!receiverId) {
        throw new Error('Destinataire introuvable pour cette conversation.');
      }

      const response = await ApiClient.post<{ message: BackendMessageRow }>(`/messages/conversations/${conversationId}/messages`, {
        content,
        receiverId
      });

      if (!response.success || !response.data?.message) {
        throw new Error(response.error?.message || response.message || 'Impossible d\'envoyer le message.');
      }

      const message = toBackendMessage(response.data.message);
      mergeRemoteMessage(message);
      return message;
    }

    if (isSupabaseMode()) {
      const { data, error } = await supabase!
        .from('messages')
        .insert({ conversation_id: conversationId, sender_id: currentUser.id, content })
        .select('id, conversation_id, sender_id, content, is_read, created_at')
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await supabase!
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      return {
        id: data.id,
        conversationId: data.conversation_id,
        senderId: data.sender_id,
        receiverId: '',
        content: data.content,
        isRead: data.is_read,
        createdAt: data.created_at,
        sender: {
          id: currentUser.id,
          name: currentUser.name,
          avatarUrl: currentUser.avatarUrl || ''
        }
      };
    }

    const conversation = localConversations.get(conversationId);
    const receiverId = conversation?.participants.find((participant) => participant.id !== currentUser.id)?.id || '';
    const message: Message = {
      id: `local_msg_${Date.now()}`,
      conversationId,
      senderId: currentUser.id,
      receiverId,
      content,
      isRead: true,
      createdAt: new Date().toISOString(),
      sender: {
        id: currentUser.id,
        name: currentUser.name,
        avatarUrl: currentUser.avatarUrl || ''
      }
    };

    const existingMessages = localMessages.get(conversationId) || [];
    localMessages.set(conversationId, [...existingMessages, message]);

    if (conversation) {
      localConversations.set(conversationId, enrichLocalConversation({
        ...conversation,
        updatedAt: message.createdAt,
        lastMessage: {
          content,
          senderName: currentUser.name,
          createdAt: message.createdAt,
          isFromMe: true
        }
      }));
    }

    persistLocalState();
    return message;
  },
};