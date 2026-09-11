import {PrismaClient} from '@prisma/client';
const g=globalThis as unknown as {tallyDb?:PrismaClient};
export const db=g.tallyDb??new PrismaClient({log:[]});
g.tallyDb=db;
