import React, { useState } from 'react';
import { Truck, ArrowLeft } from 'lucide-react';
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
      try {
        await signInAnonymously(auth);
      } catch (anonErr: any) {
        console.error("Erro no login anônimo:", anonErr);
        throw new Error(`Falha ao iniciar verificação segura (Login Anônimo). Verifique se o login Anônimo está ativado no Firebase. Detalhes: ${anonErr.message || anonErr.code}`);
      }

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
      let userCred;
      try {
        userCred = await createUserWithEmailAndPassword(auth, email, password);
      } catch (createErr: any) {
        console.error("Erro na criação de usuário email/senha:", createErr);
        if (createErr.code === 'auth/email-already-in-use') {
          throw new Error('Já existe uma conta cadastrada com este e-mail.');
        } else if (createErr.code === 'auth/weak-password') {
          throw new Error('Sua senha deve ter pelo menos 6 caracteres.');
        } else if (createErr.code === 'auth/invalid-email') {
          throw new Error('Forneça um e-mail válido.');
        }
        throw new Error(`Falha ao criar usuário (E-mail/Senha). Erro do Firebase: ${createErr.code}. ${createErr.code === 'auth/admin-restricted-operation' ? 'A criação de contas está desativada no painel do Firebase.' : ''}`);
      }
      
      const uid = userCred.user.uid;

      // 4. Set the Firestore document using UID
      await setDoc(doc(db, 'empresas', uid), {
        nomeEmpresa: nomeEmpresa,
        codigoAcesso: codigoLimpo,
        emailGestor: email,
        statusAssinatura: "ativo",
        dataCadastro: serverTimestamp()
      }).catch(err => {
        handleFirestoreError(err, OperationType.CREATE, `empresas/${uid}`);
      });

      // 5. Force hard reload to update context and jump straight into the dashboard cleanly
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error("Erro completo processado pelo catch geral:", err);
      
      if (err.message && err.message.includes('Já existe uma conta cadastrada com este e-mail.')) {
        setError(err.message);
      } else if (err.message && err.message.includes('Sua senha deve ter pelo menos')) {
        setError(err.message);
      } else if (err.message && err.message.includes('Forneça um e-mail válido.')) {
        setError(err.message);
      } else if (err.message && err.message.includes('Falha ao')) {
        setError(err.message);
      } else if (err.message && err.message.includes('Este código de acesso')) {
        setError(err.message);
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está cadastrado.');
      } else if (err.code === 'auth/weak-password') {
        setError('Sua senha deve ter pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Forneça um e-mail válido.');
      } else if (err.code === 'auth/admin-restricted-operation') {
        setError('Operação restrita. Verifique as permissões de criação de usuário no painel do Firebase.');
      } else {
        setError(err.message || 'Erro ao criar conta.');
      }
      setLoading(false);
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

      <div className="w-full max-w-md space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 mt-12 md:mt-0 relative z-10">
        
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl mx-auto flex items-center justify-center shadow-lg shadow-amber-500/20 mb-6">
            <Truck className="w-10 h-10 text-zinc-950" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight">Criar Conta</h1>
          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Nova Empresa Gestora</p>
        </div>

        <form onSubmit={handleRegister} className="bg-[#18181b] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Nome da Empresa</label>
              <input 
                type="text"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="Ex: Construtora Silva"
                value={nomeEmpresa}
                onChange={e => setNomeEmpresa(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">Código de Acesso da Frota</label>
              <input 
                type="text"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white uppercase placeholder:normal-case transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="Ex: silva2026"
                value={codigoAcesso}
                onChange={e => setCodigoAcesso(e.target.value)}
              />
              <p className="text-[10px] text-zinc-500 font-bold mt-1">Sem espaços. Este é o código que seus operadores usarão no celular.</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-[10px] font-bold uppercase tracking-widest text-zinc-500">E-mail</label>
              <input 
                type="email"
                className="w-full h-14 px-4 text-lg bg-[#09090b] border border-white/10 rounded-xl focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/50 text-white transition-all placeholder:text-zinc-600 shadow-inner"
                placeholder="gestor@empresa.com.br"
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
            </div>
          </div>

          <Button 
            type="submit"
            className="w-full bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-bold text-lg py-6 uppercase tracking-widest mt-4 shadow-lg shadow-amber-500/20 active:scale-[0.98] transition-all border-0"
            disabled={loading}
          >
            {loading ? 'Criando Conta...' : 'Criar Conta e Acessar'}
          </Button>

          <div className="text-center mt-6">
            <button 
              type="button" 
              onClick={() => navigate('/manager-login')} 
              className="text-zinc-400 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors"
            >
              Já tenho conta
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
