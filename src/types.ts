export interface Empresa {
  id: string;
  nomeEmpresa: string;
  codigoAcesso: string;
  emailGestor: string;
  statusAssinatura: 'ativo' | 'inativo';
  assinaturaValidaAte?: any;
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
  ano?: string;
  chassi?: string;
  renavam?: string;
  tipoMaquina?: string; // e.g., Escavadeira, Caminhão, etc.
  horimetroKmAtual?: string;
  proximaRevisao?: string;
  observacoes?: string;
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
