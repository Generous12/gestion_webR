import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Leer .env.local
const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    process.env[match[1]] = value.trim();
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('ERROR: No se encontró URL o SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function testConnection() {
  console.log('Probando conexión con SUPABASE_SERVICE_ROLE_KEY...');
  
  const { data: users, error: errUsers } = await supabase.from('usuarios_sistema').select('id_usuario, usuario').limit(1);
  if (errUsers) {
    console.error('Error al consultar usuarios_sistema:', errUsers);
  } else {
    console.log('✅ Conexión con service_role exitosa. Usuarios encontrados:', users);
  }

  const { data: clientes, error: errClientes } = await supabase.from('clientes').select('id_cliente, nombre').limit(1);
  if (errClientes) {
    console.error('Error al consultar clientes:', errClientes);
  } else {
    console.log('✅ Conexión con service_role exitosa. Clientes encontrados:', clientes);
  }
}

testConnection();
