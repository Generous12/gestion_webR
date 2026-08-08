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

async function listTables() {
  console.log("=== LIST OF ALL TABLES ===");
  const { data, error } = await supabase.rpc('get_tables_list'); // checking if an RPC exists
  if (error) {
    // If no RPC, let's try reading table name list using postgrest schema request
    const { data: schemaData, error: schemaError } = await supabase.from('clientes').select('id_cliente').limit(1);
    console.log("No RPC found. We will inspect standard tables.");
  } else {
    console.log(data);
  }
  
  // Alternative: query information_schema if user created any custom function, otherwise check tables by testing common ones:
  const commonTables = [
    'productos', 'inventario', 'ventas_productos', 'usuarios_sistema', 'roles', 
    'permisos', 'roles_permisos', 'sesiones_usuario', 'logs_seguridad', 
    'clientes', 'tipos_membresia', 'membresias_cliente', 'metodos_pago', 'pagos', 
    'cajas', 'categorias_gasto', 'gastos', 'movimientos_caja', 'detalle_ventas_productos'
  ];
  
  for (const t of commonTables) {
    const { error } = await supabase.from(t).select('*').limit(0);
    if (!error) {
      console.log(`Table exists: ${t}`);
    } else {
      console.log(`Table DOES NOT exist: ${t} (${error.message})`);
    }
  }
}

listTables();
