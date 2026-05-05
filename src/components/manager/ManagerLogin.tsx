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
         setError('E-mail não encontrado ou senha incorreta. Caso não tenha uma conta, crie a sua abaixo.');
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
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans p-6 justify-center items-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <button 
        onClick={() => showResetPassword ? setShowResetPassword(false) : navigate('/')}
        className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs z-10"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
            <Truck className="w-10 h-10 text-zinc-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
            {showResetPassword ? 'Recuperar Senha' : 'Acesso do Gestor'}
          </p>
        </div>

        {showResetPassword ? (
          <form onSubmit={handleResetPassword} className="bg-[#18181b] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center">
                {error}
              </div>
            )}
            {resetMessage && (
              <div className="bg-[#1DA851]/10 border border-[#1DA851]/20 text-[#1DA851] p-4 rounded-xl text-xs font-bold text-center">
                {resetMessage}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="gestor@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <Button 
              type="submit"
              className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold text-lg py-6 uppercase tracking-widest mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all border-0"
              disabled={loading}
            >
              Enviar link de recuperação
            </Button>

            <div className="text-center mt-4 pt-6 border-t border-white/5">
              <button 
                type="button"
                onClick={() => {
                  setShowResetPassword(false);
                  setError('');
                  setResetMessage('');
                }}
                className="text-zinc-400 hover:text-white transition-colors text-xs font-bold tracking-widest uppercase"
              >
                Voltar ao Login
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="bg-[#18181b] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="gestor@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Senha</label>
              <input 
                type="password"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <div className="flex justify-end pt-2">
                <button 
                  type="button"
                  onClick={() => {
                    setShowResetPassword(true);
                    setError('');
                  }}
                  className="text-amber-500 hover:text-amber-400 text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            </div>

            <Button 
              type="submit"
              className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold text-lg py-6 uppercase tracking-widest mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all border-0"
              disabled={loading}
            >
              {loading ? 'Acessando...' : 'Entrar no Painel'}
            </Button>
            
            <div className="text-center mt-6 pt-6 border-t border-white/5">
              <button 
                type="button" 
                onClick={() => navigate('/manager-register')} 
                className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
              >
                Não tem conta? Criar Conta
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

