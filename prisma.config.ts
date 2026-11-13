import './scripts/env';
import {defineConfig} from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {path: 'prisma/migrations'},
  // Generation and container builds do not require database credentials.
  // Prisma requires this URL when a database command is actually run.
  datasource: {url: process.env.DATABASE_URL},
});
