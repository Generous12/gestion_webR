import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Faltan variables de entorno en .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log('Verificando tablas...');
  const tables = ['clientes', 'tipos_membresia', 'membresias_cliente', 'metodos_pago', 'pagos', 'cajas', 'categorias_gasto', 'gastos', 'movimientos_caja'];
  
  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error) {
      console.log(`Tabla "${table}": NO EXISTE o tiene error: ${error.message}`);
    } else {
      console.log(`Tabla "${table}": EXISTE`);
    }
  }
}

check();
