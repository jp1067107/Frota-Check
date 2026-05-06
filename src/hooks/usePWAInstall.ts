import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsInstalled(true);
      setIsInstallable(false);
    }

    if ((window as any).deferredPWAEvent) {
      setDeferredPrompt((window as any).deferredPWAEvent);
      setIsInstallable(true);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      console.log('PWA: beforeinstallprompt event fired');
      e.preventDefault();
      (window as any).deferredPWAEvent = e;
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      console.log('INSTALL: Success');
      setIsInstallable(false);
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const installPWA = async () => {
    if (isIOS) {
      alert('Para instalar no iOS:\n\n1. Toque no botão "Compartilhar" (ícone com uma seta para cima)\n2. Role para baixo e selecione "Adicionar à Tela de Início"');
      return;
    }

    if (!deferredPrompt) {
      alert('Para instalar:\n\nAbra o menu do seu navegador (geralmente os três pontinhos no canto superior) e procure a opção "Adicionar à Tela Inicial" ou "Instalar Aplicativo".');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    setDeferredPrompt(null);
    (window as any).deferredPWAEvent = null;
    setIsInstallable(false);
  };

  return { isInstallable, isInstalled, installPWA };
}


