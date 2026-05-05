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
    <div className="min-h-screen bg-gray-900 flex flex-col justify-center items-center text-white p-6 font-sans">
      <div className="w-24 h-24 bg-yellow-500 rounded-3xl flex items-center justify-center shadow-2xl mb-8">
        <Truck className="w-14 h-14 text-gray-900" />
      </div>
      <h1 className="text-4xl sm:text-5xl font-black tracking-tighter text-yellow-500 mb-2 text-center uppercase">FROTA CHECK</h1>
      <p className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-12 text-center">Sistema de Auditoria em Campo</p>
      
      <div className="flex flex-col gap-4 w-full max-w-sm">
        <Button size="lg" className="h-16 text-lg font-black bg-yellow-500 text-gray-900 border-b-4 border-yellow-600 hover:bg-yellow-400 uppercase tracking-widest" onClick={() => navigate('/operator-login')}>
          Acesso Operador
        </Button>
        <Button size="lg" className="h-16 text-lg font-bold bg-transparent border-2 border-gray-700 text-gray-400 hover:border-gray-500 hover:bg-gray-800 uppercase tracking-widest" onClick={() => navigate('/manager-login')}>
          Acesso Gestor
        </Button>
        <Button variant="ghost" size="lg" className="mt-4 h-12 text-sm font-bold text-gray-500 hover:text-yellow-500 uppercase tracking-widest" onClick={() => navigate('/manager-register')}>
          Cadastrar Empresa
        </Button>
        
        {isInstallable && (
          <Button variant="outline" size="lg" className="mt-2 h-14 text-sm font-bold border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10 uppercase tracking-widest flex items-center justify-center gap-2" onClick={installPWA}>
            <Download className="w-5 h-5" /> Instalar App
          </Button>
        )}
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children, allowedRole }: { children: React.ReactNode; allowedRole: 'manager' | 'operator' }) => {
  const { role, empresa, user, loading } = useAuth();
  
  if (loading) return null;
  if (role !== allowedRole) return <Navigate to="/" replace />;
  
  if (role === 'manager' && empresa?.statusAssinatura === 'inativo') {
    return <PaywallPix email={user?.email || ''} />;
  }
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
  const { role, loading, logout, empresa } = useAuth();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex justify-center items-center">
        <div className="w-16 h-16 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
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
