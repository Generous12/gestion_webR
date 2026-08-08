import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function addPlanesPermission() {
  console.log('Insertando permiso de "Planes"...');
  
  const perm = {
    codigo: 'Planes',
    descripcion: 'Módulo de Gestión de Planes y Tipos de Membresía',
    modulo: 'Planes'
  };

  const { data: existing } = await supabase
    .from('permisos')
    .select('id_permiso')
    .eq('codigo', perm.codigo)
    .maybeSingle();

  if (existing) {
    console.log('El permiso de "Planes" ya existe.');
  } else {
    const { data: inserted, error } = await supabase
      .from('permisos')
      .insert(perm)
      .select()
      .single();

    if (error) {
      console.error('Error al insertar el permiso:', error);
      return;
    }

    console.log('Permiso de "Planes" insertado con éxito.');

    // Asignarlo también al rol Administrador (ID 1)
    if (inserted) {
      const { error: errRol } = await supabase
        .from('roles_permisos')
        .insert({
          id_rol: 1,
          id_permiso: inserted.id_permiso
        });
      if (errRol) {
        console.error('Error al asignar el permiso al rol Administrador:', errRol);
      } else {
        console.log('Permiso de "Planes" asignado al rol Administrador.');
      }
    }
  }
}

addPlanesPermission();
