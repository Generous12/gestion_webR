import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
envFile.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w\.\-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    process.env[key] = value.trim();
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function inspectUsersAndRoles() {
  console.log("=== USERS ===");
  const { data: users } = await supabase.from('usuarios_sistema').select('*');
  console.log(users);

  console.log("=== EQUIPO ===");
  const { data: equipo } = await supabase.from('equipo').select('*');
  console.log(equipo);

  console.log("=== EQUIPO ROLES ===");
  const { data: eqRoles } = await supabase.from('equipo_roles').select('*, roles(nombre), equipo(nombre, apellido)');
  console.log(eqRoles);

  console.log("=== ROLES ===");
  const { data: roles } = await supabase.from('roles').select('*');
  console.log(roles);
}

inspectUsersAndRoles();
