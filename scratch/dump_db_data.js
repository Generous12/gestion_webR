const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://usjckurpzrwpxsgxkloz.supabase.co';
const supabaseKey = 'sb_publishable_VLNNRlPJvsznVGH2RH8AtQ_ZB9b0gQD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
  console.log('=== ROLES ===');
  const { data: roles } = await supabase.from('roles').select('*');
  console.log(JSON.stringify(roles, null, 2));

  console.log('=== PERMISOS ===');
  const { data: permisos } = await supabase.from('permisos').select('*');
  console.log(JSON.stringify(permisos, null, 2));

  console.log('=== ROLES_PERMISOS ===');
  const { data: rp } = await supabase.from('roles_permisos').select('*');
  console.log(JSON.stringify(rp, null, 2));
}

dump();
