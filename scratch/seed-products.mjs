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

const mockProducts = [
  {
    nombre: 'Proteína Whey Gold Standard 2lb',
    descripcion: 'Suplemento de proteína de suero de leche sabor chocolate, ideal para recuperación muscular.',
    precio_compra: 95.00,
    precio_venta: 140.00,
    stock: 12,
    codigo_barras: '748927028614',
    estado: 'ACTIVO'
  },
  {
    nombre: 'Creatina Monohidratada 300g (Optimum)',
    descripcion: 'Polvo de creatina pura micronizada para aumento de fuerza y resistencia.',
    precio_compra: 60.00,
    precio_venta: 95.00,
    stock: 8,
    codigo_barras: '748927052985',
    estado: 'ACTIVO'
  },
  {
    nombre: 'Agua Mineral San Mateo 1L',
    descripcion: 'Agua de manantial purificada sin gas.',
    precio_compra: 1.20,
    precio_venta: 3.00,
    stock: 45,
    codigo_barras: '775123456789',
    estado: 'ACTIVO'
  },
  {
    nombre: 'Gatorade Electrólitos 500ml',
    descripcion: 'Bebida isotónica sabor frutas tropicales para rehidratación.',
    precio_compra: 2.50,
    precio_venta: 5.00,
    stock: 24,
    codigo_barras: '775987654321',
    estado: 'ACTIVO'
  },
  {
    nombre: 'Barra de Proteína Quest Bar',
    descripcion: 'Barra proteica con 21g de proteína y bajo en carbohidratos.',
    precio_compra: 7.50,
    precio_venta: 12.00,
    stock: 30,
    codigo_barras: '888849000171',
    estado: 'ACTIVO'
  },
  {
    nombre: 'Shaker Mezclador Gym Premium',
    descripcion: 'Vaso mezclador de 700ml con rejilla y bola de acero inoxidable.',
    precio_compra: 11.00,
    precio_venta: 25.00,
    stock: 15,
    codigo_barras: '999999000123',
    estado: 'ACTIVO'
  }
];

async function seed() {
  console.log("Insertando productos de prueba en la tabla 'productos'...");
  
  for (const prod of mockProducts) {
    const { data, error } = await supabase
      .from('productos')
      .insert([prod])
      .select()
      .single();

    if (error) {
      console.error(`Error al insertar "${prod.nombre}":`, error.message);
    } else {
      console.log(`Producto insertado con éxito: "${data.nombre}" (ID: ${data.id_producto})`);
      
      // Registrar movimiento de inventario inicial
      if (data.stock > 0) {
        await supabase
          .from('movimientos_inventario')
          .insert({
            id_producto: data.id_producto,
            tipo: 'INGRESO',
            cantidad: data.stock,
            concepto: 'Carga inicial por sembrado de base de datos'
          });
      }
    }
  }

  console.log("Sembrado de productos finalizado.");
}

seed();
