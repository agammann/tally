import {createDb, type PrismaClient} from '../../../prisma/client';
const g=globalThis as unknown as {tallyDb?:PrismaClient};
export const db=g.tallyDb??createDb();
g.tallyDb=db;
