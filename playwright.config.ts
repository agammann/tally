import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'tests/browser',fullyParallel:false,workers:1,timeout:120000,expect:{timeout:20000},use:{baseURL:'http://localhost:3000',trace:'retain-on-failure'},projects:[{name:'chromium-manual',use:{...devices['Desktop Chrome']}}],reporter:[['list'],['json',{outputFile:'work/browser-results.json'}]]});
