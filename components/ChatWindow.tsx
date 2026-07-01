import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { messageService, Message } from '../services/messageService';
import { Icons } from './Icons';
import { ApiClient } from '../services/apiClient';
import LiveMap from './LiveMap';
import { trackingService } from '../services/trackingService';
import { Coordinates } from '../types';

interface ChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string;
  rideId?: string;
  initialMessage?: string;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  isOpen,
  onClose,
  recipientId,
  recipientName,
  recipientAvatar,
  rideId,
  initialMessage
}) => {
  const { user } = useAuth();
  const currentUserId = user?.id || (() => {
    try {
      const raw = JSON.parse(localStorage.getItem('sunu_yoon_user') || 'null');
      return raw?.id || 'me';
    } catch { return 'me'; }
  })();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isEphemeralMode, setIsEphemeralMode] = useState(false);
  const [activeEphemeralMedia, setActiveEphemeralMedia] = useState<{ type: 'image' | 'video' | 'audio'; url: string; messageId: string } | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [rideData, setRideData] = useState<any | null>(null);
  const [showTrackingMap, setShowTrackingMap] = useState(false);
  const [isSharingLocation, setIsSharingLocation] = useState(false);
  const [myCoords, setMyCoords] = useState<Coordinates | null>(null);
  const [otherCoords, setOtherCoords] = useState<Coordinates | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const initialMessageSentRef = useRef(false);
  
  // Media States & Refs
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Data = reader.result as string;
          if (conversationId) {
            setIsSending(true);
            const isEphemeral = isEphemeralMode;
            setIsEphemeralMode(false);

            const mediaContent = JSON.stringify({
              type: 'audio',
              url: base64Data,
              text: isEphemeral ? '🎙️ Note vocale éphémère' : '🎙️ Note vocale',
              viewOnce: isEphemeral ? true : undefined,
              isOpened: isEphemeral ? false : undefined
            });

            // Instant local render
            const localMsg: Message = {
              id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              conversationId,
              senderId: currentUserId || 'me',
              receiverId: recipientId,
              content: mediaContent,
              isRead: false,
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, localMsg]);

            try {
              const sentViaSocket = messageService.sendMessage(conversationId, mediaContent);
              if (!sentViaSocket) {
                await messageService.sendMessageREST(conversationId, mediaContent);
              }
            } catch (err) {
              console.error('Erreur envoi audio:', err);
            } finally {
              setIsSending(false);
            }
          }
        };
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      recordingTimerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Erreur acces microphone:', err);
      alert('Impossible d\'accéder au microphone');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onloadend = async () => {
      const base64Data = reader.result as string;
      const fileType = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : null;

      if (!fileType) {
        alert('Type de fichier non supporté (images et vidéos uniquement)');
        return;
      }

      if (conversationId) {
        setIsSending(true);
        const isEphemeral = isEphemeralMode;
        setIsEphemeralMode(false);

        try {
          const mediaContent = JSON.stringify({
            type: fileType,
            url: base64Data,
            text: fileType === 'image' 
              ? (isEphemeral ? '📷 Image éphémère' : '📷 Image') 
              : (isEphemeral ? '🎥 Vidéo éphémère' : '🎥 Vidéo'),
            viewOnce: isEphemeral ? true : undefined,
            isOpened: isEphemeral ? false : undefined
          });

          // Instant local render
          const localMsg: Message = {
            id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
            conversationId,
            senderId: currentUserId || 'me',
            receiverId: recipientId,
            content: mediaContent,
            isRead: false,
            createdAt: new Date().toISOString(),
          };
          setMessages(prev => [...prev, localMsg]);

          const sentViaSocket = messageService.sendMessage(conversationId, mediaContent);
          if (!sentViaSocket) {
            await messageService.sendMessageREST(conversationId, mediaContent);
          }
        } catch (error) {
          console.error(error);
        } finally {
          setIsSending(false);
        }
      }
    };
    e.target.value = '';
  };

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}:${remainSecs < 10 ? '0' : ''}${remainSecs}`;
  };

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  // Charger ou créer la conversation
  useEffect(() => {
    if (!isOpen) return;
    
    // Récupérer l'utilisateur depuis localStorage si pas encore chargé via context
    const currentUser = user || (() => {
      try {
        const raw = JSON.parse(localStorage.getItem('sunu_yoon_user') || 'null');
        return raw;
      } catch { return null; }
    })();
    
    if (!currentUser) return;

    const initChat = async () => {
      setIsLoading(true);
      try {
        // Charger le profil du destinataire pour obtenir son numéro de téléphone
        if (recipientId && recipientId !== currentUser.id) {
          ApiClient.get<any>(`/users/${recipientId}`).then(res => {
            if (res.success && res.data?.user) {
              setProfileData(res.data.user);
            }
          }).catch(err => console.error("Erreur chargement profil destinataire:", err));
        }

        // Charger l'annonce s'il y a un trajet lié
        if (rideId) {
          ApiClient.get<any>(`/rides/${rideId}`).then(res => {
            if (res.success && res.data?.ride) {
              setRideData(res.data.ride);
            }
          }).catch(err => console.error("Erreur chargement annonce trajet:", err));
        }

        // Chercher une conversation existante ou en créer une
        const conversations = await messageService.getConversations();
        const existing = conversations.find(c => 
          c.participants.some(p => p.id === recipientId)
          && (!rideId || c.ride?.id === rideId || !c.ride)
        );

        if (existing) {
          setConversationId(existing.id);
          const msgs = await messageService.getMessages(existing.id);
          setMessages(msgs);
          messageService.markAsRead(existing.id);
        } else if (rideId) {
          // Créer une nouvelle conversation
          const newConv = await messageService.createConversation(recipientId, rideId, {
            recipientName: recipientName,
            recipientAvatar: recipientAvatar,
            ride: {
              id: rideId,
              origin: 'Trajet',
              destination: 'Trajet',
              departureTime: new Date().toISOString()
            }
          });
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
  }, [isOpen, user, recipientId, recipientName, recipientAvatar, rideId]);

  // Ouvrir automatiquement le tracking GPS si demandé
  useEffect(() => {
    if (isOpen && rideId && localStorage.getItem('auto_open_tracking') === 'true') {
      setShowTrackingMap(true);
      localStorage.removeItem('auto_open_tracking');
    }
  }, [isOpen, rideId]);

  // Auto-envoyer le message initial (réservation) une seule fois
  useEffect(() => {
    if (!conversationId || !initialMessage || initialMessageSentRef.current || isLoading) return;
    
    initialMessageSentRef.current = true;
    
    const sendAutoMessage = async () => {
      try {
        const sentViaSocket = messageService.sendMessage(conversationId, initialMessage);
        if (!sentViaSocket) {
          const sent = await messageService.sendMessageREST(conversationId, initialMessage);
          setMessages(prev => [...prev, sent]);
        }
      } catch (err) {
        console.error('Erreur envoi message auto:', err);
        // Ajouter le message en local même si l'envoi échoue
        const localMsg: Message = {
          id: `local_${Date.now()}`,
          conversationId,
          senderId: currentUserId || 'me',
          receiverId: recipientId,
          content: initialMessage,
          isRead: false,
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, localMsg]);
      }
    };
    
    sendAutoMessage();
  }, [conversationId, initialMessage, isLoading]);

  // Initialiser WebSocket
  useEffect(() => {
    if (!isOpen || !conversationId) return;

    // Se connecter au WebSocket
    messageService.connect();
    messageService.joinConversation(conversationId);

    // Écouter les nouveaux messages
    const handleNewMessage = (message: Message) => {
      if (message.conversationId === conversationId) {
        setMessages(prev => {
          // Si le message a déjà été ajouté en local (même contenu de texte par nous)
          const isDup = prev.some(m => 
            m.id === message.id || 
            (m.senderId === message.senderId && m.content === message.content && m.id.startsWith('local_'))
          );
          
          if (isDup) {
            return prev.map(m => {
              if (m.id === message.id || (m.senderId === message.senderId && m.content === message.content && m.id.startsWith('local_'))) {
                return message;
              }
              return m;
            });
          }
          return [...prev, message];
        });

        // Marquer comme lu si c'est un message reçu
        if (message.senderId !== currentUserId) {
          messageService.markAsRead(conversationId);
        }
      }
    };

    // Écouter les mises à jour de message (ex: message éphémère ouvert)
    const handleMessageUpdated = (updatedMsg: Message) => {
      if (updatedMsg.conversationId === conversationId) {
        setMessages(prev => prev.map(m => m.id === updatedMsg.id ? updatedMsg : m));
      }
    };

    // Écouter les accusés de lecture
    const handleMessagesRead = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        setMessages(prev => prev.map(m => m.senderId === currentUserId ? { ...m, isRead: true } : m));
      }
    };

    // Écouter le statut "en train d'écrire"
    const handleTyping = (data: { conversationId: string; userId: string; isTyping: boolean }) => {
      if (data.conversationId === conversationId && data.userId === recipientId) {
        setIsTyping(data.isTyping);
      }
    };

    messageService.onNewMessage(handleNewMessage);
    (messageService as any).onMessageUpdated?.(handleMessageUpdated);
    // On s'assure d'écouter les accusés de lecture via socket directement si pas de proxy, mais getSocket().on est très fiable
    const s = messageService.getSocket();
    if (s) {
      s.on('messages_read', handleMessagesRead);
    }
    messageService.onTyping(handleTyping);

    return () => {
      messageService.leaveConversation(conversationId);
      messageService.offNewMessage(handleNewMessage);
      (messageService as any).offMessageUpdated?.(handleMessageUpdated);
      if (s) {
        s.off('messages_read', handleMessagesRead);
      }
      messageService.offTyping(handleTyping);
    };
  }, [isOpen, conversationId, currentUserId, recipientId]);

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

  // Effet pour s'abonner au canal de suivi GPS temps réel du trajet lié
  useEffect(() => {
    if (!rideId || !showTrackingMap) return;

    const unsubscribe = trackingService.subscribeToRide(
      rideId,
      (update) => {
        // Mettre à jour la position de l'autre participant s'il s'agit de ses coordonnées
        if (update.coords && update.senderId !== currentUserId) {
          setOtherCoords(update.coords);
        }
      },
      (err) => {
        console.error("Erreur de connexion au canal GPS:", err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [rideId, showTrackingMap, currentUserId]);

  // Nettoyage du watchPosition à la fermeture/démontage
  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const toggleLocationSharing = () => {
    if (isSharingLocation) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsSharingLocation(false);
      setMyCoords(null);
      // Notifier l'arrêt du tracking
      if (rideId) {
        trackingService.stopDriverTracking(rideId);
      }
      return;
    }

    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsSharingLocation(true);
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const speed = position.coords.speed ?? undefined;
        const heading = position.coords.heading ?? undefined;
        const coords = { lat, lng };
        setMyCoords(coords);

        if (rideId) {
          await trackingService.publishDriverLocation(rideId, {
            coords,
            speed,
            heading,
            senderId: currentUserId
          });
        }
      },
      (error) => {
        console.error("Erreur GPS:", error);
        setIsSharingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleHeaderClick = async () => {
    if (!recipientId || recipientId === currentUserId) return;
    
    setShowProfileModal(true);
    setLoadingProfile(true);
    try {
      const res = await ApiClient.get<any>(`/users/${recipientId}`);
      if (res.success && res.data?.user) {
        setProfileData(res.data.user);
      }
    } catch (err) {
      console.error("Erreur chargement profil public:", err);
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || isSending) return;

    const messageText = newMessage.trim();
    setNewMessage('');
    setIsSending(true);

    // Créer le message local immédiatement pour un affichage instantané
    const localMsg: Message = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      conversationId,
      senderId: currentUserId || 'me',
      receiverId: recipientId,
      content: messageText,
      isRead: false,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, localMsg]);

    try {
      const sentViaSocket = messageService.sendMessage(conversationId, messageText);
      if (!sentViaSocket) {
        await messageService.sendMessageREST(conversationId, messageText);
      }
    } catch (error) {
      console.error('Erreur envoi message:', error);
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
          
          <div 
            onClick={handleHeaderClick}
            className="flex flex-1 items-center gap-3 cursor-pointer hover:bg-gray-50 p-1.5 rounded-xl transition-all"
          >
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
              <h3 className="font-bold text-gray-900 flex items-center gap-1">
                {recipientName}
                {profileData?.isVerified && (
                  <Icons.CheckCircle size={14} className="text-emerald-500 animate-bounce" />
                )}
              </h3>
              {isTyping ? (
                <p className="text-xs text-emerald-600 animate-pulse">En train d'écrire...</p>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 font-medium">
                  {profileData?.phone && (
                    <span className="flex items-center gap-0.5 text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
                      <Icons.Phone size={10} /> {profileData.phone}
                    </span>
                  )}
                  {profileData?.phone && <span>•</span>}
                  <span>Voir le profil →</span>
                </div>
              )}
            </div>
          </div>
          
          <button onClick={onClose} className="hidden sm:block text-gray-400 hover:text-gray-600">
            <Icons.X size={24} />
          </button>
        </div>

        {/* GPS tracking sub-header */}
        {rideId && (
          <>
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-emerald-100/50 px-4 py-2.5 flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-emerald-800 font-semibold">
                <Icons.Navigation size={16} className="text-emerald-600 animate-pulse animate-duration-1000" />
                <span>📍 Suivi GPS Temps Réel</span>
              </div>
              <button
                type="button"
                onClick={() => setShowTrackingMap(!showTrackingMap)}
                className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 rounded-full transition-all flex items-center gap-1 shadow-sm active:scale-95"
              >
                <Icons.Map size={12} />
                <span>{showTrackingMap ? 'Masquer la carte' : 'Afficher la carte'}</span>
              </button>
            </div>

            {showTrackingMap && (
              <div className="border-b border-gray-100 bg-white p-3 space-y-3 animate-fade-in">
                <div className="relative rounded-xl overflow-hidden shadow-inner border border-gray-100">
                  <LiveMap
                    height="220px"
                    userLocation={myCoords}
                    driverLocation={otherCoords ? {
                      rideId,
                      driverId: recipientId,
                      coords: otherCoords,
                      timestamp: new Date()
                    } : null}
                    initialCenter={myCoords || otherCoords || { lat: 14.6928, lng: -17.4467 }}
                  />
                </div>
                
                <div className="flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-1.5 text-gray-500 font-medium">
                    <span className={`w-2 h-2 rounded-full ${isSharingLocation ? 'bg-emerald-500 animate-ping' : 'bg-gray-400'}`} />
                    <span>
                      {isSharingLocation 
                        ? 'Vous partagez votre position' 
                        : 'Partage de position désactivé'
                      }
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={toggleLocationSharing}
                    className={`px-3 py-1.5 font-bold rounded-lg transition-all border ${
                      isSharingLocation 
                        ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' 
                        : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    {isSharingLocation ? 'Arrêter le partage' : 'Partager ma position'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Ride Ad Info Summary Banner */}
        {rideData && (
          <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between gap-4 text-sm shadow-sm animate-fade-in">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium mb-1">
                <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Trajet lié</span>
                <span>•</span>
                <span className="text-gray-700 font-semibold">{rideData.carModel || 'Véhicule'}</span>
              </div>
              <div className="font-bold text-gray-900 truncate">
                {rideData.origin} → {rideData.destination}
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {new Date(rideData.departureTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })} à {new Date(rideData.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="font-extrabold text-emerald-600 text-base">
                {rideData.price.toLocaleString('fr-FR')} XOF
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">
                {rideData.seatsAvailable} pl. restantes
              </div>
            </div>
          </div>
        )}

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
                  const isOwn = message.senderId === currentUserId;
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
                        {message.viewOnce ? (
                          <div className="py-1">
                            {message.isOpened ? (
                              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm select-none ${isOwn ? 'bg-emerald-700 text-emerald-200' : 'bg-gray-100 text-gray-400 border border-gray-200'}`}>
                                <Icons.Lock size={16} />
                                <span>Message éphémère ouvert</span>
                              </div>
                            ) : isOwn ? (
                              <div className="flex items-center gap-2 bg-emerald-700/50 text-emerald-100 px-3 py-2 rounded-lg text-sm border border-emerald-500/30">
                                <Icons.Eye size={16} />
                                <span>Message éphémère (envoyé)</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => setActiveEphemeralMedia({
                                  type: message.mediaType as any,
                                  url: message.mediaUrl!,
                                  messageId: message.id
                                })}
                                className="flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-2 px-3 rounded-lg text-sm shadow-md transition-all active:scale-95"
                              >
                                <Icons.Eye size={16} className="animate-pulse" />
                                <span>Voir le message éphémère</span>
                              </button>
                            )}
                          </div>
                        ) : (
                          <>
                            {message.mediaType === 'audio' && (
                              <div className="py-2">
                                <audio src={message.mediaUrl} controls className="max-w-full rounded" />
                              </div>
                            )}
                            {message.mediaType === 'image' && (
                              <div className="py-2">
                                <img src={message.mediaUrl} alt="Image" className="max-w-full max-h-48 rounded object-cover cursor-pointer hover:opacity-90" onClick={() => window.open(message.mediaUrl)} />
                              </div>
                            )}
                            {message.mediaType === 'video' && (
                              <div className="py-2">
                                <video src={message.mediaUrl} controls className="max-w-full max-h-48 rounded" />
                              </div>
                            )}
                            {(!message.mediaType || message.mediaType === 'text') && (
                              <p className="break-words">{message.content}</p>
                            )}
                          </>
                        )}
                        <p className={`text-xs mt-1 ${isOwn ? 'text-emerald-200' : 'text-gray-400'} flex items-center justify-end gap-1`}>
                          <span>{formatTime(message.createdAt)}</span>
                          {isOwn && (
                            <span className="flex items-center">
                              {message.isRead ? (
                                <span style={{ color: '#4ade80' }} className="font-bold">✓✓</span>
                              ) : message.isReceived ? (
                                <span className="text-emerald-200 font-bold">✓✓</span>
                              ) : (
                                <span className="text-emerald-300 font-bold">✓</span>
                              )}
                            </span>
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
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,video/*"
            className="hidden"
          />
          <div className="flex items-center gap-2">
            {isRecording ? (
              <div className="flex-1 flex items-center justify-between bg-red-50 text-red-600 px-4 py-3 rounded-full animate-pulse">
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                  Enregistrement... {formatDuration(recordingTime)}
                </span>
                <button
                  type="button"
                  onClick={stopRecording}
                  className="text-xs bg-red-600 text-white font-bold px-3 py-1.5 rounded-full hover:bg-red-700 transition-colors"
                >
                  Arrêter & Envoyer
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleAttachmentClick}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors"
                  disabled={!conversationId || isSending}
                >
                  <Icons.Paperclip size={20} />
                </button>

                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onFocus={handleTypingStart}
                    onBlur={handleTypingStop}
                    placeholder="Votre message..."
                    className="w-full px-4 py-3 bg-gray-100 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    disabled={!conversationId || isSending}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsEphemeralMode(!isEphemeralMode)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    isEphemeralMode 
                      ? 'bg-amber-500 text-white shadow-md active:scale-95' 
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                  disabled={!conversationId || isSending}
                  title="Message éphémère (vue unique)"
                >
                  <Icons.Eye size={20} className={isEphemeralMode ? 'animate-pulse' : ''} />
                </button>

                <button
                  type="button"
                  onClick={startRecording}
                  className="w-12 h-12 bg-gray-100 hover:bg-gray-200 rounded-full flex items-center justify-center text-gray-500 transition-colors"
                  disabled={!conversationId || isSending}
                >
                  <Icons.Mic size={20} />
                </button>
              </>
            )}
            
            <button
              type="submit"
              disabled={!newMessage.trim() || !conversationId || isSending || isRecording}
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

      {/* Ephemeral Media Viewer Modal */}
      {activeEphemeralMedia && (
        <div className="fixed inset-0 z-[80] bg-black/95 flex flex-col items-center justify-center p-4 animate-fade-in">
          <div className="absolute top-4 right-4 z-10 flex gap-4">
            <button
              onClick={() => {
                // Notifier le serveur et le local que le message a été ouvert
                (messageService as any).openEphemeralMessage?.(activeEphemeralMedia.messageId);
                // Mettre à jour localement immédiatement
                setMessages(prev => prev.map(m => m.id === activeEphemeralMedia.messageId ? { ...m, isOpened: true } : m));
                setActiveEphemeralMedia(null);
              }}
              className="w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <Icons.X size={24} />
            </button>
          </div>

          <div className="max-w-full max-h-[80vh] flex items-center justify-center">
            {activeEphemeralMedia.type === 'image' && (
              <img 
                src={activeEphemeralMedia.url} 
                alt="Ephemeral" 
                className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-2xl select-none pointer-events-none" 
              />
            )}
            {activeEphemeralMedia.type === 'video' && (
              <video 
                src={activeEphemeralMedia.url} 
                controls 
                autoPlay
                className="max-w-full max-h-[75vh] rounded-lg shadow-2xl" 
                onEnded={() => {
                  (messageService as any).openEphemeralMessage?.(activeEphemeralMedia.messageId);
                  setMessages(prev => prev.map(m => m.id === activeEphemeralMedia.messageId ? { ...m, isOpened: true } : m));
                  setActiveEphemeralMedia(null);
                }}
              />
            )}
            {activeEphemeralMedia.type === 'audio' && (
              <div className="bg-white/10 p-8 rounded-2xl flex flex-col items-center gap-4 text-white text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-full flex items-center justify-center animate-pulse">
                  <Icons.Mic size={32} />
                </div>
                <p className="font-semibold text-lg">Note vocale à écoute unique</p>
                <audio 
                  src={activeEphemeralMedia.url} 
                  controls 
                  autoPlay 
                  onEnded={() => {
                    (messageService as any).openEphemeralMessage?.(activeEphemeralMedia.messageId);
                    setMessages(prev => prev.map(m => m.id === activeEphemeralMedia.messageId ? { ...m, isOpened: true } : m));
                    setActiveEphemeralMedia(null);
                  }}
                  className="mt-2"
                />
              </div>
            )}
          </div>
          
          <div className="mt-8 text-white/60 text-sm flex items-center gap-2">
            <Icons.Lock size={14} />
            <span>Ce message éphémère s'autodétruira dès que vous le fermerez ou que la lecture se terminera.</span>
          </div>
        </div>
      )}

      {/* Driver Profile & Reviews Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[90] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Profil du conducteur</h3>
              <button 
                onClick={() => {
                  setShowProfileModal(false);
                  setProfileData(null);
                }}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center transition-colors"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {loadingProfile ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3">
                  <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm text-gray-500">Chargement du profil...</span>
                </div>
              ) : profileData ? (
                <>
                  {/* Driver Header Card */}
                  <div className="flex flex-col items-center text-center space-y-3">
                    <div className="relative">
                      {profileData.avatarUrl ? (
                        <img 
                          src={profileData.avatarUrl} 
                          alt={profileData.name} 
                          className="w-20 h-20 rounded-full object-cover border-4 border-emerald-500 shadow-md"
                        />
                      ) : (
                        <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center border-4 border-emerald-500 shadow-md">
                          <Icons.User className="text-emerald-600" size={40} />
                        </div>
                      )}
                      {profileData.isVerified && (
                        <span className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center text-white shadow-sm" title="Profil vérifié">
                          <Icons.Check size={12} className="stroke-[3]" />
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="font-extrabold text-gray-900 text-xl">{profileData.name}</h4>
                      <p className="text-xs text-gray-500 mt-1">
                        Membre depuis {new Date(profileData.createdAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </p>
                    </div>

                    {/* Stats Row */}
                    <div className="flex justify-center items-center gap-6 w-full py-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="text-center">
                        <div className="font-extrabold text-gray-900 text-lg flex items-center justify-center gap-1">
                          <Icons.Star className="text-amber-500 fill-amber-500" size={18} />
                          <span>{profileData.rating ? profileData.rating.toFixed(1) : '4.8'}</span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Note globale</div>
                      </div>
                      <div className="w-px h-8 bg-gray-200" />
                      <div className="text-center">
                        <div className="font-extrabold text-gray-900 text-lg">
                          {profileData.completedRides || '0'}
                        </div>
                        <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Trajets publiés</div>
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Info */}
                  {profileData.carModel && (
                    <div className="space-y-2">
                      <h5 className="font-bold text-gray-900 text-sm">Véhicule</h5>
                      <div className="flex items-center gap-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-50 text-emerald-900">
                        <Icons.Car size={20} className="text-emerald-600" />
                        <div>
                          <div className="text-sm font-semibold">{profileData.carModel}</div>
                          <div className="text-xs text-emerald-700/80">Véhicule de confiance</div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reviews Section */}
                  <div className="space-y-3">
                    <h5 className="font-bold text-gray-900 text-sm flex items-center justify-between">
                      <span>Derniers avis reçus</span>
                      <span className="text-xs font-semibold text-gray-500">
                        ({profileData.reviewCount || 0} avis)
                      </span>
                    </h5>

                    <div className="space-y-3">
                      {!profileData.reviewsReceived || profileData.reviewsReceived.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-xl text-xs text-gray-500 border border-dashed border-gray-200">
                          Aucun avis rédigé pour le moment.
                        </div>
                      ) : (
                        profileData.reviewsReceived.map((review: any) => (
                          <div key={review.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 space-y-2">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                {review.author?.avatarUrl ? (
                                  <img 
                                    src={review.author.avatarUrl} 
                                    alt="" 
                                    className="w-6 h-6 rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center">
                                    <Icons.User size={12} className="text-gray-500" />
                                  </div>
                                )}
                                <span className="font-bold text-xs text-gray-900">{review.author?.name}</span>
                              </div>
                              <div className="flex items-center gap-0.5 text-amber-500">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Icons.Star 
                                    key={i} 
                                    size={10} 
                                    className={i < review.rating ? 'fill-amber-500' : 'text-gray-200'} 
                                  />
                                ))}
                              </div>
                            </div>
                            {review.comment && (
                              <p className="text-xs text-gray-600 leading-relaxed italic">
                                "{review.comment}"
                              </p>
                            )}
                            <div className="text-[10px] text-gray-400 text-right">
                              {new Date(review.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  Impossible de charger les données du conducteur.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
