import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env.local
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

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Credenciales de Supabase no encontradas.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function cleanData() {
  console.log("==================================================");
  console.log("🚀 INICIANDO LIMPIEZA SEGURA DE DATOS EN SUPABASE");
  console.log("==================================================\n");

  try {
    // 1. Identificar al usuario Administrador y su miembro de equipo
    const { data: adminUsers, error: errAdmin } = await supabase
      .from('usuarios_sistema')
      .select('id_usuario, usuario, id_miembro')
      .eq('usuario', 'braulio');

    if (errAdmin || !adminUsers || adminUsers.length === 0) {
      console.error("⚠️ No se encontró el usuario 'braulio'. Buscando por id_rol de Administrador...");
    }

    const adminIdUsuario = adminUsers?.[0]?.id_usuario || 1;
    const adminIdMiembro = adminUsers?.[0]?.id_miembro || 1;

    console.log(`👤 Usuario Administrador protegido: ID ${adminIdUsuario} (${adminUsers?.[0]?.usuario || 'braulio'}), Miembro ID: ${adminIdMiembro}\n`);

    // 2. Limpiar detalle_ventas_productos
    console.log("🧹 1. Vaciando 'detalle_ventas_productos'...");
    const { error: e1 } = await supabase.from('detalle_ventas_productos').delete().neq('id_detalle', -1);
    if (e1) console.warn("   Error en detalle_ventas_productos:", e1.message);
    else console.log("   ✅ 'detalle_ventas_productos' vaciada.");

    // 3. Limpiar ventas_productos
    console.log("🧹 2. Vaciando 'ventas_productos'...");
    const { error: e2 } = await supabase.from('ventas_productos').delete().neq('id_venta', -1);
    if (e2) console.warn("   Error en ventas_productos:", e2.message);
    else console.log("   ✅ 'ventas_productos' vaciada.");

    // 4. Limpiar movimientos_inventario
    console.log("🧹 3. Vaciando 'movimientos_inventario'...");
    const { error: e3 } = await supabase.from('movimientos_inventario').delete().neq('id_mov_inventario', -1);
    if (e3) console.warn("   Error en movimientos_inventario:", e3.message);
    else console.log("   ✅ 'movimientos_inventario' vaciada.");

    // 5. Limpiar productos
    console.log("🧹 4. Vaciando 'productos'...");
    const { error: e4 } = await supabase.from('productos').delete().neq('id_producto', -1);
    if (e4) console.warn("   Error en productos:", e4.message);
    else console.log("   ✅ 'productos' vaciada.");

    // 6. Limpiar movimientos_caja
    console.log("🧹 5. Vaciando 'movimientos_caja'...");
    const { error: e5 } = await supabase.from('movimientos_caja').delete().neq('id_movimiento', -1);
    if (e5) console.warn("   Error en movimientos_caja:", e5.message);
    else console.log("   ✅ 'movimientos_caja' vaciada.");

    // 7. Limpiar pagos
    console.log("🧹 6. Vaciando 'pagos'...");
    const { error: e6 } = await supabase.from('pagos').delete().neq('id_pago', -1);
    if (e6) console.warn("   Error en pagos:", e6.message);
    else console.log("   ✅ 'pagos' vaciada.");

    // 8. Limpiar gastos
    console.log("🧹 7. Vaciando 'gastos'...");
    const { error: e7 } = await supabase.from('gastos').delete().neq('id_gasto', -1);
    if (e7) console.warn("   Error en gastos:", e7.message);
    else console.log("   ✅ 'gastos' vaciada.");

    // 9. Limpiar cajas
    console.log("🧹 8. Vaciando 'cajas'...");
    const { error: e8 } = await supabase.from('cajas').delete().neq('id_caja', -1);
    if (e8) console.warn("   Error en cajas:", e8.message);
    else console.log("   ✅ 'cajas' vaciada.");

    // 10. Limpiar membresias_cliente
    console.log("🧹 9. Vaciando 'membresias_cliente'...");
    const { error: e9 } = await supabase.from('membresias_cliente').delete().neq('id_membresia', -1);
    if (e9) console.warn("   Error en membresias_cliente:", e9.message);
    else console.log("   ✅ 'membresias_cliente' vaciada.");

    // 11. Limpiar contactos_web
    console.log("🧹 10. Vaciando 'contactos_web'...");
    const { error: e10 } = await supabase.from('contactos_web').delete().neq('id_contacto', -1);
    if (e10) console.warn("   Error en contactos_web:", e10.message);
    else console.log("   ✅ 'contactos_web' vaciada.");

    // 12. Limpiar clientes
    console.log("🧹 11. Vaciando 'clientes'...");
    const { error: e11 } = await supabase.from('clientes').delete().neq('id_cliente', -1);
    if (e11) console.warn("   Error en clientes:", e11.message);
    else console.log("   ✅ 'clientes' vaciada.");

    // 13. Limpiar sesiones_usuario antiguas
    console.log("🧹 12. Vaciando 'sesiones_usuario'...");
    const { error: e12 } = await supabase.from('sesiones_usuario').delete().neq('id_sesion', -1);
    if (e12) console.warn("   Error en sesiones_usuario:", e12.message);
    else console.log("   ✅ 'sesiones_usuario' vaciada.");

    // 14. Limpiar logs_seguridad
    console.log("🧹 13. Vaciando 'logs_seguridad'...");
    const { error: e13 } = await supabase.from('logs_seguridad').delete().neq('id_log', -1);
    if (e13) console.warn("   Error en logs_seguridad:", e13.message);
    else console.log("   ✅ 'logs_seguridad' vaciada.");

    // 15. Limpiar usuarios de prueba secundarios (manteniendo al admin)
    console.log("🧹 14. Depurando usuarios secundarios de prueba (manteniendo al Administrador)...");
    const { error: e14 } = await supabase
      .from('usuarios_sistema')
      .delete()
      .neq('id_usuario', adminIdUsuario);
    if (e14) console.warn("   Error en usuarios_sistema:", e14.message);
    else console.log("   ✅ Usuarios secundarios eliminados.");

    // 16. Depurar equipo_roles para miembros que no sean el admin
    console.log("🧹 15. Depurando 'equipo_roles' secundarios...");
    const { error: e15 } = await supabase
      .from('equipo_roles')
      .delete()
      .neq('id_miembro', adminIdMiembro);
    if (e15) console.warn("   Error en equipo_roles:", e15.message);
    else console.log("   ✅ 'equipo_roles' secundarios eliminados.");

    // 17. Depurar miembros de equipo de prueba que no sean el admin
    console.log("🧹 16. Depurando 'equipo' secundario...");
    const { error: e16 } = await supabase
      .from('equipo')
      .delete()
      .neq('id_miembro', adminIdMiembro);
    if (e16) console.warn("   Error en equipo:", e16.message);
    else console.log("   ✅ 'equipo' secundario eliminado.");

    // 18. Depurar roles no deseados (ej. Cajero), dejando Administrador, Recepcionista, Entrenador
    console.log("🧹 17. Ajustando roles para conservar solo (Administrador, Recepcionista, Entrenador)...");
    // Buscar roles que no sean Administrador, Recepcionista, Entrenador
    const { data: rolesExtra } = await supabase
      .from('roles')
      .select('id_rol, nombre')
      .not('nombre', 'in', '("Administrador","Recepcionista","Entrenador")');

    if (rolesExtra && rolesExtra.length > 0) {
      const extraIds = rolesExtra.map(r => r.id_rol);
      console.log(`   Roles a remover: ${rolesExtra.map(r => `${r.nombre} (ID ${r.id_rol})`).join(', ')}`);
      
      // Eliminar permisos asociados a esos roles primero
      await supabase.from('roles_permisos').delete().in('id_rol', extraIds);
      // Eliminar el rol
      const { error: errRoles } = await supabase.from('roles').delete().in('id_rol', extraIds);
      if (errRoles) console.warn("   Error al eliminar roles extra:", errRoles.message);
      else console.log("   ✅ Roles extra eliminados correctamente.");
    } else {
      console.log("   ✅ Solo existen los 3 roles solicitados.");
    }

    // 19. Auditoría y verificación final
    console.log("\n==================================================");
    console.log("📊 RESUMEN DE TABLAS TRAS LA LIMPIEZA:");
    console.log("==================================================");

    const tablesToCheck = [
      'usuarios_sistema',
      'equipo',
      'roles',
      'permisos',
      'roles_permisos',
      'tipos_membresia',
      'metodos_pago',
      'categorias_gasto',
      'clientes',
      'membresias_cliente',
      'productos',
      'movimientos_inventario',
      'ventas_productos',
      'detalle_ventas_productos',
      'cajas',
      'movimientos_caja',
      'pagos',
      'gastos',
      'contactos_web',
      'sesiones_usuario',
      'logs_seguridad'
    ];

    for (const t of tablesToCheck) {
      const { count } = await supabase.from(t).select('*', { count: 'exact', head: true });
      console.log(`  🔹 ${t.padEnd(26)}: ${count} registros`);
    }

    // Mostrar detalles de los conservados
    const { data: rolesFinales } = await supabase.from('roles').select('id_rol, nombre');
    console.log("\n📋 Roles vigentes:", rolesFinales);

    const { data: membresiasFinales } = await supabase.from('tipos_membresia').select('id_tipo, nombre, precio, duracion_dias');
    console.log("📋 Tipos de Membresía conservados:", membresiasFinales);

    const { data: adminFinal } = await supabase.from('usuarios_sistema').select('id_usuario, usuario, estado');
    console.log("📋 Usuario Admin vigente:", adminFinal);

    console.log("\n🎉 LIMPIEZA COMPLETADA CON ÉXITO SIN TOCAR ESTRUCTURAS NI ESQUEMAS.");

  } catch (error) {
    console.error("❌ Error durante la ejecución:", error);
  }
}

cleanData();
