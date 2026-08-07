const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://usjckurpzrwpxsgxkloz.supabase.co';
const supabaseKey = 'sb_publishable_VLNNRlPJvsznVGH2RH8AtQ_ZB9b0gQD';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Inspecting database schemas...');
  // Let's try to query pg_catalog to see functions and triggers
  try {
    const { data: triggers, error: errTriggers } = await supabase
      .from('pg_trigger')
      .select('tgname, tgtype');
    if (errTriggers) {
      console.log('Cannot query pg_trigger directly (standard RLS/permissions):', errTriggers.message);
    } else {
      console.log('Triggers:', triggers);
    }
  } catch (e) {
    console.error(e);
  }

  // Let's query information_schema or similar
  try {
    const { data: routines, error: errRoutines } = await supabase
      .from('information_schema.routines')
      .select('routine_name')
      .eq('routine_schema', 'public');
    if (errRoutines) {
      console.log('Cannot query information_schema.routines directly:', errRoutines.message);
    } else {
      console.log('Routines:', routines);
    }
  } catch (e) {
    console.error(e);
  }
}

run();
