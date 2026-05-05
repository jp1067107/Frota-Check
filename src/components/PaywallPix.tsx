import React from 'react';
import { Button } from './ui/Button';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

export const PaywallPix: React.FC<{ email: string }> = ({ email }) => {
  const { logout } = useAuth();
  
  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <div className="max-w-md w-full bg-[#18181b] rounded-3xl p-8 border border-white/5 shadow-2xl text-center relative z-10">
        <h2 className="text-2xl sm:text-3xl font-black text-red-500 uppercase tracking-tight mb-2">Assinatura Inativa</h2>
        <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-8">Conta <strong className="text-white">{email}</strong> suspensa</p>
        
        <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 mb-6 flex items-center justify-center shadow-lg shadow-black/50">
          {/* Placeholder for PIX QR Code */}
          <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full opacity-80">
             {Array.from({length: 16}).map((_, i) => (
                <div key={i} className={`bg-zinc-950 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'} rounded-sm`}></div>
             ))}
          </div>
        </div>
        
        <p className="text-sm text-zinc-400 mb-8 px-4 leading-relaxed font-medium">
          Renove sua assinatura para liberar o acesso ao painel e a operação da frota em campo.
        </p>

        <div className="flex flex-col gap-3">
          <a 
            href={`mailto:suporte@frotacheck.com.br?subject=Renovação - ${email}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button size="lg" className="w-full bg-zinc-100 text-zinc-950 hover:bg-white py-6 font-black uppercase tracking-widest text-lg shadow-lg shadow-white/10 active:scale-[0.98] transition-all border-0">
              Falar com Suporte
            </Button>
          </a>
          
          <Button 
            onClick={logout} 
            variant="outline" 
            size="lg" 
            className="w-full bg-transparent border-white/10 text-zinc-400 hover:text-white hover:bg-white/5 py-6 font-bold uppercase tracking-widest transition-all"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Voltar ao Login
          </Button>
        </div>
      </div>
    </div>
  );
};
