import React from 'react';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const PaywallPix: React.FC<{ email: string; role?: 'manager' | 'operator' | null }> = ({ email, role = 'manager' }) => {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#18181b] rounded-3xl p-8 border border-white/5 shadow-2xl text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black text-red-500 uppercase tracking-tight mb-2">
          {role === 'operator' ? 'Empresa Inativa' : 'Assinatura Inativa'}
        </h2>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-8">
          Conta <strong className="text-white">{email}</strong> suspensa
        </p>
        
        <p className="text-sm text-zinc-400 mb-8 px-4 leading-relaxed font-medium">
          {role === 'operator' 
            ? 'A assinatura da sua empresa está inativa. Peça para o gestor regularizar a situação no painel web para liberar o uso do aplicativo.'
            : 'Acesse o link abaixo para regularizar a assinatura da sua empresa e liberar imediatamente o painel e os aplicativos em campo.'}
        </p>

        <div className="flex flex-col gap-3">
          {role === 'manager' && (
            <a 
              href={(import.meta.env.VITE_CAKTO_CHECKOUT_URL || 'https://pay.cakto.com.br/') + `?email=${encodeURIComponent(email)}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button size="lg" className="w-full bg-green-500 text-zinc-950 hover:bg-green-400 py-6 font-black uppercase tracking-widest text-lg shadow-lg shadow-green-500/20 active:scale-[0.98] transition-all border-0">
                Pagar Assinatura
              </Button>
            </a>
          )}
          
          <Button 
            onClick={logout} 
            variant="outline" 
            size="lg" 
            className="w-full bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 py-6 mt-2 font-bold uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </div>
    </div>
  );
};
