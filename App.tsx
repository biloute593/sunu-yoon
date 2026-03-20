import React, { useState, useEffect, useCallback } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import CookieBanner from './components/CookieBanner';
import AuthModal from './components/AuthModal';
import BookingModal from './components/BookingModal';
import PassengerRequestForm from './components/PassengerRequestForm';
import RideRequestsList from './components/RideRequestsList';
import FAQSection from './components/FAQ';
import { Icons } from './components/Icons';
import LiveTrackingPanel from './components/LiveTrackingPanel';
import RideRequest from './components/RideRequest';
import DriverDashboard from './components/DriverDashboard';
import SearchForm, { SearchParams } from './components/SearchForm';
import RideCard from './components/RideCard';
import RideDetails from './components/RideDetails';
import PublishForm from './components/PublishForm';
import ProfileView from './components/ProfileView';
import { rideService, Ride as ApiRide } from './services/rideService';
import { locationService } from './services/locationService';
import { LocationState, FrontendRide } from './types';
import { mapApiRideToFrontend } from './utils/mapRide';

function AppContent() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  const [currentView, setCurrentView] = useState('home');
  const [searchResults, setSearchResults] = useState<FrontendRide[]>([]);
  const [selectedRide, setSelectedRide] = useState<FrontendRide | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams, setSearchParams] = useState<SearchParams | null>(null);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const [recentRides, setRecentRides] = useState<FrontendRide[]>([]);
  const [homeRefreshKey, setHomeRefreshKey] = useState(0);
  const [showPassengerRequestForm, setShowPassengerRequestForm] = useState(false);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentView]);

  // Load recent rides for homepage
  useEffect(() => {
    if (currentView === 'home') {
      const loadRecentRides = async () => {
        try {
          console.log('Chargement des trajets récents...');
          // Utiliser la nouvelle méthode getRecentRides
          const rides = await rideService.getRecentRides(6);
          console.log(`${rides.length} trajet(s) chargé(s)`);
          setRecentRides(rides.slice(0, 6).map(mapApiRideToFrontend));
        } catch (error) {
          console.error('Error loading recent rides:', error);
        }
      };
      loadRecentRides();
    }
  }, [currentView, homeRefreshKey]);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Transport à la demande (mode Uber)
  const [showRequestRide, setShowRequestRide] = useState(false);
  const [showDriverMode, setShowDriverMode] = useState(false);
  const [isDriverAvailable, setIsDriverAvailable] = useState(false);

  // Geolocation State
  const [userLocation, setUserLocation] = useState<LocationState>({
    coords: null,
    address: '',
    loading: false,
    error: null
  });

  // Géolocalisation automatique au chargement (silencieuse)
  useEffect(() => {
    const initLocation = async () => {
      try {
        const result = await locationService.getCurrentPositionFast({
          onStatusChange: (status) => {
            if (status === 'searching') {
              setUserLocation(prev => ({ ...prev, loading: true }));
            }
          }
        });

        setUserLocation({
          coords: result.coords,
          address: result.address || 'Ma position',
          loading: false,
          error: null
        });
      } catch (error) {
        // Silencieux en cas d'échec initial
        console.log('Géolocalisation initiale:', error);
      }
    };

    // Lancer la géolocalisation après un court délai
    const timer = setTimeout(initLocation, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleGeolocate = useCallback(async () => {
    setUserLocation(prev => ({ ...prev, loading: true, error: null }));

    try {
      const result = await locationService.getCurrentPositionFast({
        onStatusChange: (status) => {
          if (status === 'error') {
            setUserLocation(prev => ({ ...prev, loading: false }));
          }
        },
        onLocationUpdate: (update) => {
          // Mise à jour silencieuse de la précision
          setUserLocation(prev => ({
            ...prev,
            coords: update.coords
          }));
        }
      });

      setUserLocation({
        coords: result.coords,
        address: result.address || 'Ma position',
        loading: false,
        error: null
      });
    } catch (error: any) {
      setUserLocation(prev => ({
        ...prev,
        loading: false,
        error: error.message || "Erreur de localisation"
      }));
    }
  }, []);

  const handleSearch = async (params: SearchParams) => {
    setIsLoading(true);
    setSearchParams(params);

    try {
      const rides = await rideService.searchRides({
        origin: params.origin,
        destination: params.destination,
        date: params.date,
        seats: params.passengers
      });

      setSearchResults(rides.map(mapApiRideToFrontend));
      setCurrentView('search');
    } catch (error) {
      console.error('Erreur recherche:', error);
      setSearchResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRideClick = (ride: FrontendRide) => {
    setSelectedRide(ride);
    setCurrentView('ride-details');
  };

  const initiateBooking = () => {
    setShowBookingModal(true);
  };

  const handlePublishRide = async (createdRide: ApiRide) => {
    console.log('Trajet publié, mise à jour de l\'accueil...');

    // Leboncoin-like: retour accueil après publication
    setCurrentView('home');

    // Optimiste: injecter le trajet immédiatement
    try {
      const mapped = mapApiRideToFrontend(createdRide);
      setRecentRides(prev => [mapped, ...prev.filter(r => r.id !== mapped.id)].slice(0, 6));
    } catch (e) {
      console.warn('Insertion optimiste échouée (fallback refresh):', e);
    }

    // Refresh: recharger depuis l'endpoint /recent (sans params obligatoires)
    try {
      setHomeRefreshKey(prev => prev + 1);
      const rides = await rideService.getRecentRides(6);
      setRecentRides(rides.map(mapApiRideToFrontend));
    } catch (e) {
      console.error('Erreur rechargement trajets récents:', e);
    }

    // Garder le profil à jour si connecté (sans changer de vue)
    if (isAuthenticated) {
      setProfileRefreshKey(prev => prev + 1);
    }
  };

  const handleBookingSuccess = (bookingId: string) => {
    console.log('Réservation réussie:', bookingId);
    setShowBookingModal(false);
    setCurrentView('home');
  };

  const renderContent = () => {
    switch (currentView) {
      case 'home': {
        return (
          <>
            <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white py-20 px-4 md:py-32 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-yellow-400/20 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
              <div className="absolute top-1/2 left-1/4 w-32 h-32 bg-white/5 rounded-full blur-2xl animate-pulse"></div>

              <div className="max-w-6xl mx-auto relative z-10 text-center">
                <h1 className="text-4xl md:text-6xl font-extrabold mb-6 tracking-tight leading-tight">
                  Votre voyage commence<br className="hidden md:block" /> <span className="text-yellow-300">ici.</span>
                </h1>
                <p className="text-xl md:text-2xl text-emerald-100 mb-8 max-w-2xl mx-auto">Trouvez ou proposez un trajet en quelques secondes.</p>

                {/* Quick action buttons */}
                <div className="flex flex-wrap justify-center gap-4 mb-8">
                  <button
                    onClick={() => setShowRequestRide(true)}
                    className="flex items-center gap-2 bg-yellow-400 text-gray-900 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200"
                  >
                    <Icons.Navigation size={20} />
                    🚖 Course maintenant
                  </button>
                  <button
                    onClick={() => setCurrentView('publish')}
                    className="flex items-center gap-2 bg-white text-emerald-600 px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200"
                  >
                    <Icons.PlusCircle size={20} />
                    Proposer un trajet
                  </button>
                  <button
                    onClick={() => setShowPassengerRequestForm(true)}
                    className="flex items-center gap-2 bg-blue-500 text-white px-6 py-3 rounded-full font-bold shadow-lg hover:shadow-2xl transform hover:scale-110 active:scale-95 transition-all duration-200"
                  >
                    <Icons.Search size={20} />
                    Je cherche un trajet
                  </button>
                </div>

              </div>
            </div>



            <div className="px-4 pb-20">
              <div className="max-w-6xl mx-auto mt-8 mb-6 flex flex-col md:flex-row md:items-center gap-4">
                <button
                  onClick={() => setCurrentView('publish')}
                  className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Icons.PlusCircle size={18} />
                  Publier un trajet
                </button>
                <button
                  onClick={() => setCurrentView('ride-requests')}
                  className="w-full md:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 text-white font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Icons.Search size={18} />
                  Demandes de trajets
                </button>
              </div>

              <div className="mb-12">
                <SearchForm
                  onSearch={handleSearch}
                  isLoading={isLoading}
                  onLocate={handleGeolocate}
                  userLocation={userLocation}
                />
              </div>

              {/* Recent Rides Section */}
              {recentRides.length > 0 && (
                <div className="max-w-6xl mx-auto mb-16">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Trajets récents</h2>
                    <button
                      onClick={() => setCurrentView('search')}
                      className="text-emerald-600 font-semibold hover:text-emerald-700 flex items-center gap-1"
                    >
                      Voir tout <Icons.ChevronRight size={16} />
                    </button>
                  </div>
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {recentRides.map(ride => (
                      <RideCard
                        key={ride.id}
                        ride={ride}
                        onClick={() => handleRideClick(ride)}
                        onBook={() => {
                          setSelectedRide(ride);
                          setShowBookingModal(true);
                        }}
                        onContact={() => {
                          setSelectedRide(ride);
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="max-w-6xl mx-auto">
                <LiveTrackingPanel userLocation={userLocation.coords} />
              </div>

              {/* Comment ça marche */}
              <div className="max-w-6xl mx-auto mt-20">
                <div className="text-center mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Comment ça marche ?</h2>
                  <p className="text-gray-600 max-w-xl mx-auto">En 3 étapes simples, trouvez ou proposez un trajet</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="text-center relative">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                      1
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Recherchez</h3>
                    <p className="text-gray-600 text-sm">Indiquez votre départ, destination et date. Trouvez les trajets disponibles.</p>
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-emerald-200"></div>
                  </div>
                  <div className="text-center relative">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                      2
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Réservez</h3>
                    <p className="text-gray-600 text-sm">Choisissez votre trajet, réservez vos places et payez en ligne ou en espèces.</p>
                    <div className="hidden md:block absolute top-8 left-[60%] w-[80%] h-0.5 bg-emerald-200"></div>
                  </div>
                  <div className="text-center">
                    <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-sm">
                      3
                    </div>
                    <h3 className="text-lg font-bold mb-2 text-gray-900">Voyagez</h3>
                    <p className="text-gray-600 text-sm">Retrouvez votre conducteur au point de rendez-vous et profitez du trajet !</p>
                  </div>
                </div>
              </div>

              <div className="max-w-6xl mx-auto mt-20">
                <h2 className="text-2xl font-bold text-gray-900 mb-8">Pourquoi utiliser Sunu Yoon ?</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
                      <Icons.Shield size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Confiance et Sécurité</h3>
                    <p className="text-gray-600">Tous nos membres sont vérifiés. Consultez les avis avant de voyager.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-4">
                      <Icons.Car size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Trajets partout</h3>
                    <p className="text-gray-600">De Dakar à Ziguinchor, trouvez un trajet même à la dernière minute.</p>
                  </div>
                  <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all">
                    <div className="w-12 h-12 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-4">
                      <Icons.Star size={24} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">Prix bas</h3>
                    <p className="text-gray-600">Voyagez moins cher qu'en bus ou taxi '7 places'.</p>
                  </div>
                </div>
              </div>

              {/* Témoignages */}




              {/* CTA Final */}
              <div className="max-w-6xl mx-auto mt-20">
                <div className="bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 rounded-3xl p-8 md:p-12 text-center relative overflow-hidden">
                  <div className="absolute inset-0 opacity-10">
                    <div className="absolute top-0 left-0 w-40 h-40 bg-white rounded-full -translate-x-1/2 -translate-y-1/2"></div>
                    <div className="absolute bottom-0 right-0 w-60 h-60 bg-white rounded-full translate-x-1/3 translate-y-1/3"></div>
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                      Prêt à voyager ? 🚗
                    </h2>
                    <p className="text-emerald-100 mb-8 max-w-xl mx-auto">
                      Rejoignez des milliers de Sénégalais qui voyagent malin. Publiez votre trajet ou trouvez un conducteur en quelques clics.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button
                        onClick={() => setCurrentView('publish')}
                        className="px-8 py-4 bg-white text-emerald-600 font-bold rounded-xl shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center gap-2"
                      >
                        <Icons.PlusCircle size={20} />
                        Proposer un trajet
                      </button>
                      <button
                        onClick={() => setCurrentView('search')}
                        className="px-8 py-4 bg-emerald-700/50 backdrop-blur-sm text-white font-bold rounded-xl border-2 border-white/20 hover:bg-emerald-700/70 transition-all flex items-center justify-center gap-2"
                      >
                        <Icons.Search size={20} />
                        Rechercher un trajet
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="max-w-6xl mx-auto mt-20 px-4">
                <FAQSection />
              </div>

              {/* Stats rapides */}
              <div className="max-w-6xl mx-auto mt-32 mb-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">🇸🇳</div>
                    <div className="text-sm text-gray-500 mt-1">100% Sénégalais</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-600">50K+</div>
                    <div className="text-sm text-gray-500 mt-1">Trajets réalisés</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-emerald-600">15K+</div>
                    <div className="text-sm text-gray-500 mt-1">Membres actifs</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-yellow-500">⭐ 4.8</div>
                    <div className="text-sm text-gray-500 mt-1">Note moyenne</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        );
      }

      case 'search':
        return (
          <div className="max-w-4xl mx-auto px-4 py-8">
            <SearchForm
              onSearch={handleSearch}
              isLoading={isLoading}
              initialValues={searchParams || undefined}
              onLocate={handleGeolocate}
              userLocation={userLocation}
            />

            <div className="mt-32 mb-12">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-gray-900">
                  {isLoading ? 'Recherche en cours...' : `${searchResults.length} trajet${searchResults.length > 1 ? 's' : ''} disponible${searchResults.length > 1 ? 's' : ''}`}
                </h2>
                {searchResults.length > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500">Trier par:</span>
                    <select className="text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-500">
                      <option value="departure">Heure de départ</option>
                      <option value="price">Prix croissant</option>
                      <option value="rating">Meilleures notes</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Quick filters */}
              {searchResults.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  <button className="px-3 py-1.5 text-sm font-medium bg-emerald-100 text-emerald-700 rounded-full hover:bg-emerald-200 transition-colors">
                    Tous
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    ❄️ Climatisation
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    🧳 Bagages
                  </button>
                  <button className="px-3 py-1.5 text-sm font-medium bg-white text-gray-600 border border-gray-200 rounded-full hover:border-emerald-300 hover:text-emerald-600 transition-colors">
                    ⭐ 4+ étoiles
                  </button>
                </div>
              )}

              {isLoading ? (
                <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(i => (
                    <div key={i} className="min-h-[320px] bg-white rounded-2xl border border-gray-100 p-7 animate-pulse flex flex-col shadow-sm">
                      <div className="flex justify-between mb-6">
                        <div className="space-y-4 flex-1">
                          <div className="h-5 bg-gray-200 rounded w-2/5"></div>
                          <div className="h-4 bg-gray-100 rounded w-3/5"></div>
                        </div>
                        <div className="h-8 bg-gray-200 rounded-lg w-24"></div>
                      </div>
                      <div className="flex items-center gap-4 mt-auto pt-6 border-t border-gray-100">
                        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                        <div className="space-y-2 flex-1">
                          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-8 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3">
                  {searchResults.map(ride => (
                    <RideCard
                      key={ride.id}
                      ride={ride}
                      onClick={() => handleRideClick(ride)}
                      onBook={() => {
                        setSelectedRide(ride);
                        setShowBookingModal(true);
                      }}
                      onContact={() => {
                        setSelectedRide(ride);
                      }}
                    />
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-16 bg-white rounded-2xl border-2 border-dashed border-gray-200 col-span-full">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icons.Search className="text-gray-400" size={28} />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun trajet trouvé</h3>
                      <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                        Essayez de changer la date ou vérifiez l'orthographe des villes.
                      </p>
                      <button
                        onClick={() => setCurrentView('publish')}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors"
                      >
                        <Icons.PlusCircle size={18} />
                        Proposer ce trajet
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'ride-details':
        return selectedRide ? (
          <RideDetails
            ride={selectedRide}
            onBack={() => setCurrentView('search')}
            onBook={initiateBooking}
            onChat={() => {}}
          />
        ) : null;

      case 'publish':
        // Publication accessible même sans compte
        return <PublishForm onPublish={handlePublishRide} onCancel={() => setCurrentView('home')} isAuthenticated={isAuthenticated} />;

      case 'ride-requests':
        return <RideRequestsList />;

      case 'profile':
        if (!isAuthenticated) {
          setCurrentView('home');
          return null;
        }
        return <ProfileView onNavigate={setCurrentView} refreshKey={profileRefreshKey} />;

      default:
        return null;
    }
  };

  // Afficher un loader pendant le chargement de l'auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout
      onNavigate={(view) => {
        if (view === 'driver-mode') {
          setShowDriverMode(true);
        } else {
          setCurrentView(view);
        }
      }}
      currentView={currentView}
      user={user ? {
        id: user.id,
        name: `${user.firstName} ${user.lastName || ''}`.trim(),
        avatarUrl: user.avatarUrl || `https://ui-avatars.com/api/?name=${user.firstName}&background=10b981&color=fff`,
        rating: user.rating || 4.5,
        reviewCount: user.reviewCount || 0,
        isVerified: user.isVerified || false
      } : null}
      onLoginClick={() => setShowAuthModal(true)}
      onLogoutClick={() => { }}
    >
      {renderContent()}
      <CookieBanner />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          // Rediriger vers le profil après connexion/inscription réussie
          setCurrentView('profile');
        }}
      />

      {showPassengerRequestForm && (
        <PassengerRequestForm
          onClose={() => setShowPassengerRequestForm(false)}
          onSuccess={() => {
            setShowPassengerRequestForm(false);
            setCurrentView('ride-requests');
          }}
        />
      )}

      {/* Modal Demande de Course (Client) */}
      {showRequestRide && userLocation.coords && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🚖 Demander une course</h2>
              <button
                onClick={() => setShowRequestRide(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>
            <div className="p-6">
              <RideRequest
                userLocation={userLocation.coords}
                onRequestRide={(request) => {
                  console.log('Demande de course:', request);
                  // TODO: Envoyer au backend via WebSocket
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Mode Chauffeur */}
      {showDriverMode && userLocation.coords && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">🚗 Mode Chauffeur</h2>
              <button
                onClick={() => setShowDriverMode(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>
            <div className="p-6">
              <DriverDashboard
                driverLocation={userLocation.coords}
                isAvailable={isDriverAvailable}
                onToggleAvailability={() => setIsDriverAvailable(!isDriverAvailable)}
                onAcceptRide={(requestId, estimatedArrival) => {
                  console.log('Course acceptée:', requestId, estimatedArrival);
                  // TODO: Notifier le client via WebSocket
                }}
              />
            </div>
          </div>
        </div>
      )}

      {selectedRide && (
        <>
          <BookingModal
            isOpen={showBookingModal}
            onClose={() => setShowBookingModal(false)}
            rideId={selectedRide.id}
            price={selectedRide.price}
            currency={selectedRide.currency}
            seats={selectedRide.seatsAvailable}
            origin={selectedRide.origin}
            destination={selectedRide.destination}
            departureTime={selectedRide.departureTime}
            driverName={selectedRide.driver.name}
            onSuccess={handleBookingSuccess}
          />


        </>
      )}
    </Layout>
  );
}

// Wrapper avec AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

