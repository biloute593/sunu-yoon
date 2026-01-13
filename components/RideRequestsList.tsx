import React, { useState, useEffect } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';

interface RideRequest {
  id: string;
  originCity: string;
  destinationCity: string;
  departureDate: string;
  seats: number;
  maxPricePerSeat: number | null;
  description: string | null;
  status: string;
  passenger: {
    id: string;
    name: string;
    phone: string;
    avatarUrl: string;
    rating: number;
  };
  acceptedByDriver?: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    carModel: string;
  };
}

const RideRequestsList: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const [requests, setRequests] = useState<RideRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'my-requests'>('all');

  const loadRequests = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'https://sunu-yoon-demo-2025.netlify.app/api';
      const token = localStorage.getItem('token');
      
      const endpoint = filter === 'my-requests' 
        ? `${apiUrl}/ride-requests/my-requests`
        : `${apiUrl}/ride-requests/active?limit=30`;

      const headers: any = {};
      if (token && filter === 'my-requests') {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, { headers });
      const data = await response.json();

      if (data.success) {
        setRequests(data.data.requests || data.data || []);
      } else {
        throw new Error(data.error || 'Erreur de chargement');
      }
    } catch (err: any) {
      console.error('Error loading requests:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, [filter]);

  const handleAccept = async (requestId: string) => {
    if (!isAuthenticated) {
      alert('Vous devez être connecté pour accepter une demande');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const apiUrl = import.meta.env.VITE_API_URL || 'https://sunu-yoon-demo-2025.netlify.app/api';
      
      const response = await fetch(`${apiUrl}/ride-requests/${requestId}/accept`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        alert('Demande acceptée ! Le passager sera notifié.');
        loadRequests();
      } else {
        throw new Error(data.error || 'Erreur lors de l\'acceptation');
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Demandes de trajets</h1>
        <p className="text-gray-600">Les passagers cherchent un conducteur</p>
      </div>

      {isAuthenticated && (
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Toutes les demandes
          </button>
          <button
            onClick={() => setFilter('my-requests')}
            className={`px-4 py-2 rounded-xl font-medium transition ${
              filter === 'my-requests'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Mes demandes
          </button>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4">
          {error}
        </div>
      )}

      {!isLoading && requests.length === 0 && (
        <div className="text-center py-12">
          <Icons.Search size={48} className="mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">Aucune demande disponible</p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        {requests.map((request) => (
          <div
            key={request.id}
            className="bg-white border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <img
                  src={request.passenger.avatarUrl}
                  alt={request.passenger.name}
                  className="w-12 h-12 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">{request.passenger.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <span>⭐ {request.passenger.rating.toFixed(1)}</span>
                  </div>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  request.status === 'PENDING'
                    ? 'bg-yellow-100 text-yellow-800'
                    : request.status === 'ACCEPTED'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {request.status === 'PENDING' ? 'En attente' : 
                 request.status === 'ACCEPTED' ? 'Acceptée' : 'Annulée'}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex items-center gap-2 text-gray-700">
                <Icons.MapPin size={18} className="text-emerald-600" />
                <span className="font-semibold">{request.originCity}</span>
                <Icons.ArrowRight size={16} className="text-gray-400" />
                <span className="font-semibold">{request.destinationCity}</span>
              </div>

              <div className="flex items-center gap-2 text-gray-600">
                <Icons.Calendar size={18} />
                <span>{formatDate(request.departureDate)}</span>
              </div>

              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Icons.Users size={16} />
                  <span>{request.seats} place(s)</span>
                </div>
                {request.maxPricePerSeat && (
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-gray-900">
                      Max {request.maxPricePerSeat.toLocaleString()} XOF
                    </span>
                  </div>
                )}
              </div>

              {request.description && (
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-xl">
                  {request.description}
                </p>
              )}

              {request.acceptedByDriver && (
                <div className="bg-green-50 border border-green-200 p-3 rounded-xl">
                  <p className="text-sm font-medium text-green-900 mb-1">Acceptée par:</p>
                  <p className="text-sm text-green-700">
                    {request.acceptedByDriver.name} - {request.acceptedByDriver.carModel}
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <a
                href={`tel:${request.passenger.phone}`}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition text-center flex items-center justify-center gap-2"
              >
                <Icons.Phone size={16} />
                Appeler
              </a>
              {request.status === 'PENDING' && filter === 'all' && (
                <button
                  onClick={() => handleAccept(request.id)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition"
                >
                  Accepter
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RideRequestsList;
