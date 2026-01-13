import React, { useState } from 'react';
import { Icons } from './Icons';
import { useAuth } from '../contexts/AuthContext';
import { ApiClient } from '../services/apiClient';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const { login } = useAuth();
    const [view, setView] = useState<'login' | 'register'>('login');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [formData, setFormData] = useState({
        username: '',
        phone: '',
        password: '',
        confirmPassword: ''
    });

    if (!isOpen) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            if (view === 'register') {
                if (formData.password !== formData.confirmPassword) {
                    throw new Error('Les mots de passe ne correspondent pas');
                }

                // Validation du pseudo
                if (!formData.username || formData.username.length < 3) {
                    throw new Error('Le pseudo doit avoir au moins 3 caractères');
                }

                const res = await ApiClient.post<any>('/auth/register', {
                    username: formData.username,
                    password: formData.password,
                    phone: formData.phone || undefined // Optionnel
                });

                console.log('Réponse inscription:', res);

                if (res.success && res.data) {
                    login(res.data.user, res.data.tokens);
                    onSuccess();
                    onClose();
                } else {
                    const errorMsg = res.error?.message || res.message || 'Erreur lors de l\'inscription';
                    throw new Error(errorMsg);
                }

            } else {
                const res = await ApiClient.post<any>('/auth/login', {
                    identifier: formData.username || formData.phone, // Pseudo ou téléphone
                    password: formData.password
                });

                console.log('Réponse connexion:', res);

                if (res.success && res.data) {
                    login(res.data.user, res.data.tokens);
                    onSuccess();
                    onClose();
                } else {
                    const errorMsg = res.error?.message || res.message || 'Identifiants incorrects';
                    throw new Error(errorMsg);
                }
            }
        } catch (err: any) {
            console.error('Auth error:', err);
            const errorMessage = err.response?.data?.message || err.message || 'Une erreur est survenue';
            setError(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl scale-100 transition-all">
                {/* Header */}
                <div className="bg-emerald-600 px-6 py-4 flex items-center justify-between">
                    <h2 className="text-white text-xl font-bold flex items-center gap-2">
                        <Icons.User size={24} />
                        {view === 'login' ? 'Connexion' : 'Inscription'}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-white/80 hover:text-white p-1 rounded-full hover:bg-emerald-500/50 transition-colors"
                    >
                        <Icons.X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                            <Icons.AlertCircle size={16} />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {view === 'register' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Pseudo (unique)</label>
                                <div className="relative">
                                    <Icons.User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="text"
                                        name="username"
                                        value={formData.username}
                                        onChange={handleChange}
                                        placeholder="Ex: moussa_senegal"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                                <p className="text-xs text-gray-500">Votre identifiant unique sur Sunu Yoon</p>
                            </div>
                        )}

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">
                                {view === 'login' ? 'Pseudo ou Téléphone' : 'Téléphone (optionnel)'}
                            </label>
                            <div className="relative">
                                <Icons.Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    name={view === 'login' ? 'username' : 'phone'}
                                    value={view === 'login' ? formData.username : formData.phone}
                                    onChange={handleChange}
                                    placeholder={view === 'login' ? 'Votre pseudo ou 771234567' : 'Ex: 771234567 (optionnel)'}
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    required={view === 'login'}
                                />
                            </div>
                            {view === 'register' && (
                                <p className="text-xs text-gray-500">Pour recevoir les notifications SMS (optionnel)</p>
                            )}
                        </div>

                        <div className="space-y-1">
                            <label className="text-sm font-medium text-gray-700">Mot de passe</label>
                            <div className="relative">
                                <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="••••••••"
                                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                    required
                                />
                            </div>
                        </div>

                        {view === 'register' && (
                            <div className="space-y-1">
                                <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
                                <div className="relative">
                                    <Icons.Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="password"
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="••••••••"
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                                        required
                                    />
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/30 transition-all transform active:scale-95 flex items-center justify-center gap-2 mt-6"
                        >
                            {isLoading ? (
                                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>
                                    {view === 'login' ? <Icons.LogIn size={20} /> : <Icons.UserPlus size={20} />}
                                    <span>{view === 'login' ? 'Se connecter' : 'S\'inscrire'}</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600 text-sm">
                            {view === 'login' ? 'Pas encore de compte ?' : 'Déjà un compte ?'}
                            <button
                                onClick={() => setView(view === 'login' ? 'register' : 'login')}
                                className="ml-2 text-emerald-600 font-bold hover:underline"
                            >
                                {view === 'login' ? 'Créer un compte' : 'Se connecter'}
                            </button>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
