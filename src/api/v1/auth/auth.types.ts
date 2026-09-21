export interface CreateUserInput {
  clubId: string;
  phone: string;
  firstName: string;
  lastName: string;
  nationalId: string;
  birthDate: Date;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface AuthenticatedUser {
  id: string;
  phone: string;
  firstName: string;
  lastName: string;
  status: string;
  roles: string[];
}