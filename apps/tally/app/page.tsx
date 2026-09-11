import {headers} from 'next/headers';import {redirect} from 'next/navigation';import {owner} from '../lib/auth';import Dashboard from '../components/dashboard';
export const dynamic='force-dynamic';
export default async function Page(){try{await owner(await headers());}catch{redirect('/login');}return <Dashboard/>;}
