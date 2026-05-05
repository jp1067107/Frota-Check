declare module 'virtual:pwa-register' {
  export interface RegisterSWOptions {
    immediate?: boolean;
    onNeedRefresh?: () => void;
    onOfflineReady?: () => void;
    onRegistered?: (registration: ServiceWorkerRegistration | undefined) => void;
    onRegisterError?: (error: any) => void;
  }
  export function registerSW(options?: RegisterSWOptions): (reloadPage?: boolean) => Promise<void>;
}

export interface Empresa {
  id: string;
  nomeEmpresa: string;
  codigoAcesso: string;
  emailGestor: string;
  statusAssinatura: 'ativo' | 'inativo';
}

export interface Operador {
  id: string;
  nome: string;
  pin: string;
  empresaId: string;
  status: 'ativo' | 'inativo';
  createdAt?: any;
}

export interface Machine {
  id: string; // The firestore doc ID
  name: string;
  placa?: string;
  status: 'active' | 'maintenance' | 'pendente';
  createdAt: any;
  updatedAt: any;
  empresaId: string;
}

export interface Checklist {
  id?: string;
  maquinaId: string;
  maquinaNome: string;
  operadorId: string;
  operadorNome?: string;
  dataHora: any;
  status: 'liberada' | 'pendente' | 'manutencao';
  fotos: {
    painel: string;
    oleo: string;
    radiador: string;
  };
  userId: string;
  empresaId: string;
}

export interface UserRole {
  isAdmin: boolean;
  email: string;
}
