import { AdminRole } from '../../generated/prisma/enums.js';

export interface AdminJwtPayload {
  sub: number;
  email: string;
  role: AdminRole;
  entityType: 'admin';
  type: 'access';
}

export interface AdminJwtUser {
  id: number;
  email: string;
  role: AdminRole;
  type: 'access' | 'setup_required';
}

export interface AdminPendingJwtPayload {
  sub: number;
  entityType: 'admin';
  type: 'pending_2fa';
}

export interface AdminSetupRequiredJwtPayload {
  sub: number;
  email: string;
  role: AdminRole;
  entityType: 'admin';
  type: 'setup_required';
}
