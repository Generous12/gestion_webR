import React from 'react';
import { createClient } from '@/utils/supabase/server';
import CheckoutClient from './components/CheckoutClient';
import { TipoMembresia } from '@/types/gym.types';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Inscripción Online | Únete a Nuestro Gimnasio',
  description: 'Adquiere tu membresía de gimnasio online con pago seguro por tarjeta Stripe y obtén tu pase digital al instante.'
};

interface UnetePageProps {
  searchParams: Promise<{ plan?: string }>;
}

export default async function UnetePage({ searchParams }: UnetePageProps) {
  const resolvedSearchParams = await searchParams;
  const initialPlanId = resolvedSearchParams.plan ? parseInt(resolvedSearchParams.plan) : undefined;

  const supabase = await createClient();
  const { data: planes } = await supabase
    .from('tipos_membresia')
    .select('*')
    .eq('estado', 'ACTIVA')
    .order('precio', { ascending: true });

  const activePlanes = (planes || []) as TipoMembresia[];

  return (
    <CheckoutClient
      planes={activePlanes}
      initialSelectedPlanId={initialPlanId}
    />
  );
}
