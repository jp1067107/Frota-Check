export interface Empresa {
  id: string;
  nome: string;
  emailGestor: string;
  statusAssinatura: 'ativo' | 'inativo';
}

export interface Machine {
  id: string; // The firestore doc ID
  name: string;
  pin?: string;
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
