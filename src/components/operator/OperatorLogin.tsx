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
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans p-6 justify-center items-center relative">
      <button 
        onClick={() => navigate('/')}
        className="absolute top-6 left-6 text-gray-500 hover:text-white transition-colors flex items-center gap-2 font-bold uppercase tracking-widest text-sm"
      >
        <ArrowLeft className="w-5 h-5" /> Voltar
      </button>

      <div className="w-full max-w-sm space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <Truck className="w-12 h-12 text-gray-900" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Portal do Operador</p>
        </div>

        <form onSubmit={handleLogin} className="bg-gray-800 p-6 sm:p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase text-gray-400">Código da Empresa</label>
            <input 
              type="text"
              className="w-full h-16 px-4 text-xl font-bold bg-gray-900 border-2 border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none text-white transition-colors"
              placeholder="Ex: fazendajao"
              value={empresaId}
              onChange={e => setEmpresaId(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold uppercase text-gray-400">Seu PIN (4 dígitos)</label>
            <input 
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              className="w-full h-16 px-4 text-3xl tracking-[0.5em] text-center font-black bg-gray-900 border-2 border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none text-white transition-colors placeholder:text-gray-600 text-yellow-500"
              placeholder="****"
              value={pin}
              onChange={e => setPin(e.target.value.slice(0, 4))}
            />
          </div>

          <button 
            type="submit"
            className="w-full bg-yellow-500 text-gray-900 font-black text-xl py-5 rounded-xl shadow-[0_6px_0_#b47c00] active:translate-y-1 active:shadow-[0_0px_0_#b47c00] transition-all uppercase tracking-wider flex justify-center items-center gap-2 mt-4 disabled:opacity-50 disabled:shadow-none disabled:translate-y-0"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'} <ChevronRight className="w-6 h-6" />
          </button>
        </form>
      </div>
    </div>
  );
};
