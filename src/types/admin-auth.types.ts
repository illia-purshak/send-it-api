export interface AdminJwtPayload {
  sub: number;
  email: string;
  isSuperAdmin: boolean;
  entityType: 'admin';
  type: 'access';
}

export interface AdminJwtUser {
  id: number;
  email: string;
  isSuperAdmin: boolean;
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
  isSuperAdmin: boolean;
  entityType: 'admin';
  type: 'setup_required';
}
