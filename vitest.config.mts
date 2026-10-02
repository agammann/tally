import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['tests/**/*.test.ts'],testTimeout:15000},resolve:{alias:{'@tally-local/shared':new URL('./packages/shared/src/index.ts',import.meta.url).pathname.replace(/^\/(\w:)/,'$1')}}});
