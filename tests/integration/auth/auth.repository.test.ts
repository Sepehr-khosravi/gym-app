import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";

import { AuthRepository } from "../../../src/api/v1/auth/auth.repository";

import {
  testPrisma,
  clearDatabase,
} from "../../setup/prisma";

import {
  createTestClub,
  seedRoles,
} from "../../setup/test-helpers";

describe("AuthRepository", () => {
  const repository =
    new AuthRepository(testPrisma);

  let clubId: string;

  beforeAll(async () => {
    await testPrisma.$connect();

    await clearDatabase();

    const club =
      await createTestClub();

    clubId = club.id;

    await seedRoles();
  });

  beforeEach(async () => {
    await testPrisma.session.deleteMany();
    await testPrisma.userRole.deleteMany();
    await testPrisma.user.deleteMany();
  });

  afterAll(async () => {
    await testPrisma.$disconnect();
  });

  it("finds a user by phone", async () => {
    await repository.createUser({
      clubId,
      phone: "09120000000",
      firstName: "Ali",
      lastName: "Test",
      nationalId: "0012345678",
      birthDate: new Date(
        "2008-01-01",
      ),
    });

    const user =
      await repository.findUserByPhone(
        "09120000000",
      );

    expect(user).not.toBeNull();

    expect(user?.phone).toBe(
      "09120000000",
    );
  });

  it("creates a new user with MEMBER role", async () => {
    const user =
      await repository.createUser({
        clubId,
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate: new Date(
          "2008-01-01",
        ),
      });

    expect(user.roles).toHaveLength(1);

    expect(
      user.roles[0].role.name,
    ).toBe("MEMBER");
  });

  it("creates a session", async () => {
    const user =
      await repository.createUser({
        clubId,
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate: new Date(
          "2008-01-01",
        ),
      });

    const session =
      await repository.createSession({
        userId: user.id,
        tokenHash: "hash-123",
        expiresAt: new Date(
          Date.now() + 60_000,
        ),
      });

    expect(session.userId).toBe(
      user.id,
    );
  });

  it("finds a valid session", async () => {
    const user =
      await repository.createUser({
        clubId,
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate: new Date(
          "2008-01-01",
        ),
      });

    await repository.createSession({
      userId: user.id,
      tokenHash: "hash-123",
      expiresAt: new Date(
        Date.now() + 60_000,
      ),
    });

    const session =
      await repository.findValidSession(
        "hash-123",
      );

    expect(session).not.toBeNull();

    expect(
      session?.user.id,
    ).toBe(user.id);
  });

  it("does not return expired sessions", async () => {
    const user =
      await repository.createUser({
        clubId,
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate: new Date(
          "2008-01-01",
        ),
      });

    await repository.createSession({
      userId: user.id,
      tokenHash: "expired-hash",
      expiresAt: new Date(
        Date.now() - 60_000,
      ),
    });

    const session =
      await repository.findValidSession(
        "expired-hash",
      );

    expect(session).toBeNull();
  });

  it("revokes a session", async () => {
    const user =
      await repository.createUser({
        clubId,
        phone: "09120000000",
        firstName: "Ali",
        lastName: "Test",
        nationalId: "0012345678",
        birthDate: new Date(
          "2008-01-01",
        ),
      });

    await repository.createSession({
      userId: user.id,
      tokenHash: "hash-123",
      expiresAt: new Date(
        Date.now() + 60_000,
      ),
    });

    await repository.revokeSession(
      "hash-123",
    );

    const session =
      await repository.findValidSession(
        "hash-123",
      );

    expect(session).toBeNull();
  });
});