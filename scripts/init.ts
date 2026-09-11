import {randomBytes} from 'node:crypto';import {existsSync,writeFileSync,copyFileSync} from 'node:fs';
if(existsSync('.env')){console.log('.env already exists; left unchanged.');process.exit(0);}
const pw=randomBytes(24).toString('hex');const auth=randomBytes(32).toString('hex');const setup=randomBytes(24).toString('hex');
writeFileSync('.env',`POSTGRES_PASSWORD=${pw}\nDATABASE_URL=postgresql://tally:${pw}@127.0.0.1:55487/tally?schema=public\nBETTER_AUTH_SECRET=${auth}\nBETTER_AUTH_URL=http://localhost:3000\nSETUP_TOKEN=${setup}\nNEXT_TELEMETRY_DISABLED=1\n`,{mode:0o600});
copyFileSync('.env','apps/tally/.env.local');console.log('Created .env and dashboard local environment. Read SETUP_TOKEN locally for first-owner setup. Secrets were not printed.');
