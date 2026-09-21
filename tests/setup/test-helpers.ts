import { randomUUID } from "node:crypto";

import { testPrisma } from "./prisma";

export async function createTestClub() {
  return testPrisma.club.create({
    data: {
      id: randomUUID(),
      name: `Test Club ${randomUUID()}`,
    },
  });
}

export async function seedRoles() {
  const roles = [
    "SUPER_ADMIN",
    "ADMIN",
    "RECEPTIONIST",
    "ACCOUNTANT",
    "COACH",
    "MEMBER",
  ] as const;

  for (const name of roles) {
    await testPrisma.role.upsert({
      where: {
        name,
      },
      update: {},
      create: {
        name,
      },
    });
  }
}

export async function createTestUser(
  clubId: string,
) {
  const memberRole =
    await testPrisma.role.findUniqueOrThrow({
      where: {
        name: "MEMBER",
      },
    });

  return testPrisma.user.create({
    data: {
      clubId,
      firstName: "Test",
      lastName: "User",
      phone: "09120000001",
      nationalId: "0012345678",
      birthDate: new Date("2000-01-01"),

      roles: {
        create: {
          roleId: memberRole.id,
        },
      },
    },

    include: {
      roles: {
        include: {
          role: true,
        },
      },
    },
  });
}