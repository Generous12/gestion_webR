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
  const esAdmin = user.usuario === 'admin' || user.roles?.includes('Super Admin') || user.roles?.includes('Administrador') || user.roles?.includes('Admin');
  const tieneAcceso = esAdmin || user.modulos?.includes('Ventas') || user.permisos?.includes('Ventas');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const supabase = await createClient();
  const params = await searchParams;
  const preSelectedClientId = params.cliente ? parseInt(params.cliente as string) : null;

  // Ejecutar todas las consultas en paralelo simultáneamente (Promise.all)
  const [cajaActiva, planes, { data: rawMetodos }, productos, preSelectedClientRes] = await Promise.all([
    obtenerCajaActiva(),
    obtenerTiposMembresia(),
    supabase
      .from('metodos_pago')
      .select('*')
      .eq('estado', 'ACTIVO')
      .order('id_metodo', { ascending: true }),
    obtenerProductos(),
    preSelectedClientId && !isNaN(preSelectedClientId)
      ? supabase.from('clientes').select('*').eq('id_cliente', preSelectedClientId).maybeSingle()
      : Promise.resolve({ data: null })
  ]);

  const allowedNames = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'];
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

  const preSelectedClient = preSelectedClientRes?.data || null;

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
