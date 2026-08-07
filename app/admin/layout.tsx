import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import AdminLayoutClient, { AdminLayoutClientProps } from './components/AdminLayoutClient';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSesionActual();

  // Si no hay sesión válida, redirigir al login
  if (!user) {
    redirect('/login');
  }

  return (
    <AdminLayoutClient user={user as unknown as AdminLayoutClientProps['user']}>
      {children}
    </AdminLayoutClient>
  );
}
