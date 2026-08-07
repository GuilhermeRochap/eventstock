import { SetMetadata } from '@nestjs/common';

// identifico as funções que podem ser executadas por cada tipo de usuário, para isso criei um decorator chamado Roles, que recebe como parâmetro um array de strings com os tipos de usuários que podem acessar a rota.
export type Role = 'admin' | 'manager' | 'user';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
