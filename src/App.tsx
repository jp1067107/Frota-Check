import React, { useEffect, Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Button } from './components/ui/Button';
import { Truck, Download } from 'lucide-react';
import { processSyncQueue } from './utils/syncQueue';
import { usePWAInstall } from './hooks/usePWAInstall';

const OperatorView = lazy(() => import('./components/operator/OperatorView').then(m => ({ default: m.OperatorView })));
const ManagerDashboard = lazy(() => import('./components/manager/ManagerDashboard').then(m => ({ default: m.ManagerDashboard })));
const OperatorLogin = lazy(() => import('./components/operator/OperatorLogin').then(m => ({ default: m.OperatorLogin })));
const ManagerLogin = lazy(() => import('./components/manager/ManagerLogin').then(m => ({ default: m.ManagerLogin })));
const RegisterGestor = lazy(() => import('./components/manager/RegisterGestor').then(m => ({ default: m.RegisterGestor })));
const PaywallPix = lazy(() => import('./components/PaywallPix').then(m => ({ default: m.PaywallPix })));
const ResetPassword = lazy(() => import('./components/auth/ResetPassword').then(m => ({ default: m.ResetPassword })));

const HomeScreen: React.FC = () => {
  const navigate = useNavigate();
  const { isInstallable, installPWA } = usePWAInstall();

  return (
    <div className="min-h-screen bg-[#09090b] flex flex-col justify-center items-center text-white p-6 font-sans relative overflow-hidden">
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none"></div>

      <div className="w-24 h-24 bg-gradient-to-br from-amber-400 to-amber-600 rounded-3xl flex items-center justify-center shadow-lg shadow-amber-500/20 mb-8 relative z-10">
        <Truck className="w-14 h-14 text-zinc-950" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2 text-center uppercase relative z-10">
        Frota<span className="text-amber-500">Check</span>
      </h1>
      <p className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase mb-12 text-center relative z-10">Sistema de Auditoria em Campo</p>
      
      <div className="flex flex-col gap-4 w-full max-w-sm relative z-10">
        <Button size="lg" className="h-16 text-lg font-black bg-gradient-to-b from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 shadow-lg shadow-amber-500/20 uppercase tracking-widest border-0" onClick={() => navigate('/operator-login')}>
          Acesso Operador
        </Button>
        <Button size="lg" className="h-16 text-lg font-bold bg-[#18181b] border border-white/5 text-zinc-300 hover:text-white hover:bg-white/5 uppercase tracking-widest shadow-inner transition-colors" onClick={() => navigate('/manager-login')}>
          Acesso Gestor
        </Button>
        <Button variant="ghost" size="lg" className="mt-4 h-12 text-[10px] font-bold text-zinc-500 hover:text-white uppercase tracking-widest transition-colors" onClick={() => navigate('/manager-register')}>
          Cadastrar Empresa
        </Button>
        
        {isInstallable && (
          <Button variant="outline" size="lg" className="mt-2 h-14 text-xs font-bold border-amber-500/20 text-amber-500 hover:bg-amber-500/10 uppercase tracking-widest flex items-center justify-center gap-2 transition-colors" onClick={installPWA}>
            <Download className="w-5 h-5" /> Instalar App
          </Button>
        )}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'manager' | 'operator' }) => {
  const { role, empresa, user, initialLoading } = useAuth();
  
  if (initialLoading) return null;
  if (role !== allowedRole) return <Navigate to="/" replace />;
  
  let isExpired = false;
  if (empresa?.assinaturaValidaAte) {
    const validUntil = empresa.assinaturaValidaAte.toDate ? empresa.assinaturaValidaAte.toDate() : new Date(empresa.assinaturaValidaAte);
    isExpired = validUntil < new Date();
  }

  const isMasterAdmin = empresa?.emailGestor === 'jp1067107@gmail.com' || user?.email === 'jp1067107@gmail.com';

  if (!isMasterAdmin && (empresa?.statusAssinatura === 'inativo' || isExpired)) {
    // Both managers and operators should be blocked if the subscription is inactive or expired
    return <PaywallPix email={empresa?.emailGestor || user?.email || ''} role={role} />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { role, loading, initialLoading, logout, empresa } = useAuth();

  useEffect(() => {
    // Tenta sincronizar ao carregar
    processSyncQueue();
    
    // Tenta sincronizar quando a internet voltar
    const handleOnline = () => {
      console.log('App is online. Processing sync queue...');
      processSyncQueue();
    };
    
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="w-16 h-16 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <>
      <Suspense fallback={
        <div className="min-h-screen bg-gray-900 flex justify-center items-center">
          <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route 
            path="/" 
            element={
              role === 'manager' ? <Navigate to="/dashboard" replace /> :
              role === 'operator' ? <Navigate to="/operador" replace /> :
              <HomeScreen />
            } 
          />
          
          <Route path="/manager-login" element={<ManagerLogin />} />
          <Route path="/manager-register" element={<RegisterGestor />} />
          <Route path="/operator-login" element={<OperatorLogin />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/__/auth/action" element={<ResetPassword />} />

          <Route path="/dashboard" element={
            <ProtectedRoute allowedRole="manager">
              <ManagerDashboard />
            </ProtectedRoute>
          } />

          <Route path="/operador" element={
            <ProtectedRoute allowedRole="operator">
              <OperatorView />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
