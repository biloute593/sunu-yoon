import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messageService, Message, Conversation } from '../services/messageService';
import { Icons } from './Icons';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  rideId?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
  rideId
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Charger ou créer la conversation
  useEffect(() => {
    if (!isOpen || !user) return;

    const initChat = async () => {
      setIsLoading(true);
      try {
        // Chercher une conversation existante ou en créer une
        const conversations = await messageService.getConversations();
        const existing = conversations.find(c => 
          c.participants.some(p => p.id === recipientId)
        );

        if (existing) {
          setConversationId(existing.id);
          const msgs = await messageService.getMessages(existing.id);
          setMessages(msgs);
        } else if (rideId) {
          // Créer une nouvelle conversation
          const newConv = await messageService.createConversation(recipientId, rideId);
          setConversationId(newConv.id);
          setMessages([]);
        }
      } catch (error) {
        console.error('Erreur chargement chat:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initChat();
  }, [isOpen, user, recipientId, rideId]);

  // Initialiser WebSocket
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    // Se connecter au WebSocket
    messageService.connect();
    messageService.joinConversation(conversationId);

    // Écouter les nouveaux messages
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => [...prev, message]);
        // Marquer comme lu si c'est un message reçu
        if (message.senderId !== user?.id) {
          messageService.markAsRead(conversationId, message.id);
        }
      }
    };

    // Écouter le statut "en train d'écrire"
    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId === recipientId) {
        setIsTyping(data.isTyping);
      }
    };

    messageService.onNewMessage(handleNewMessage);
    messageService.onTyping(handleTyping);

    return () => {
      messageService.leaveConversation(conversationId);
      messageService.offNewMessage(handleNewMessage);
      messageService.offTyping(handleTyping);
    };
  }, [isOpen, conversationId, user?.id, recipientId]);

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus sur l'input quand le chat s'ouvre
  useEffect(() => {
    if (isOpen && !isLoading) {
      inputRef.current?.focus();
    }
  }, [isOpen, isLoading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    try {
      // Envoyer via WebSocket (temps réel)
      messageService.sendMessage(conversationId, messageText);
      
      // Le message sera ajouté via l'événement WebSocket
    } catch (error) {
      console.error('Erreur envoi message:', error);
      // Fallback: envoyer via API REST
      try {
        const sent = await messageService.sendMessageREST(conversationId, messageText);
        setMessages(prev => [...prev, sent]);
      } catch (restError) {
        console.error('Erreur envoi REST:', restError);
        setNewMessage(messageText); // Restaurer le message
      }
    } finally {
      setIsSending(false);
    }
  };

  const handleTypingStart = () => {
    if (conversationId) {
      messageService.sendTypingIndicator(conversationId, true);
    }
  };

  const handleTypingStop = () => {
    if (conversationId) {
      messageService.sendTypingIndicator(conversationId, false);
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (d.toDateString() === today.toDateString()) {
      return "Aujourd'hui";
    } else if (d.toDateString() === yesterday.toDateString()) {
      return "Hier";
    } else {
      return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
    }
  };

  // Grouper les messages par date
  const groupedMessages: Record<string, Message[]> = messages.reduce((groups, message) => {
    const date = new Date(message.createdAt).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as Record<string, Message[]>);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative z-10 w-full h-[85vh] sm:h-[600px] sm:max-w-md bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white">
          <button onClick={onClose} className="sm:hidden">
            <Icons.ChevronRight className="rotate-180 text-gray-500" size={24} />
          </button>
          
          <div className="relative">
            {recipientAvatar ? (
              <img 
                src={recipientAvatar} 
                alt={recipientName} 
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center">
                <Icons.User className="text-emerald-600" size={20} />
              </div>
            )}
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          
          <div className="flex-1">
            <h3 className="font-bold text-gray-900">{recipientName}</h3>
            {isTyping && (
              <p className="text-xs text-emerald-600 animate-pulse">En train d'écrire...</p>
            )}
          </div>
          
          <button onClick={onClose} className="hidden sm:block text-gray-400 hover:text-gray-600">
            <Icons.X size={24} />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4">
                <Icons.MessageCircle className="text-emerald-600" size={32} />
              </div>
              <p className="text-gray-500">Commencez la conversation avec {recipientName}</p>
            </div>
          ) : (
            Object.entries(groupedMessages).map(([dateStr, msgs]) => (
              <div key={dateStr}>
                {/* Date separator */}
                <div className="flex items-center justify-center my-4">
                  <span className="bg-white px-3 py-1 rounded-full text-xs text-gray-500 shadow-sm">
                    {formatDate(msgs[0].createdAt)}
                  </span>
                </div>

                {/* Messages du jour */}
                {msgs.map((message, index) => {
                  const isOwn = message.senderId === user?.id;
                  const showAvatar = !isOwn && (index === 0 || msgs[index - 1].senderId !== message.senderId);

                  return (
                    <div
                      key={message.id}
                      className={`flex items-end gap-2 mb-2 ${isOwn ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isOwn && showAvatar && (
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex-shrink-0 overflow-hidden">
                          {recipientAvatar ? (
                            <img src={recipientAvatar} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Icons.User size={12} className="text-gray-500" />
                            </div>
                          )}
                        </div>
                      )}
                      {!isOwn && !showAvatar && <div className="w-6" />}

                      <div
                        className={`max-w-[75%] px-4 py-2 rounded-2xl ${
                          isOwn
                            ? 'bg-emerald-600 text-white rounded-br-md'
                            : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                        }`}
                      >
                        <p className="break-words">{message.content}</p>
                        <p className={`text-xs mt-1 ${isOwn ? 'text-emerald-200' : 'text-gray-400'}`}>
                          {formatTime(message.createdAt)}
                          {isOwn && message.isRead && (
                            <span className="ml-1">✓✓</span>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="p-4 bg-white border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onFocus={handleTypingStart}
                onBlur={handleTypingStop}
                placeholder="Votre message..."
                className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-12"
                disabled={!conversationId || isSending}
              />
            </div>
            
            <button
              type="submit"
              disabled={!newMessage.trim() || !conversationId || isSending}
              className="w-12 h-12 bg-emerald-600 hover:bg-emerald-700 rounded-full flex items-center justify-center text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSending ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <Icons.ChevronRight size={24} />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatWindow;
