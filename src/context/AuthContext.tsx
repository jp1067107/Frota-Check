import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, signInWithEmailAndPassword, signOut, signInAnonymously } from 'firebase/auth';
import { auth, db } from '../firebase/config';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { Empresa } from '../types';

interface OperatorData {
  empresaId: string;
  operadorId: string; // the PIN
}

interface AuthContextType {
  user: User | null;
  empresa: Empresa | null;
  operatorData: OperatorData | null;
  role: 'manager' | 'operator' | null;
  loading: boolean;
  loginManager: (e: string, p: string) => Promise<void>;
  loginOperator: (eId: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  empresa: null,
  operatorData: null,
  role: null,
  loading: true,
  loginManager: async () => {},
  loginOperator: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [empresa, setEmpresa] = useState<Empresa | null>(null);
  const [operatorData, setOperatorData] = useState<OperatorData | null>(null);
  const [role, setRole] = useState<'manager' | 'operator' | null>(null);
  const [loading, setLoading] = useState(true);

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
          const q = query(collection(db, 'empresas'), where('emailGestor', '==', currentUser.email));
          const snap = await getDocs(q);
          if (!snap.empty) {
            setEmpresa({ id: snap.docs[0].id, ...snap.docs[0].data() } as Empresa);
          }
        } catch (e) {
          console.error("Error fetching empresa", e);
        }
        setRole('manager');
      } else if (currentUser && currentUser.isAnonymous) {
        // Anonymous user check. Let the operator useEffect handle the rest.
        // We only set user, not role. Role comes from operatorData.
      } else if (role === 'manager') {
        // If they were a manager and logged out
        setRole(null);
        setEmpresa(null);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Fetch empresa for operator when operatorData is set
  useEffect(() => {
    const fetchOperatorEmpresa = async () => {
      if (role === 'operator' && operatorData) {
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
  }, [operatorData, role]);

  const loginManager = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const loginOperator = async (empresaId: string, pin: string) => {
    setLoading(true);
    try {
      await signInAnonymously(auth);

      const empDoc = await getDoc(doc(db, 'empresas', empresaId));
      if (!empDoc.exists()) {
        throw new Error('Empresa não encontrada.');
      }
      const empData = empDoc.data() as Empresa;
      if (empData.statusAssinatura === 'inativo') {
        throw new Error('Sistema temporariamente bloqueado. Contate o gestor da frota.');
      }

      // Check if operator pin exists via getDoc using predictable ID
      const opDoc = await getDoc(doc(db, 'operadores', `${empresaId}_${pin}`));
      
      if (!opDoc.exists()) {
        throw new Error('Operador não encontrado com este PIN.');
      }

      const opData = { empresaId, operadorId: pin };
      localStorage.setItem('operatorData', JSON.stringify(opData));
      setOperatorData(opData);
      setRole('operator');
      setEmpresa({ id: empDoc.id, ...empData });
    } catch (err) {
      await signOut(auth);
      throw err;
    } finally {
      setLoading(false);
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
    <AuthContext.Provider value={{ user, empresa, operatorData, role, loading, loginManager, loginOperator, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
