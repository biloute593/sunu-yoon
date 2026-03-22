import { io, Socket } from 'socket.io-client';
import { TokenManager, API_BASE_URL, ApiClient } from './apiClient';

const SOCKET_URL = API_BASE_URL.replace('/api', '');

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isRead: boolean;
  createdAt: string;
  sender?: {
    id: string;
    name: string;
    avatarUrl: string;
  };
}

export interface Conversation {
  id: string;
  ride?: {
    id: string;
    origin: string;
    destination: string;
    departureTime: string;
  };
  participants: Array<{ id: string; name: string; avatarUrl?: string }>;
  lastMessage?: {
    content: string;
    senderName: string;
    createdAt: string;
    isFromMe: boolean;
  };
  unreadCount: number;
  updatedAt: string;
}

type MessageCallback = (message: Message) => void;
type TypingCallback = (data: { conversationId: string; userId: string; isTyping: boolean }) => void;

// Singleton pour la connexion WebSocket
class SocketService {
  private socket: Socket | null = null;
  private messageListeners: Set<MessageCallback> = new Set();
  private typingListeners: Set<TypingCallback> = new Set();

  // Connecter au serveur WebSocket
  connect(): void {
    if (this.socket?.connected) return;

    const token = TokenManager.getAccessToken();
    if (!token) return;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    this.socket.on('connect', () => {
      console.log('🔌 WebSocket connecté');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 WebSocket déconnecté');
    });

    this.socket.on('connect_error', (error: Error) => {
      console.error('Erreur WebSocket:', error.message);
    });

    // Écouter les nouveaux messages
    this.socket.on('new_message', (message: Message) => {
      this.messageListeners.forEach(callback => callback(message));
    });

    // Écouter les indicateurs de frappe
    this.socket.on('user_typing', (data: any) => {
      this.typingListeners.forEach(callback => callback({ ...data, isTyping: true }));
    });

    this.socket.on('user_stopped_typing', (data: any) => {
      this.typingListeners.forEach(callback => callback({ ...data, isTyping: false }));
    });
  }

  // Déconnecter
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  // Rejoindre une conversation
  joinConversation(conversationId: string): void {
    this.socket?.emit('join_conversation', conversationId);
  }

  // Quitter une conversation
  leaveConversation(conversationId: string): void {
    this.socket?.emit('leave_conversation', conversationId);
  }

  // Envoyer un message
  sendMessage(conversationId: string, content: string): void {
    this.socket?.emit('send_message', { conversationId, content });
  }

  // Indiquer qu'on écrit
  sendTypingIndicator(conversationId: string, isTyping: boolean): void {
    if (isTyping) {
      this.socket?.emit('typing_start', conversationId);
    } else {
      this.socket?.emit('typing_stop', conversationId);
    }
  }

  // Marquer les messages comme lus
  markAsRead(conversationId: string, messageId: string): void {
    this.socket?.emit('mark_as_read', { conversationId, messageId });
  }

  // Écouter les nouveaux messages
  onNewMessage(callback: MessageCallback): void {
    this.messageListeners.add(callback);
  }

  offNewMessage(callback: MessageCallback): void {
    this.messageListeners.delete(callback);
  }

  // Écouter le statut de frappe
  onTyping(callback: TypingCallback): void {
    this.typingListeners.add(callback);
  }

  offTyping(callback: TypingCallback): void {
    this.typingListeners.delete(callback);
  }
}

// Instance singleton exportée
export const socketService = new SocketService();

// Service de messagerie combinant REST et WebSocket
export const messageService = {
  // Méthodes WebSocket déléguées
  connect: () => socketService.connect(),
  disconnect: () => socketService.disconnect(),
  joinConversation: (id: string) => socketService.joinConversation(id),
  leaveConversation: (id: string) => socketService.leaveConversation(id),
  sendMessage: (conversationId: string, content: string) => socketService.sendMessage(conversationId, content),
  sendTypingIndicator: (conversationId: string, isTyping: boolean) => socketService.sendTypingIndicator(conversationId, isTyping),
  markAsRead: (conversationId: string, messageId: string) => socketService.markAsRead(conversationId, messageId),
  onNewMessage: (callback: MessageCallback) => socketService.onNewMessage(callback),
  offNewMessage: (callback: MessageCallback) => socketService.offNewMessage(callback),
  onTyping: (callback: TypingCallback) => socketService.onTyping(callback),
  offTyping: (callback: TypingCallback) => socketService.offTyping(callback),

  // Créer une conversation
  async createConversation(recipientId: string, rideId: string): Promise<Conversation> {
    const response = await ApiClient.post<{ conversation: Conversation }>(
      '/messages/conversations',
      { recipientId, rideId }
    );
    if (response.success && response.data?.conversation) {
      return response.data.conversation;
    }
    throw new Error('Failed to create conversation');
  },

  // Lister mes conversations
  async getConversations(): Promise<Conversation[]> {
    const response = await ApiClient.get<{ conversations: Conversation[] }>('/messages/conversations');
    return response.success ? response.data?.conversations || [] : [];
  },

  // Obtenir les messages d'une conversation
  async getMessages(conversationId: string, before?: string): Promise<Message[]> {
    const params = before ? `?before=${before}` : '';
    const response = await ApiClient.get<{ messages: Message[] }>(
      `/messages/conversations/${conversationId}/messages${params}`
    );
    return response.success ? response.data?.messages || [] : [];
  },

  // Envoyer un message via REST (fallback)
  async sendMessageREST(conversationId: string, content: string): Promise<Message> {
    const response = await ApiClient.post<{ message: Message }>(
      `/messages/conversations/${conversationId}/messages`,
      { content }
    );
    if (response.success && response.data?.message) {
      return response.data.message;
    }
    throw new Error('Failed to send message');
  }
};
