export interface CreateUserInput {
  clubId: string;
  phone: string;
  firstName?: string | null;
  lastName?: string | null;
  nationalId?: string | null;
  birthDate?: Date | null;
  verificationExpiresAt?: Date;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}