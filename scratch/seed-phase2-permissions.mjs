import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const newPermisos = [
  {
    codigo: 'Recepcion',
    descripcion: 'Módulo de Recepción y Control de Acceso (Front Desk)',
    modulo: 'Recepcion'
  },
  {
    codigo: 'Ventas',
    descripcion: 'Módulo de Venta y Punto de Cobro (Checkout)',
    modulo: 'Ventas'
  },
  {
    codigo: 'Caja',
    descripcion: 'Módulo de Arqueo de Caja (Shift Manager)',
    modulo: 'Caja'
  },
  {
    codigo: 'CRM',
    descripcion: 'Módulo CRM y Retención (Call Center)',
    modulo: 'CRM'
  },
  {
    codigo: 'Finanzas',
    descripcion: 'Panel de Control Financiero y Gestión de Gastos (Dashboard Gerencial)',
    modulo: 'Finanzas'
  }
];

async function seed() {
  console.log('Sembrando nuevos permisos para la Fase 2...');
  
  for (const perm of newPermisos) {
    const { data: existing } = await supabase
      .from('permisos')
      .select('id_permiso')
      .eq('codigo', perm.codigo)
      .maybeSingle();
      
    if (existing) {
      console.log(`Permiso "${perm.codigo}" ya existe.`);
    } else {
      const { error } = await supabase
        .from('permisos')
        .insert(perm);
        
      if (error) {
        console.error(`Error al insertar "${perm.codigo}":`, error);
      } else {
        console.log(`Permiso "${perm.codigo}" insertado con éxito.`);
      }
    }
  }
}

seed();
