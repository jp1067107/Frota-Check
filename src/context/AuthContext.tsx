import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { Empresa } from '../types';

interface OperatorData {
  empresaId: string;
  operadorId: string; // The selected operator doc ID
  nomeOperador: string;
}

interface AuthContextType {
  user: User | null;
  empresa: Empresa | null;
  operatorData: OperatorData | null;
  role: 'manager' | 'operator' | null;
  loading: boolean;
  initialLoading: boolean;
  loginManager: (e: string, p: string) => Promise<void>;
  loginOperator: (eId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  empresa: null,
  operatorData: null,
  role: null,
  loading: false,
  initialLoading: true,
  loginManager: async () => {},
  loginOperator: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [operatorData, setOperatorData] = useState<OperatorData | null>(null);
  const [role, setRole] = useState<'manager' | 'operator' | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const isLoggingInOperator = React.useRef(false);

  useEffect(() => {
    // Initial check for operator in localStorage
    const storedOperator = localStorage.getItem('operatorData');
    if (storedOperator) {
      try {
        const parsed = JSON.parse(storedOperator);
        if (parsed.empresaId && parsed.operadorId) {
          setOperatorData(parsed);
          setRole('operator');
        }
      } catch (e) {}
    }

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser && !currentUser.isAnonymous) {
        // Manager flow
        try {
          let foundEmpresa: Empresa | null = null;
          const empDoc = await getDoc(doc(db, 'empresas', currentUser.uid));
          
          if (empDoc.exists()) {
            foundEmpresa = { id: empDoc.id, ...empDoc.data() } as Empresa;
          } else {
            const q = query(collection(db, 'empresas'), where('emailGestor', '==', currentUser.email));
            const snap = await getDocs(q);
            if (!snap.empty) {
              foundEmpresa = { id: snap.docs[0].id, ...snap.docs[0].data() } as Empresa;
            } else {
              // Auto-create recovery
              console.log("No empresa found, auto-creating recovery record...");
              const codigoAcesso = `EMP-${currentUser.uid.substring(0, 5).toUpperCase()}`;
              const newEmpresa = {
                nomeEmpresa: `Empresa Recuperada`,
                codigoAcesso: codigoAcesso,
                emailGestor: currentUser.email,
                statusAssinatura: "inativo", // Força recarga em recovery
                dataCadastro: serverTimestamp()
              };
              
              await setDoc(doc(db, 'empresas', currentUser.uid), newEmpresa);
              foundEmpresa = { id: currentUser.uid, ...newEmpresa } as Empresa;
            }
          }
          setEmpresa(foundEmpresa);
        } catch (e) {
          console.error("Error fetching/creating empresa", e);
        }
        setRole('manager');
      } else if (currentUser && currentUser.isAnonymous) {
        // Anonymous user check.
        if (isLoggingInOperator.current) {
          // Let loginOperator handle state changes and loading=false
          setInitialLoading(false);
          return;
        }
        
        // Restore from storage if available
        const storedOperator = localStorage.getItem('operatorData');
        if (storedOperator) {
          try {
            const parsed = JSON.parse(storedOperator);
            setOperatorData(parsed);
            setRole('operator');
          } catch (e) {}
        } else {
          // Anonymous user without operator data? Logout just in case.
          signOut(auth);
          setRole(null);
        }
      } else {
        // Not logged in
        setRole(null);
        setEmpresa(null);
        setOperatorData(null);
      }
      
      setInitialLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch empresa for operator when operatorData is set
  useEffect(() => {
    const fetchOperatorEmpresa = async () => {
      if (role === 'operator' && operatorData?.empresaId) {
        setLoading(true);
        try {
          const empDoc = await getDoc(doc(db, 'empresas', operatorData.empresaId));
          if (empDoc.exists()) {
            setEmpresa({ id: empDoc.id, ...empDoc.data() } as Empresa);
          } else {
            logout();
          }
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }
    };
    fetchOperatorEmpresa();
  }, [operatorData?.empresaId, role]);

  const loginManager = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const currentUser = cred.user;
      
      try {
        let foundEmpresa: Empresa | null = null;
        const empDoc = await getDoc(doc(db, 'empresas', currentUser.uid));
        
        if (empDoc.exists()) {
          foundEmpresa = { id: empDoc.id, ...empDoc.data() } as Empresa;
        } else {
          const q = query(collection(db, 'empresas'), where('emailGestor', '==', currentUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            foundEmpresa = { id: snap.docs[0].id, ...snap.docs[0].data() } as Empresa;
          } else {
            // Auto-create recovery
            console.log("No empresa found, auto-creating recovery record...");
            const codigoAcesso = `emp-${currentUser.uid.substring(0, 5).toLowerCase()}`;
            const newEmpresa = {
              nomeEmpresa: `Empresa Recuperada`,
              codigoAcesso: codigoAcesso,
              emailGestor: currentUser.email,
              statusAssinatura: "inativo", // Força recarga em recovery
              dataCadastro: serverTimestamp()
            };
            
            await setDoc(doc(db, 'empresas', currentUser.uid), newEmpresa);
            foundEmpresa = { id: currentUser.uid, ...newEmpresa } as Empresa;
          }
        }
        setEmpresa(foundEmpresa);
      } catch (e) {
        console.error("Error fetching/creating empresa", e);
      }
      setRole('manager');
      setLoading(false);
    } catch (e) {
      setLoading(false);
      throw e;
    }
  };

  const loginOperator = async (codigoAcesso: string, pin: string) => {
    isLoggingInOperator.current = true;
    setLoading(true);
    try {
      await signInAnonymously(auth);

      const codigoLimpo = codigoAcesso.replace(/\s/g, '');
      let qE = query(collection(db, 'empresas'), where('codigoAcesso', '==', codigoLimpo.toLowerCase()));
      let snapE = await getDocs(qE);
      
      if (snapE.empty) {
        qE = query(collection(db, 'empresas'), where('codigoAcesso', '==', codigoLimpo.toUpperCase()));
        snapE = await getDocs(qE);
      }
      
      if (snapE.empty) {
        // Fallback exact match just in case
        qE = query(collection(db, 'empresas'), where('codigoAcesso', '==', codigoLimpo));
        snapE = await getDocs(qE);
      }
      
      if (snapE.empty) {
        // Ultimato fallback: fetch all and find client side (only if small scale, but better safe than sorry if case is very messy)
        const allEmpresas = await getDocs(collection(db, 'empresas'));
        const found = allEmpresas.docs.find(d => {
          const data = d.data();
          return data.codigoAcesso && data.codigoAcesso.toLowerCase() === codigoLimpo.toLowerCase();
        });
        
        if (found) {
          snapE = { empty: false, docs: [found] } as any;
        } else {
          throw new Error('Empresa não encontrada com esse Código de Acesso.');
        }
      }
      
      const empDoc = snapE.docs[0];
      const empresaId = empDoc.id;
      const empData = empDoc.data() as Empresa;
      
      if (empData.statusAssinatura === 'inativo' && empData.emailGestor !== 'jp1067107@gmail.com') {
        throw new Error('Sistema temporariamente bloqueado. Contate o gestor da frota.');
      }

      // Check if operator pin exists
      const qOp = query(collection(db, 'operadores'), where('empresaId', '==', empresaId), where('pin', '==', pin), where('status', '==', 'ativo'));
      const snapOp = await getDocs(qOp);
      
      if (snapOp.empty) {
        throw new Error('Operador não encontrado com este PIN, ou seu acesso está desativado.');
      }

      const opDoc = snapOp.docs[0];
      const opDataObj = opDoc.data();

      const opData = { empresaId, operadorId: opDoc.id, nomeOperador: opDataObj.nome };
      localStorage.setItem('operatorData', JSON.stringify(opData));
      setOperatorData(opData);
      setRole('operator');
      setEmpresa({ id: empresaId, ...empData });
      setLoading(false);
      isLoggingInOperator.current = false;
    } catch (err) {
      isLoggingInOperator.current = false;
      await signOut(auth);
      setLoading(false);
      throw err;
    }
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('operatorData');
    setOperatorData(null);
    setRole(null);
    setEmpresa(null);
  };

  return (
    <AuthContext.Provider value={{ user, empresa, operatorData, role, loading, initialLoading, loginManager, loginOperator, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
