import React, { useState } from 'react';
import { Truck } from 'lucide-react';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase/config';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../../firebase/errorHandler';
import { useNavigate } from 'react-router-dom';

export const RegisterGestor: React.FC = () => {
  const [nomeEmpresa, setNomeEmpresa] = useState('');
  const [codigoAcesso, setCodigoAcesso] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nomeEmpresa || !codigoAcesso || !email || !password) {
      setError('Preencha todos os campos obrigatórios.');
      return;
    }

    const codigoLimpo = codigoAcesso.toLowerCase().replace(/\s/g, '');
    
    if (codigoLimpo.length < 3) {
      setError('O código de acesso deve ter pelo menos 3 caracteres.');
      return;
    }

    setLoading(true);
    try {
      // 1. Authenticate anonymously just to read the DB securely
      const { signInAnonymously } = await import('firebase/auth');
      await signInAnonymously(auth);

      // 2. Check if codigoAcesso is inherently unique
      const q = query(collection(db, 'empresas'), where('codigoAcesso', '==', codigoLimpo));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        await auth.signOut();
        throw new Error('Este código de acesso já está em uso por outra transportadora. Escolha outro.');
      }

      // We explicitly sign out of the anonymous session to let the new user be created cleanly
      await auth.signOut();

      // 3. Create the Auth user
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCred.user.uid;

      // 3. Set the Firestore document using UID
      await setDoc(doc(db, 'empresas', uid), {
        nomeEmpresa: nomeEmpresa,
        codigoAcesso: codigoLimpo,
        emailGestor: email,
        statusAssinatura: "ativo",
        dataCadastro: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, `empresas/${uid}`);
      });

      // 4. Force hard reload to update context and jump straight into the dashboard cleanly
      window.location.href = '/dashboard';
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('Sua senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Forneça um e-mail válido.');
      } else {
        setError(err.message || 'Erro ao criar conta.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col font-sans p-6 justify-center items-center">
      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-yellow-500 rounded-2xl mx-auto flex items-center justify-center shadow-xl mb-6">
            <Truck className="w-12 h-12 text-gray-900" />
          </div>
          <h1 className="text-3xl font-black text-white uppercase tracking-tight">Criar Conta</h1>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Nova Empresa Gestora</p>
        </div>

        <form onSubmit={handleRegister} className="bg-gray-800 p-8 rounded-3xl border border-gray-700 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase text-gray-400">Nome da Empresa</label>
              <input 
                type="text"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white transition-all placeholder:text-gray-600"
                placeholder="Ex: Construtora Silva"
                value={nomeEmpresa}
                onChange={e => setNomeEmpresa(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-bold uppercase text-gray-400">Código de Acesso da Frota</label>
              <input 
                type="text"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white uppercase placeholder:normal-case transition-all placeholder:text-gray-600"
                placeholder="Ex: silva2026"
                value={codigoAcesso}
                onChange={e => setCodigoAcesso(e.target.value)}
              />
              <p className="text-xs text-gray-500 font-bold mt-1">Sem espaços. Este é o código que seus operadores usarão no celular.</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-sm font-bold uppercase text-gray-400">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-gray-900 border border-gray-600 rounded-xl focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500 text-white transition-all placeholder:text-gray-600"
                placeholder="gestor@empresa.com.br"
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
          </div>

          <Button 
            type="submit"
            className="w-full bg-yellow-500 text-gray-900 hover:bg-yellow-400 font-bold text-lg py-6 uppercase tracking-widest mt-4"
            disabled={loading}
          >
            {loading ? 'Criando Conta...' : 'Criar Conta e Acessar Painel'}
          </Button>

          <div className="text-center mt-6">
            <button 
              type="button" 
              onClick={() => navigate('/manager-login')} 
              className="text-gray-400 hover:text-yellow-500 text-sm font-bold uppercase tracking-widest transition-colors"
            >
              Já tenho conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
