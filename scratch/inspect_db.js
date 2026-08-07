
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://usjckurpzrwpxsgxkloz.supabase.co';
const supabaseKey = 'sb_publishable_VLNNRlPJvsznVGH2RH8AtQ_ZB9b0gQD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  console.log('--- ROLES ---');
  const { data: roles, error: errRoles } = await supabase.from('roles').select('*').limit(1);
  if (errRoles) console.error('Roles error:', errRoles);
  else console.log('Roles sample:', roles[0]);

  console.log('--- PERMISOS ---');
  const { data: permisos, error: errPermisos } = await supabase.from('permisos').select('*').limit(1);
  if (errPermisos) console.error('Permisos error:', errPermisos);
  else console.log('Permisos sample:', permisos[0]);

  console.log('--- EQUIPO ---');
  const { data: equipo, error: errEquipo } = await supabase.from('equipo').select('*').limit(1);
  if (errEquipo) console.error('Equipo error:', errEquipo);
  else console.log('Equipo sample:', equipo[0]);
}

test();
