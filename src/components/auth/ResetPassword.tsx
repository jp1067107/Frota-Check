import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { verifyPasswordResetCode, confirmPasswordReset } from 'firebase/auth';
import { auth } from '../../firebase/config';
import { Button } from '../ui/Button';
import { ShieldCheck, CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

export const ResetPassword: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'loading' | 'valid' | 'invalid' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  
  const actionCode = searchParams.get('oobCode');

  useEffect(() => {
    if (!actionCode) {
      setStatus('invalid');
      setErrorMessage('O link de recuperação está ausente. Verifique o link recebido por e-mail.');
      return;
    }

    verifyPasswordResetCode(auth, actionCode)
      .then(() => {
        setStatus('valid');
      })
      .catch((error) => {
        setStatus('invalid');
        setErrorMessage('Este link de recuperação expirou ou já foi utilizado.');
        console.error("Erro ao verificar código:", error);
      });
  }, [actionCode]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actionCode) return;
    
    if (newPassword.length < 6) {
      setErrorMessage('A nova senha deve ter no mínimo 6 caracteres.');
      setStatus('error');
      return;
    }

    setStatus('loading');
    try {
      await confirmPasswordReset(auth, actionCode, newPassword);
      setStatus('success');
    } catch (error: any) {
      setStatus('error');
      setErrorMessage(error.message || 'Ocorreu um erro ao tentar redefinir sua senha.');
      console.error("Erro ao redefinir:", error);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans justify-center items-center p-4 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700 relative z-10">
        
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-[2rem] mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6 rotate-3">
            <ShieldCheck className="w-10 h-10 text-zinc-950 -rotate-3" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-[10px] font-bold text-zinc-500 tracking-widest uppercase">
            Redefinição de Acesso
          </p>
        </div>

        <div className="bg-[#18181b] p-8 rounded-[2rem] border border-white/5 shadow-2xl relative overflow-hidden">
          {/* Subtle gradient background element */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 via-amber-400 to-amber-600 opacity-50"></div>

          {status === 'loading' && (
            <div className="flex flex-col items-center justify-center py-12 space-y-6">
              <div className="w-16 h-16 border-4 border-white/5 border-t-amber-500 rounded-full animate-spin"></div>
              <p className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] animate-pulse">Processando...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mb-2">
                <AlertCircle className="w-10 h-10 text-red-500" />
              </div>
              <div className="space-y-3">
                <h3 className="text-xl font-black text-white uppercase tracking-wider">Link Inválido</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">{errorMessage}</p>
              </div>
              <Button onClick={() => navigate('/manager-login')} className="w-full bg-[#09090b] text-white border border-white/10 hover:bg-white/5 font-bold uppercase tracking-widest py-6 mt-4 transition-colors">
                Voltar ao Login
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center text-center space-y-6 py-8">
              <div className="w-20 h-20 bg-[#1DA851]/10 rounded-full flex items-center justify-center mb-2">
                <CheckCircle className="w-10 h-10 text-[#1DA851]" />
              </div>
              <div className="space-y-3">
                <h3 className="text-2xl font-black text-white uppercase tracking-wider">Tudo Certo!</h3>
                <p className="text-zinc-400 text-sm font-medium leading-relaxed">Sua senha foi atualizada com segurança. Você já pode acessar sua conta.</p>
              </div>
              <Button onClick={() => navigate('/manager-login')} className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold uppercase tracking-widest py-6 mt-4 shadow-lg shadow-amber-500/20 border-0">
                Acessar Minha Conta
              </Button>
            </div>
          )}

          {(status === 'valid' || status === 'error') && (
            <form onSubmit={handleResetPassword} className="space-y-6 py-2">
              <div className="text-center mb-8">
                <h2 className="text-xl font-bold text-white mb-2">Crie uma nova senha</h2>
                <p className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">Escolha uma senha forte com pelo menos 6 caracteres.</p>
              </div>

              {status === 'error' && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-[10px] font-bold text-center flex items-center justify-center gap-2">
                  <XCircle className="w-5 h-5 shrink-0" />
                  {errorMessage}
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nova Senha</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    className="w-full h-14 px-5 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors p-2"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <Button 
                type="submit"
                className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-lg py-6 uppercase tracking-widest shadow-lg shadow-amber-500/20 transition-all active:scale-[0.98] mt-8 border-0"
              >
                Confirmar Senha
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
