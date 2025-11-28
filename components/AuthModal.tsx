import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icons } from './Icons';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

type AuthStep = 'login' | 'register' | 'verify';

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login, register, verifyCode, resendCode, isLoading } = useAuth();
  
  const [step, setStep] = useState<AuthStep>(initialMode);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  
  // Login form
  const [loginPhone, setLoginPhone] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerName, setRegisterName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  
  // Verification
  const [verificationPhone, setVerificationPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  if (!isOpen) return null;

  const formatPhoneNumber = (phone: string): string => {
    // Nettoyer et formater le numéro sénégalais
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('221')) {
      cleaned = cleaned.substring(3);
    }
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    return cleaned;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await login({
      phone: formatPhoneNumber(loginPhone),
      password: loginPassword
    });
    
    if (result.success) {
      if (result.requiresVerification) {
        setVerificationPhone(formatPhoneNumber(loginPhone));
        setStep('verify');
        setSuccess('Un code de vérification a été envoyé à votre téléphone.');
      } else {
        onClose();
        resetForm();
      }
    } else {
      setError(result.error || 'Erreur de connexion');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (registerPassword !== registerConfirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (registerPassword.length < 6) {
      setError('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }
    
    const result = await register({
      name: registerName,
      phone: formatPhoneNumber(registerPhone),
      email: registerEmail || undefined,
      password: registerPassword
    });
    
    if (result.success) {
      setVerificationPhone(formatPhoneNumber(registerPhone));
      setStep('verify');
      setSuccess('Compte créé ! Vérifiez votre téléphone pour le code de confirmation.');
    } else {
      setError(result.error || 'Erreur lors de l\'inscription');
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    const result = await verifyCode(verificationPhone, verificationCode);
    
    if (result.success) {
      onClose();
      resetForm();
    } else {
      setError(result.error || 'Code invalide');
    }
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0) return;
    
    const result = await resendCode(verificationPhone);
    
    if (result.success) {
      setSuccess('Un nouveau code a été envoyé.');
      setResendCooldown(60);
      const interval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setError(result.error || 'Impossible de renvoyer le code');
    }
  };

  const resetForm = () => {
    setStep('login');
    setError('');
    setSuccess('');
    setLoginPhone('');
    setLoginPassword('');
    setRegisterName('');
    setRegisterPhone('');
    setRegisterEmail('');
    setRegisterPassword('');
    setRegisterConfirmPassword('');
    setVerificationCode('');
  };

  const renderLogin = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+221</span>
          <input 
            type="tel"
            value={loginPhone}
            onChange={(e) => setLoginPhone(e.target.value)}
            placeholder="77 123 45 67"
            className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
        <div className="relative">
          <Icons.Shield className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
          />
        </div>
      </div>
      
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Connexion...
          </>
        ) : (
          'Se connecter'
        )}
      </button>
      
      <div className="text-center text-sm text-gray-500 pt-4">
        Pas encore de compte ?{' '}
        <button 
          type="button"
          onClick={() => { setStep('register'); setError(''); }}
          className="text-emerald-600 font-bold hover:underline"
        >
          S'inscrire
        </button>
      </div>
    </form>
  );

  const renderRegister = () => (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
        <div className="relative">
          <Icons.User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text"
            value={registerName}
            onChange={(e) => setRegisterName(e.target.value)}
            placeholder="Amadou Diallo"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">+221</span>
          <input 
            type="tel"
            value={registerPhone}
            onChange={(e) => setRegisterPhone(e.target.value)}
            placeholder="77 123 45 67"
            className="w-full pl-14 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
          />
        </div>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Email (optionnel)</label>
        <div className="relative">
          <Icons.MessageCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="email"
            value={registerEmail}
            onChange={(e) => setRegisterEmail(e.target.value)}
            placeholder="amadou@email.com"
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
          <input 
            type="password"
            value={registerPassword}
            onChange={(e) => setRegisterPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
            minLength={6}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
          <input 
            type="password"
            value={registerConfirmPassword}
            onChange={(e) => setRegisterConfirmPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" 
            required
          />
        </div>
      </div>
      
      <button 
        type="submit"
        disabled={isLoading}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Création...
          </>
        ) : (
          'Créer mon compte'
        )}
      </button>
      
      <div className="text-center text-sm text-gray-500 pt-4">
        Déjà inscrit ?{' '}
        <button 
          type="button"
          onClick={() => { setStep('login'); setError(''); }}
          className="text-emerald-600 font-bold hover:underline"
        >
          Se connecter
        </button>
      </div>
    </form>
  );

  const renderVerification = () => (
    <form onSubmit={handleVerify} className="space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Icons.Smartphone className="text-emerald-600" size={32} />
        </div>
        <h3 className="text-lg font-bold text-gray-900 mb-2">Vérification du téléphone</h3>
        <p className="text-gray-600 text-sm">
          Un code à 6 chiffres a été envoyé au<br />
          <span className="font-semibold text-gray-900">+221 {verificationPhone}</span>
        </p>
      </div>
      
      <div>
        <input 
          type="text"
          value={verificationCode}
          onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="• • • • • •"
          className="w-full text-center text-2xl tracking-[0.5em] py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none font-mono" 
          maxLength={6}
          required
        />
      </div>
      
      <button 
        type="submit"
        disabled={isLoading || verificationCode.length !== 6}
        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Vérification...
          </>
        ) : (
          'Valider'
        )}
      </button>
      
      <div className="text-center">
        <button 
          type="button"
          onClick={handleResendCode}
          disabled={resendCooldown > 0}
          className="text-sm text-emerald-600 hover:underline disabled:text-gray-400 disabled:no-underline"
        >
          {resendCooldown > 0 
            ? `Renvoyer le code dans ${resendCooldown}s`
            : 'Je n\'ai pas reçu le code'
          }
        </button>
      </div>
    </form>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}></div>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-emerald-600 p-6 text-center relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white"
          >
            <Icons.X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-white mb-2">
            {step === 'login' && 'Bienvenue sur Sunu Yoon'}
            {step === 'register' && 'Créer un compte'}
            {step === 'verify' && 'Vérification'}
          </h2>
          <p className="text-emerald-100 text-sm">
            {step === 'login' && 'Connectez-vous pour accéder à votre compte'}
            {step === 'register' && 'Rejoignez la communauté de covoiturage'}
            {step === 'verify' && 'Confirmez votre numéro de téléphone'}
          </p>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <Icons.X size={16} className="flex-shrink-0" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
              <Icons.CheckCircle size={16} className="flex-shrink-0" />
              {success}
            </div>
          )}
          
          {step === 'login' && renderLogin()}
          {step === 'register' && renderRegister()}
          {step === 'verify' && renderVerification()}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;
