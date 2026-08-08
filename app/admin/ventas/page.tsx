import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { obtenerTiposMembresia } from '@/app/actions/membresias';
import { obtenerCajaActiva } from '@/app/actions/caja';
import { obtenerProductos } from '@/app/actions/productos';
import VentasClient from './components/VentasClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function VentasPage({ searchParams }: PageProps) {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a Ventas: Admin o personal con módulo de Ventas
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Ventas');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // 1. Obtener caja activa
  const cajaActiva = await obtenerCajaActiva();

  // 2. Obtener planes de membresías
  const planes = await obtenerTiposMembresia();

  // 3. Obtener métodos de pago activos y asegurar únicamente: Efectivo, Yape, Plin y Stripe
  const { data: rawMetodos } = await supabase
    .from('metodos_pago')
    .select('*')
    .eq('estado', 'ACTIVO')
    .order('id_metodo', { ascending: true });

  const allowedNames = ['Efectivo', 'Yape', 'Plin', 'Stripe'];
  const metodosPago = (rawMetodos || []).filter(m => 
    allowedNames.some(name => name.toLowerCase() === m.nombre.toLowerCase())
  );

  allowedNames.forEach((name, idx) => {
    if (!metodosPago.some(m => m.nombre.toLowerCase() === name.toLowerCase())) {
      metodosPago.push({
        id_metodo: 900 + idx,
        nombre: name,
        estado: 'ACTIVO'
      });
    }
  });

  // 4. Si viene un id_cliente por parámetro de la URL
  const params = await searchParams;
  const preSelectedClientId = params.cliente ? parseInt(params.cliente as string) : null;
  let preSelectedClient = null;

  if (preSelectedClientId && !isNaN(preSelectedClientId)) {
    const { data: client } = await supabase
      .from('clientes')
      .select('*')
      .eq('id_cliente', preSelectedClientId)
      .single();
    preSelectedClient = client;
  }

  // 5. Obtener catálogo de productos
  const productos = await obtenerProductos();

  return (
    <VentasClient
      cajaActiva={cajaActiva}
      planes={planes}
      metodosPago={metodosPago || []}
      preSelectedClient={preSelectedClient}
      productos={productos}
    />
  );
}
