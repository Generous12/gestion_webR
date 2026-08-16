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
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const allPossibleTables = [
  'usuarios_sistema',
  'equipo',
  'equipo_roles',
  'roles',
  'permisos',
  'roles_permisos',
  'sesiones_usuario',
  'logs_seguridad',
  'recuperacion_password',
  'clientes',
  'tipos_membresia',
  'membresias_cliente',
  'metodos_pago',
  'pagos',
  'cajas',
  'categorias_gasto',
  'gastos',
  'movimientos_caja',
  'productos',
  'inventario',
  'movimientos_inventario',
  'ventas_productos',
  'detalle_ventas_productos',
  'contactos_web'
];

async function inspect() {
  console.log("=== SUPABASE DATABASE AUDIT (READ ONLY) ===\n");
  for (const table of allPossibleTables) {
    try {
      const { count, error, data } = await supabase.from(table).select('*', { count: 'exact' }).limit(10);
      if (error) {
        console.log(`❌ [${table}]: No existe o error -> ${error.message}`);
      } else {
        console.log(`✅ [${table}]: Total registros = ${count}`);
        if (table === 'roles') {
          console.log("   Roles actuales:", data.map(r => ({ id: r.id_rol, nombre: r.nombre, es_sistema: r.es_sistema, estado: r.estado })));
        }
        if (table === 'usuarios_sistema') {
          console.log("   Usuarios actuales:", data.map(u => ({ id: u.id_usuario, usuario: u.usuario, estado: u.estado, id_miembro: u.id_miembro })));
        }
        if (table === 'tipos_membresia') {
          console.log("   Tipos membresía actuales:", data.map(m => ({ id: m.id_tipo, nombre: m.nombre, precio: m.precio, dias: m.duracion_dias, estado: m.estado })));
        }
      }
    } catch (err) {
      console.log(`⚠️ [${table}]: Error inesperado -> ${err.message}`);
    }
  }
}

inspect();
