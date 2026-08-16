import React from 'react';
import Presentacion from './src/presentacion';
import { createClient } from '@/utils/supabase/server';
import { obtenerProductosTienda } from '@/app/actions/stripe';
import { TipoMembresia } from '@/types/gym.types';
import { EquipoMiembro } from '@/types/database.types';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'GestionWeb Gym | Software & Portal de Membresías para Gimnasios',
  description: 'Inscríbete online, consulta tu membresía con pase digital y disfruta del mejor software operativo para centros fitness.'
};

export interface MiembroStaffPreview extends EquipoMiembro {
  equipo_roles?: {
    roles: {
      nombre: string;
    } | null;
  }[];
}

export default async function Home() {
  const supabase = await createClient();
  const [{ data: planes }, productos] = await Promise.all([
    supabase
      .from('tipos_membresia')
      .select('*')
      .eq('estado', 'ACTIVA')
      .order('precio', { ascending: true }),
    obtenerProductosTienda()
  ]);

  const activePlanes = (planes || []) as TipoMembresia[];

  return (
    <Presentacion
      initialPlanes={activePlanes}
      productosDestacados={productos}
    />
  );
}
