import { PrismaClient } from "@prisma/client";

export const testPrisma = new PrismaClient();

export async function clearDatabase() {
  await testPrisma.$transaction([
    testPrisma.session.deleteMany(),
    testPrisma.userRole.deleteMany(),
    testPrisma.role.deleteMany(),
    testPrisma.user.deleteMany(),
    testPrisma.club.deleteMany(),
  ]);
}

export async function disconnectPrisma() {
  await testPrisma.$disconnect();
}