import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { obtenerCategoriasGasto, obtenerGastosProgramados } from '@/app/actions/gastos';
import { obtenerCajaActiva } from '@/app/actions/caja';
import FinanzasClient from './components/FinanzasClient';

export default async function FinanzasPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a Finanzas (solo Admin o usuarios con permiso Finanzas)
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Finanzas');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  const supabase = await createClient();

  // 1. Obtener caja activa para permitir pagos
  const cajaActiva = await obtenerCajaActiva();

  // 2. Obtener gastos programados y categorías
  const gastos = await obtenerGastosProgramados();
  const categorias = await obtenerCategoriasGasto();

  // 3. Obtener distribución de cobros por método de pago
  const { data: pagosData } = await supabase
    .from('pagos')
    .select('monto, metodos_pago(nombre)')
    .eq('estado', 'CONFIRMADO');

  // 4. Obtener todos los movimientos financieros históricos para el gráfico evolutivo
  const { data: movimientosData } = await supabase
    .from('movimientos_caja')
    .select('monto, tipo, fecha')
    .order('fecha', { ascending: true });

  return (
    <FinanzasClient
      cajaActiva={cajaActiva}
      gastos={gastos}
      categorias={categorias}
      pagosData={pagosData || []}
      movimientosData={movimientosData || []}
    />
  );
}
