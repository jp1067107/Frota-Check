import React from 'react';
import { Button } from './ui/Button';

export const PaywallPix: React.FC<{ email: string }> = ({ email }) => {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-gray-800 rounded-3xl p-8 border border-gray-700 shadow-2xl text-center">
        <h2 className="text-3xl font-black text-yellow-500 uppercase tracking-tight mb-2">Assinatura Inativa</h2>
        <p className="text-gray-400 mb-8 font-medium">Acesso temporariamente suspenso para a conta <strong className="text-white">{email}</strong>.</p>
        
        <div className="bg-white p-4 rounded-2xl mx-auto w-48 h-48 mb-6 flex items-center justify-center">
          {/* Placeholder for PIX QR Code */}
          <div className="grid grid-cols-4 grid-rows-4 gap-1 w-full h-full opacity-80">
             {Array.from({length: 16}).map((_, i) => (
                <div key={i} className={`bg-gray-900 ${Math.random() > 0.5 ? 'opacity-100' : 'opacity-0'} rounded-sm`}></div>
             ))}
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-8 px-4">
          Renove sua assinatura para liberar o acesso ao painel e a operação da frota em campo.
        </p>

        <a 
          href={`https://wa.me/?text=Olá, sou o gestor (${email}) e gostaria de regularizar minha assinatura do FrotaCheck.`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <Button size="lg" className="w-full bg-[#25D366] text-gray-900 hover:bg-[#1DA851] py-6 font-black uppercase tracking-widest text-lg shadow-[0_6px_0_#128c7e] active:translate-y-1 active:shadow-[0_0px_0_#128c7e] transition-all">
            Falar via WhatsApp
          </Button>
        </a>
      </div>
    </div>
  );
};
