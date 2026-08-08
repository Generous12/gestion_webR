import React from 'react';
import { getSesionActual } from '@/app/actions/auth';
import { redirect } from 'next/navigation';
import { obtenerCajaActiva, obtenerMovimientosCaja, obtenerHistorialCajas, obtenerCajasAbiertas } from '@/app/actions/caja';
import { MovimientoCaja } from '@/types/gym.types';
import CajaClient from './components/CajaClient';

export default async function CajaPage() {
  const user = await getSesionActual();
  if (!user) {
    redirect('/login');
  }

  // Verificar acceso a Caja
  const tieneAcceso = user.usuario === 'admin' || user.modulos?.includes('Caja');
  if (!tieneAcceso) {
    redirect('/admin');
  }

  // 1. Obtener caja activa
  const cajaActiva = await obtenerCajaActiva();
  
  // 2. Obtener movimientos si hay caja abierta
  let movimientos: MovimientoCaja[] = [];
  if (cajaActiva) {
    movimientos = await obtenerMovimientosCaja(cajaActiva.id_caja);
  }

  // 3. Obtener historial completo de cajas y todas las cajas abiertas en el sistema
  const historialCajas = await obtenerHistorialCajas(50);
  const cajasAbiertas = await obtenerCajasAbiertas();

  const esAdmin = user.usuario === 'admin' 
    || user.roles?.includes('Super Admin') 
    || user.roles?.includes('Administrador');

  return (
    <CajaClient
      cajaActiva={cajaActiva}
      movimientos={movimientos}
      historialCajas={historialCajas}
      cajasAbiertas={cajasAbiertas}
      currentUser={{
        id_usuario: user.id_usuario,
        usuario: user.usuario,
        esAdmin
      }}
    />
  );
}
