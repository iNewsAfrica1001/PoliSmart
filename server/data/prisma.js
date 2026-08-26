import { PrismaClient } from "@prisma/client";

const globalPrisma = globalThis;
export const prisma = globalPrisma.__polismartPrisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") globalPrisma.__polismartPrisma = prisma;
