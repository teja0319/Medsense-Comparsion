import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function Home() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  redirect('/projects/857d529e-75cf-4210-bea3-ca023a15ed1d');
}
