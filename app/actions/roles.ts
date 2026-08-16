'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';
import { getSesionActual } from '@/app/actions/auth';

export async function guardarPermisosRol(idRol: number, permisosIds: number[]) {
  const loggedInUser = await getSesionActual();
  if (!loggedInUser) {
    return { error: 'No autorizado. Por favor inicie sesión.' };
  }

  // Verificar que tenga el permiso RolesPermisos o sea Administrador
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const esAdmin = loggedInUser.usuario === 'admin' || (loggedInUser as any).roles?.includes('Super Admin') || (loggedInUser as any).roles?.includes('Administrador') || (loggedInUser as any).roles?.includes('Admin');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tienePermiso = esAdmin || (loggedInUser as any).permisos?.includes('RolesPermisos') || (loggedInUser as any).permisos?.includes('Roles') || (loggedInUser as any).modulos?.includes('RolesPermisos') || (loggedInUser as any).modulos?.includes('Roles');
  if (!tienePermiso) {
    return { error: 'No tienes permisos para asignar permisos a los roles.' };
  }

  const supabase = await createClient();

  // 1. Eliminar relaciones anteriores
  const { error: errDelete } = await supabase
    .from('roles_permisos')
    .delete()
    .eq('id_rol', idRol);

  if (errDelete) {
    console.error('Error al borrar permisos anteriores:', errDelete);
    return { error: 'Error al limpiar los permisos anteriores del rol.' };
  }

  // Si no se seleccionó ningún permiso, terminamos aquí
  if (permisosIds.length === 0) {
    revalidatePath('/admin/roles');
    return { success: true };
  }

  // 2. Insertar nuevas relaciones
  const insertData = permisosIds.map(idPermiso => ({
    id_rol: idRol,
    id_permiso: idPermiso
  }));

  const { error: errInsert } = await supabase
    .from('roles_permisos')
    .insert(insertData);

  if (errInsert) {
    console.error('Error al insertar nuevos permisos:', errInsert);
    return { error: 'Error al guardar los nuevos permisos asignados.' };
  }

  revalidatePath('/admin/roles');
  return { success: true };
}

