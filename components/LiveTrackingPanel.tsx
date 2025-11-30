import React, { useEffect, useRef, useState } from 'react';
import LiveMap from './LiveMap';
import { Icons } from './Icons';
import { Coordinates } from '../types';
import { locationService, LocationUpdate } from '../services/locationService';
import { trackingService, TrackingUpdate } from '../services/trackingService';

interface LiveTrackingPanelProps {
  userLocation?: Coordinates | null;
}

type DriverStatus = 'idle' | 'searching' | 'live' | 'error';
type FollowStatus = 'idle' | 'connecting' | 'live' | 'ended' | 'error';

const LiveTrackingPanel: React.FC<LiveTrackingPanelProps> = ({ userLocation }) => {
  const [driverRideId, setDriverRideId] = useState('');
  const [followRideId, setFollowRideId] = useState('');
  const [driverStatus, setDriverStatus] = useState<DriverStatus>('idle');
  const [followStatus, setFollowStatus] = useState<FollowStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [driverLocation, setDriverLocation] = useState<LocationUpdate | null>(null);
  const [currentFollowedRide, setCurrentFollowedRide] = useState<string | null>(null);

  const unsubscribeRef = useRef<() => void>();

  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      locationService.stopTracking();
    };
  }, []);

  const normalizeUpdate = (update: TrackingUpdate): LocationUpdate => ({
    rideId: update.rideId,
    driverId: '',
    coords: update.coords,
    speed: update.speed,
    heading: update.heading,
    timestamp: new Date(update.updatedAt)
  });

  const handleDriverToggle = () => {
    if (locationService.tracking) {
      locationService.stopTracking();
      setDriverStatus('idle');
      setStatusMessage('Vous avez arrêté de partager votre position.');
      return;
    }

    if (!driverRideId.trim()) {
      setErrorMessage("Ajoutez l'identifiant du trajet avant d'activer le partage.");
      return;
    }

    setErrorMessage(null);
    const rideId = driverRideId.trim();
    const started = locationService.startTracking(rideId, {
      onLocationUpdate: (update) => {
        setDriverLocation(update);
        setDriverStatus('live');
        setStatusMessage('Position partagée auprès des passagers.');
      },
      onError: (error) => {
        setDriverStatus('error');
        setErrorMessage(error);
      },
      onStatusChange: (status) => {
        if (status === 'searching') {
          setDriverStatus('searching');
          setStatusMessage('Initialisation du GPS...');
        }
      }
    });

    if (started) {
      setStatusMessage('GPS activé, en attente du premier point.');
    }
  };

  const stopFollowing = () => {
    unsubscribeRef.current?.();
    unsubscribeRef.current = undefined;
    setCurrentFollowedRide(null);
    setFollowStatus('idle');
  };

  const handleFollow = async () => {
    if (!followRideId.trim()) {
      setErrorMessage('Saisissez le code du trajet à suivre.');
      return;
    }

    const rideId = followRideId.trim();
    setErrorMessage(null);
    setFollowStatus('connecting');
    unsubscribeRef.current?.();

    const latest = await trackingService.getLatestLocation(rideId);
    if (latest) {
      setDriverLocation(normalizeUpdate(latest));
    }

    unsubscribeRef.current = trackingService.subscribeToRide(
      rideId,
      (payload) => {
        if (payload.ended) {
          setFollowStatus('ended');
          setStatusMessage(payload.reason || 'Le conducteur a terminé le trajet.');
          setDriverLocation(null);
          unsubscribeRef.current?.();
          unsubscribeRef.current = undefined;
          setCurrentFollowedRide(null);
          return;
        }
        setDriverLocation(normalizeUpdate(payload));
        setFollowStatus('live');
        setStatusMessage('Position rafraîchie automatiquement.');
      },
      (error) => {
        setErrorMessage(error);
        setFollowStatus('error');
      }
    );

    setCurrentFollowedRide(rideId);
  };

  return (
    <section className="mt-16">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.4em] text-emerald-600 mb-1">Temps réel</p>
            <h2 className="text-2xl font-bold text-gray-900">Suivez vos chauffeurs comme sur Uber</h2>
            <p className="text-gray-500 text-sm mt-2">
              Partage GPS pour les conducteurs, suivi instantané pour les passagers, sans inscription.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2 rounded-full">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Flux en direct prêt
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-6">
          <div className="p-5 rounded-xl border border-gray-100 bg-gray-50/60">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-3">Conducteur</p>
            <label className="text-sm font-medium text-gray-600 mb-2 block">Code du trajet</label>
            <input
              type="text"
              value={driverRideId}
              onChange={(e) => setDriverRideId(e.target.value)}
              placeholder="Ex: RIDE-DAK-001"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 font-semibold focus:ring-2 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleDriverToggle}
              className={`mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-white font-semibold transition-colors ${
                locationService.tracking ? 'bg-gray-800 hover:bg-gray-900' : 'bg-emerald-600 hover:bg-emerald-700'
              }`}
            >
              {locationService.tracking ? (
                <>
                  <Icons.Pause size={18} />
                  Arrêter le partage
                </>
              ) : (
                <>
                  <Icons.Navigation size={18} />
                  Activer mon GPS
                </>
              )}
            </button>
            <p className="mt-2 text-xs text-gray-500">
              Vos coordonnées sont envoyées toutes les 2 secondes max.
            </p>
          </div>

          <div className="p-5 rounded-xl border border-gray-100 bg-white">
            <p className="text-xs uppercase tracking-[0.4em] text-gray-500 mb-3">Passager</p>
            <label className="text-sm font-medium text-gray-600 mb-2 block">Code du trajet à suivre</label>
            <input
              type="text"
              value={followRideId}
              onChange={(e) => setFollowRideId(e.target.value)}
              placeholder="Ex: RIDE-DAK-001"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 font-semibold focus:ring-2 focus:ring-emerald-500"
            />
            <div className="flex gap-3 mt-3">
              <button
                type="button"
                onClick={handleFollow}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Icons.Play size={18} />
                Suivre en direct
              </button>
              {currentFollowedRide && (
                <button
                  type="button"
                  onClick={stopFollowing}
                  className="px-4 py-3 rounded-lg border border-gray-200 text-gray-600 font-semibold hover:text-gray-900"
                >
                  <Icons.StopCircle size={18} />
                </button>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Partagez ce code aux passagers pour qu'ils voient votre progression.
            </p>
          </div>
        </div>

        {(statusMessage || errorMessage) && (
          <div className={`mt-4 text-sm font-medium ${errorMessage ? 'text-red-600' : 'text-emerald-600'}`}>
            {errorMessage ?? statusMessage}
          </div>
        )}
      </div>

      <div className="mt-6">
        <LiveMap
          userLocation={userLocation || undefined}
          driverLocation={driverLocation}
          isTracking={locationService.tracking || followStatus === 'live'}
          height="320px"
          showRoute={false}
        />
      </div>
    </section>
  );
};

export default LiveTrackingPanel;
