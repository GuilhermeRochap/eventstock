import { Request } from 'express';

export interface AuthenticatedUser {
  userId: string;
  role: string;
  companyId: string | null;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
// Evitando problemas de tipagem, criamos uma interface que estende a interface Request do Express,
// adicionando a propriedade user,
// que contém as informações do usuário autenticado.
