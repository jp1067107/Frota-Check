import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck, ArrowLeft } from 'lucide-react';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/config';

export const ManagerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const { loginManager, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      await loginManager(email, password);
      navigate('/dashboard');
    } catch (err: any) {
      // Very basic error mapping
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
         setError('E-mail ou senha incorretos.');
      } else {
         setError(err.message || 'Erro ao fazer login.');
      }
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    
    if (!email) {
      setError('Preencha seu e-mail para recuperar a senha.');
      return;
    }

    try {
      auth.languageCode = 'pt';
      const actionCodeSettings = {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false, // We're handling it as a normal reset password link route
      };
      await sendPasswordResetEmail(auth, email, actionCodeSettings);
      setResetMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes. (Verifique sua caixa de SPAM)');
    } catch (err: any) {
      console.error("Erro ao enviar reset:", err);
      if (err.code === 'auth/invalid-email') {
        setError('E-mail inválido.');
      } else {
        // Exibir mesma mensagem por segurança
        setResetMessage('Se este e-mail estiver cadastrado, você receberá um link para redefinir a senha em instantes.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans p-6 justify-center items-center relative">
      <button 
        onClick={() => showResetPassword ? setShowResetPassword(false) : navigate('/')}
        className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-sm"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <Truck className="w-12 h-12 text-gray-900" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">
            {showResetPassword ? 'Recuperar Senha' : 'Acesso do Gestor'}
          </p>
        </div>

        {showResetPassword ? (
          <form onSubmit={handleResetPassword} className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold text-center">
                {error}
              </div>
            )}
            {resetMessage && (
              <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 p-4 rounded-xl text-sm font-bold text-center">
                {resetMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase text-gray-400">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white transition-all placeholder:text-gray-600"
                placeholder="gestor@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <Button 
              type="submit"
              className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold text-lg py-6 uppercase tracking-widest mt-4"
              disabled={loading}
            >
              Enviar link de recuperação
            </Button>

            <div className="text-center mt-4 pt-2 border-t border-gray-700">
              <button 
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setError('');
                  setResetMessage('');
                }}
                className="text-gray-400 hover:text-white transition-colors text-sm font-bold tracking-widest uppercase"
              >
                Voltar ao Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase text-gray-400">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white transition-all placeholder:text-gray-600"
                placeholder="gestor@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase text-gray-400">Senha</label>
              <input 
                type="password"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white transition-all placeholder:text-gray-600"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="flex justify-end pt-1">
                <button 
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setError('');
                  }}
                  className="text-yellow-500 hover:text-yellow-400 text-xs font-bold uppercase tracking-widest transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold text-lg py-6 uppercase tracking-widest mt-4"
              disabled={loading}
            >
              {loading ? 'Acessando...' : 'Entrar no Painel'}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

