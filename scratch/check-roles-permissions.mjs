import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function check() {
  console.log("=== ROLES IN SYSTEM ===");
  const { data: roles } = await supabase.from('roles').select('*');
  console.log(roles);

  console.log("=== PERMISSIONS IN SYSTEM ===");
  const { data: perms } = await supabase.from('permisos').select('*');
  console.log(perms);

  console.log("=== ROLES AND THEIR PERMISSIONS ===");
  for (const r of roles || []) {
    const { data: rp } = await supabase
      .from('roles_permisos')
      .select('permisos(*)')
      .eq('id_rol', r.id_rol);
    console.log(`Role [${r.nombre}] has permissions:`, rp?.map(x => x.permisos).filter(Boolean));
  }

  console.log("=== USERS & ROLES ===");
  const { data: users } = await supabase.from('usuarios_sistema').select('*, equipo(*)');
  for (const u of users || []) {
    const idMiembro = u.id_miembro;
    if (idMiembro) {
      const { data: eqRoles } = await supabase
        .from('equipo_roles')
        .select('roles(nombre)')
        .eq('id_miembro', idMiembro);
      console.log(`User [${u.usuario}] has roles:`, eqRoles?.map(er => er.roles?.nombre || er.roles?.[0]?.nombre).filter(Boolean));
    } else {
      console.log(`User [${u.usuario}] has no id_miembro (Super Admin)`);
    }
  }
}

check();
