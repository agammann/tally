import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from './generated/client/client';

export {Prisma, PrismaClient} from './generated/client/client';

export function createDb(connectionString = process.env.DATABASE_URL) {
  // Next imports server modules while building without database credentials.
  // Validate when connecting so pg can never fall back to its local defaults.
  const adapter = {
    provider: 'postgres' as const,
    adapterName: '@prisma/adapter-pg',
    async connect() {
      if (!connectionString) throw new Error('DATABASE_URL is required');
      let url: URL;
      try { url = new URL(connectionString); }
      catch { throw new Error('DATABASE_URL must be a PostgreSQL URL'); }
      if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/') {
        throw new Error('DATABASE_URL must be a PostgreSQL URL');
      }
      const schema = url.searchParams.get('schema') ?? 'public';
      url.searchParams.delete('schema');
      // Prisma's schema option qualifies ORM queries. Set the same search_path
      // for raw SQL, quoting the identifier and escaping PostgreSQL startup args.
      const searchPath = `"${schema.replaceAll('"', '""')}"`.replace(/([\\\s])/g, '\\$1');
      url.searchParams.set('options', `${url.searchParams.get('options') ?? ''} -c search_path=${searchPath}`.trim());
      return new PrismaPg({
        connectionString: url.toString(),
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 300_000,
      }, {schema}).connect();
    },
  };
  return new PrismaClient({adapter, log: []});
}
