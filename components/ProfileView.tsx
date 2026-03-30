import React, { useState, useEffect, useRef } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { rideService } from '../services/rideService';
import { bookingService, GuestBooking } from '../services/bookingService';
import { notificationService } from '../services/notificationService';
import { mapApiRideToRide } from '../utils/mappers';
import { Ride } from '../types';

interface ProfileViewProps {
  onNavigate: (v: string) => void;
  refreshKey?: number;
}

const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate, refreshKey = 0 }) => {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<'bookings' | 'announcements' | 'requests'>('bookings');
  const [myRides, setMyRides] = useState<Ride[]>([]);
  const [myBookings, setMyBookings] = useState<GuestBooking[]>([]);
  const [driverRequests, setDriverRequests] = useState<GuestBooking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevRequestCountRef = useRef(0);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const rides = await rideService.getMyRides();
      setMyRides(rides.map(mapApiRideToRide));

      const bookings = await bookingService.getMyBookings();
      setMyBookings(bookings);

      const requests = await bookingService.getDriverRequests();
      
      // Détecter les nouvelles demandes et notifier le chauffeur
      if (prevRequestCountRef.current > 0 && requests.length > prevRequestCountRef.current) {
        const newCount = requests.length - prevRequestCountRef.current;
        notificationService.showLocalNotification(
          `🚗 ${newCount} nouvelle(s) demande(s) de réservation !`,
          { body: 'Un passager veut rejoindre votre trajet. Consultez vos demandes.', tag: 'new-booking' }
        );
      }
      prevRequestCountRef.current = requests.length;
      setDriverRequests(requests);
    } catch (error) {
      console.error('Erreur chargement données:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Demander la permission pour les notifications navigateur
    notificationService.requestPushPermission();
  }, [refreshKey]);

  // Polling pour détecter de nouvelles réservations toutes les 30s
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const requests = await bookingService.getDriverRequests();
        if (prevRequestCountRef.current > 0 && requests.length > prevRequestCountRef.current) {
          const newCount = requests.length - prevRequestCountRef.current;
          notificationService.showLocalNotification(
            `🚗 ${newCount} nouvelle(s) demande(s) !`,
            { body: 'Un passager veut rejoindre votre trajet.', tag: 'new-booking' }
          );
        }
        prevRequestCountRef.current = requests.length;
        setDriverRequests(requests);
      } catch (e) {
        // Silencieux en cas d'erreur de polling
      }
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleConfirmBooking = async (bookingId: string) => {
    try {
      await bookingService.confirmBooking(bookingId);
      await loadData();
    } catch (error) {
      console.error('Erreur confirmation:', error);
    }
  };

  const handleModifyBooking = async (bookingId: string, currentSeats: number) => {
    const seatsStr = window.prompt('Combien de places souhaitez-vous finalement réserver ?', currentSeats.toString());
    if (!seatsStr) return;
    const newSeats = parseInt(seatsStr, 10);
    if (isNaN(newSeats) || newSeats < 1) {
      alert('Nombre de places invalide.');
      return;
    }
    try {
      await bookingService.updateBooking(bookingId, newSeats);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Impossible de modifier la réservation.');
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!window.confirm('Êtes-vous sûr de vouloir annuler cette réservation ?')) return;
    try {
      await bookingService.cancelBooking(bookingId);
      await loadData();
    } catch (error: any) {
      alert(error.message || 'Impossible d\'annuler la réservation.');
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 mb-8 flex flex-col md:flex-row items-center md:items-start gap-6">
        <div className="relative">
          <img
            src={user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=10b981&color=fff`}
            alt={user.firstName}
            className="w-24 h-24 md:w-32 md:h-32 rounded-full border-4 border-white shadow-md"
          />
          {user.isVerified && (
            <div className="absolute bottom-1 right-1 bg-emerald-500 text-white p-1.5 rounded-full border-2 border-white">
              <Icons.CheckCircle size={16} />
            </div>
          )}
        </div>
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">{user.firstName} {user.lastName}</h1>
          <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-500 mb-4">
            <Icons.Star className="text-yellow-400 fill-yellow-400" size={16} />
            <span className="font-semibold text-gray-900">{user.rating || '4.5'}</span>
            <span>•</span>
            <span>{user.reviewCount || 0} avis</span>
            {user.isVerified && (
              <>
                <span>•</span>
                <span className="text-emerald-600 font-medium">Membre vérifié</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors">
              <Icons.Settings size={16} />
              Paramètres
            </button>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-sm font-medium transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
        <div className="bg-emerald-50 p-4 rounded-xl text-center min-w-[120px]">
          <div className="text-sm text-gray-500 mb-1">Trajets</div>
          <div className="text-2xl font-bold text-emerald-600">{myRides.length}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('bookings')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'bookings' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Réservations ({myBookings.length})
        </button>
        <button
          onClick={() => setActiveTab('announcements')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'announcements' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Mes Trajets ({myRides.length})
        </button>
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 whitespace-nowrap ${activeTab === 'requests' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Demandes reçues ({driverRequests.length})
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        ) : activeTab === 'announcements' ? (
          myRides.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <Icons.Car className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Aucun trajet publié</h3>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore publié de trajet.</p>
              <button onClick={() => onNavigate('publish')} className="text-emerald-600 font-bold hover:underline">
                Publier un trajet
              </button>
            </div>
          ) : (
            myRides.map(ride => (
              <div key={ride.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
                <div>
                  <div className="font-bold text-gray-900 mb-1">
                    {new Date(ride.departureTime).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} à {new Date(ride.departureTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 text-sm">
                    <span>{ride.origin}</span>
                    <Icons.ChevronRight size={14} />
                    <span>{ride.destination}</span>
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1"><Icons.Users size={12} /> {ride.seatsAvailable} places restantes</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="block font-bold text-emerald-600">{ride.price} {ride.currency || 'XOF'}</span>
                </div>
              </div>
            ))
          )
        ) : activeTab === 'requests' ? (
          driverRequests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <Icons.Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Aucune demande</h3>
              <p className="text-gray-500">Vous n'avez pas de demande en attente pour vos trajets.</p>
            </div>
          ) : (
            driverRequests.map(req => (
              <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-gray-900 text-lg">{req.passenger.name}</div>
                    <div className="text-sm text-gray-500 flex items-center gap-2">
                      <Icons.Phone size={14} /> {req.passenger.phone}
                    </div>
                    <div className="text-sm text-emerald-600 mt-1 font-medium">
                      Souhaite réserver {req.seats} place(s)
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div>{req.ride.origin} → {req.ride.destination}</div>
                    <div>{new Date(req.ride.departureTime).toLocaleDateString('fr-FR')}</div>
                  </div>
                </div>
                {req.notes && (
                  <div className="bg-gray-50 p-3 rounded-lg text-sm text-gray-600 mb-4 italic">
                    "{req.notes}"
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => handleConfirmBooking(req.id)}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Icons.CheckCircle size={18} />
                    Accepter
                  </button>
                  <a
                    href={`tel:${req.passenger.phone}`}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
                  >
                    <Icons.Phone size={18} />
                  </a>
                </div>
              </div>
            ))
          )
        ) : (
          myBookings.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-200">
              <Icons.Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">Aucune réservation</h3>
              <p className="text-gray-500 mb-6">Vous n'avez pas encore réservé de trajet.</p>
              <button onClick={() => onNavigate('search')} className="text-emerald-600 font-bold hover:underline">
                Rechercher un trajet
              </button>
            </div>
          ) : (
            myBookings.map(booking => (
              <div key={booking.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${booking.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' :
                          booking.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {booking.status === 'confirmed' ? 'Confirmé' : booking.status === 'cancelled' ? 'Annulé' : 'En attente'}
                      </span>
                      <span className="text-gray-400 text-xs">#{booking.id.slice(-6).toUpperCase()}</span>
                    </div>
                    <div className="font-bold text-gray-900 text-lg">
                      {booking.ride.origin} → {booking.ride.destination}
                    </div>
                    <div className="text-sm text-gray-600">
                      {new Date(booking.ride.departureTime).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-emerald-600">{booking.seats} place(s)</div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                        <Icons.User size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{booking.ride.driver.name}</div>
                        <div className="text-xs text-gray-500">Conducteur</div>
                      </div>
                    </div>

                    {booking.status === 'confirmed' && booking.ride.driver.phone && (
                      <div className="flex gap-2">
                        <a
                          href={`tel:${booking.ride.driver.phone}`}
                          className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors"
                          title="Appeler"
                        >
                          <Icons.Phone size={20} />
                        </a>
                        <a
                          href={`https://wa.me/${booking.ride.driver.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 bg-[#25D366]/10 text-[#25D366] rounded-lg hover:bg-[#25D366]/20 transition-colors"
                          title="WhatsApp"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                          </svg>
                        </a>
                      </div>
                    )}
                  </div>

                  {booking.status === 'pending' && (
                    <div className="mt-3 bg-yellow-50 text-yellow-800 text-sm p-3 rounded-lg">
                      En attente de validation par le conducteur. Vous recevrez une notification dès qu'il accepte.
                    </div>
                  )}

                  {/* Boutons d'action pour Modifier et Annuler */}
                  {booking.status !== 'cancelled' && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleModifyBooking(booking.id, booking.seats)}
                        className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors border border-gray-200"
                      >
                        Modifier places
                      </button>
                      <button
                        onClick={() => handleCancelBooking(booking.id)}
                        className="flex-1 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium rounded-lg transition-colors border border-red-100"
                      >
                        Annuler trajet
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};

export default ProfileView;
