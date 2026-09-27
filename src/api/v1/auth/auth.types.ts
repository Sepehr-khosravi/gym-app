export interface CreateUserInput {
  clubId: string;

  phone: string;

  firstName: string;
  lastName: string;

  nationalId: string;
  birthDate: Date;

  /**
   * Temporary registration expiration.
   *
   * New users created during registration receive
   * an expiration time. Once the payment succeeds,
   * this value is cleared.
   */
  verificationExpiresAt?: Date;
}

export interface CreateSessionInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}