import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Truck } from 'lucide-react';
import { Button } from '../ui/Button';

export const ManagerLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { loginManager, loading } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!email || !password) {
      setError('Preencha os campos obrigatórios.');
      return;
    }

    try {
      await loginManager(email, password);
    } catch (err: any) {
      // Very basic error mapping
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
         setError('E-mail ou senha incorretos.');
      } else {
         setError(err.message || 'Erro ao fazer login.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans p-6 justify-center items-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <Truck className="w-12 h-12 text-gray-900" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">FrotaCheck</h1>
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Acesso do Gestor</p>
        </div>

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
          </div>

          <Button 
            type="submit"
            className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold text-lg py-6 uppercase tracking-widest mt-4"
            disabled={loading}
          >
            {loading ? 'Acessando...' : 'Entrar no Painel'}
          </Button>
        </form>
      </div>
    </div>
  );
};
