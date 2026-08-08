import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse env
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      process.env[key] = value.trim();
    }
  });
} catch (e) {
  console.warn("Could not read .env.local:", e.message);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const mapping = {
  'Administrador': [
    'Dashboard', 'Recepcion', 'Ventas', 'Caja', 'CRM', 
    'Finanzas', 'Planes', 'EquipoUsuarios', 'RolesPermisos', 'LogsSeguridad'
  ],
  'Recepcionista': [
    'Dashboard', 'Recepcion', 'Ventas', 'Caja', 'CRM'
  ],
  'Cajero': [
    'Dashboard', 'Recepcion', 'Ventas', 'Caja'
  ],
  'Entrenador': [
    'Dashboard', 'Recepcion'
  ]
};

async function fix() {
  console.log("Iniciando depuración y asignación correcta de permisos por roles...");

  // 1. Obtener todos los permisos del sistema
  const { data: todosPermisos } = await supabase.from('permisos').select('*');
  if (!todosPermisos) {
    console.error("No se pudieron cargar los permisos.");
    return;
  }

  // Crear un mapa de clave -> id_permiso
  const permMap = {};
  todosPermisos.forEach(p => {
    permMap[p.codigo] = p.id_permiso;
  });

  // 2. Obtener todos los roles
  const { data: todosRoles } = await supabase.from('roles').select('*');
  if (!todosRoles) {
    console.error("No se pudieron cargar los roles.");
    return;
  }

  // 3. Limpiar la tabla roles_permisos antes de reasignar
  const { error: clearError } = await supabase.from('roles_permisos').delete().neq('id_rol', 0); // Borra todo
  if (clearError) {
    console.error("Error al limpiar roles_permisos:", clearError);
    return;
  }
  console.log("Limpieza de permisos anteriores completada.");

  // 4. Insertar los nuevos permisos correctos
  for (const r of todosRoles) {
    const permList = mapping[r.nombre];
    if (!permList) {
      console.log(`Rol "${r.nombre}" no definido en el script de asignación.`);
      continue;
    }

    console.log(`Asignando permisos para el Rol [${r.nombre}]...`);
    const rowsToInsert = [];
    
    for (const key of permList) {
      const idPermiso = permMap[key];
      if (idPermiso) {
        rowsToInsert.push({
          id_rol: r.id_rol,
          id_permiso: idPermiso
        });
      } else {
        console.warn(`Advertencia: El permiso "${key}" no existe en la base de datos.`);
      }
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await supabase.from('roles_permisos').insert(rowsToInsert);
      if (insertError) {
        console.error(`Error al insertar permisos para ${r.nombre}:`, insertError);
      } else {
        console.log(`Asignados ${rowsToInsert.length} permisos al rol "${r.nombre}" con éxito.`);
      }
    }
  }

  console.log("Asignación de permisos completada correctamente.");
}

fix();
