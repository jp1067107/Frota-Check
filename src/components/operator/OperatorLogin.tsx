import React, { useState } from 'react';
import { Truck, ChevronRight, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { useNavigate } from 'react-router-dom';

export const OperatorLogin: React.FC = () => {
  const [empresaId, setEmpresaId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const { loginOperator, loading } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!empresaId || pin.length < 4) {
      setError("Preencha todos os campos corretamente.");
      return;
    }

    try {
      await loginOperator(empresaId.toLowerCase().trim(), pin);
      navigate('/operador');
    } catch (err: any) {
      setError(err.message || 'Código da empresa ou PIN inválidos.');
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans p-6 justify-center items-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-zinc-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-xs z-10"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
            <Truck className="w-10 h-10 text-zinc-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Portal do Operador</p>
        </div>

        <form onSubmit={handleLogin} className="bg-[#18181b] p-6 sm:p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Código da Empresa</label>
              <input 
                type="text"
                className="w-full h-16 px-4 text-xl font-bold bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all shadow-inner placeholder:text-zinc-600 uppercase"
                placeholder="Ex: SILVA2026"
                value={empresaId}
                onChange={e => setEmpresaId(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Seu PIN (4 dígitos)</label>
              <input 
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={4}
                className="w-full h-16 px-4 text-3xl tracking-[0.5em] text-center font-black bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-amber-500 transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="****"
                value={pin}
                onChange={e => setPin(e.target.value.slice(0, 4))}
              />
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-xl py-6 rounded-xl shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all uppercase tracking-widest flex justify-center items-center gap-2 mt-4 disabled:opacity-50 border-0"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'} <ChevronRight className="w-6 h-6" />
          </Button>
        </form>
      </div>
    </div>
  );
};
