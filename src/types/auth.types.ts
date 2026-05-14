import { UserRole } from '../../generated/prisma/enums.js';

export interface JwtPayload {
  sub: number;
  email: string | null;
  role: UserRole;
  type: 'access';
}

export interface JwtUser {
  id: number;
  email: string | null;
  role: UserRole;
}

export interface PendingJwtPayload {
  sub: number;
  type: 'pending_2fa';
}

export interface ProfileSetupJwtPayload {
  sub: number;
  type: 'profile_setup';
}
