import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  console.log('Iniciando sembrado de datos de prueba para la Fase 2...');

  // 1. Sembrar Métodos de Pago
  const metodos = ['Efectivo', 'Yape', 'Plin', 'Tarjeta', 'Transferencia'];
  for (const m of metodos) {
    const { data: ext } = await supabase.from('metodos_pago').select('id_metodo').eq('nombre', m).maybeSingle();
    if (!ext) {
      await supabase.from('metodos_pago').insert({ nombre: m, estado: 'ACTIVO' });
      console.log(`Método de pago "${m}" registrado.`);
    }
  }

  // 2. Sembrar Categorías de Gasto
  const categorias = [
    { nombre: 'Alquiler', descripcion: 'Pago del alquiler del local' },
    { nombre: 'Servicios Públicos', descripcion: 'Agua, luz, internet' },
    { nombre: 'Mantenimiento', descripcion: 'Reparación de máquinas y local' },
    { nombre: 'Marketing', descripcion: 'Publicidad y redes sociales' },
    { nombre: 'Personal', descripcion: 'Pago a entrenadores o personal administrativo' }
  ];
  for (const c of categorias) {
    const { data: ext } = await supabase.from('categorias_gasto').select('id_categoria').eq('nombre', c.nombre).maybeSingle();
    if (!ext) {
      await supabase.from('categorias_gasto').insert(c);
      console.log(`Categoría de gasto "${c.nombre}" registrada.`);
    }
  }

  // 3. Sembrar Tipos de Membresía (Planes)
  const planes = [
    { nombre: 'Mensual', descripcion: 'Acceso ilimitado por 30 días', precio: 120.00, duracion_dias: 30 },
    { nombre: 'Trimestral', descripcion: 'Acceso ilimitado por 90 días', precio: 320.00, duracion_dias: 90 },
    { nombre: 'Anual', descripcion: 'Acceso ilimitado por 365 días (El plan premium)', precio: 1000.00, duracion_dias: 365 }
  ];
  const planesMap = {};
  for (const p of planes) {
    let { data: ext } = await supabase.from('tipos_membresia').select('*').eq('nombre', p.nombre).maybeSingle();
    if (!ext) {
      const { data: inserted, error } = await supabase.from('tipos_membresia').insert(p).select().single();
      if (!error && inserted) {
        ext = inserted;
        console.log(`Plan "${p.nombre}" creado.`);
      }
    } else {
      console.log(`Plan "${p.nombre}" ya existe.`);
    }
    if (ext) {
      planesMap[p.nombre] = ext.id_tipo;
    }
  }

  // 4. Sembrar Clientes de Prueba
  const clientes = [
    {
      dni: '12345678',
      nombre: 'Juan',
      apellido: 'Pérez',
      telefono: '987654321',
      email: 'juan.perez@gmail.com',
      direccion: 'Av. Larco 123, Miraflores',
      observaciones: 'Ninguna contraindicación médica. Entrena fuerza.',
      estado: 'ACTIVO'
    },
    {
      dni: '87654321',
      nombre: 'María',
      apellido: 'Gómez',
      telefono: '912345678',
      email: 'maria.gomez@hotmail.com',
      direccion: 'Calle Las Flores 456, San Isidro',
      observaciones: 'Lesión leve en la rodilla izquierda. Evitar sentadillas pesadas.',
      estado: 'ACTIVO'
    },
    {
      dni: '11223344',
      nombre: 'Carlos',
      apellido: 'Ruiz',
      telefono: '998877665',
      email: 'carlos.ruiz@outlook.com',
      direccion: 'Av. Arequipa 2500, Lince',
      observaciones: 'Nuevo en el gimnasio, requiere inducción de máquinas.',
      estado: 'ACTIVO'
    }
  ];

  const clientesMap = {};
  for (const c of clientes) {
    let { data: ext } = await supabase.from('clientes').select('*').eq('dni', c.dni).maybeSingle();
    if (!ext) {
      const { data: inserted, error } = await supabase.from('clientes').insert(c).select().single();
      if (!error && inserted) {
        ext = inserted;
        console.log(`Cliente "${c.nombre} ${c.apellido}" creado.`);
      }
    } else {
      console.log(`Cliente "${c.nombre} ${c.apellido}" ya existe.`);
    }
    if (ext) {
      clientesMap[c.nombre] = ext.id_cliente;
    }
  }

  // 5. Sembrar Membresías para los Clientes (Juan: ACTIVA, María: VENCIDA, Carlos: SIN PLAN)
  const hoyStr = new Date().toISOString().split('T')[0];

  // Juan Pérez: Membresía Anual Activa (Inicia hace 10 días, vence en 355 días)
  if (clientesMap['Juan'] && planesMap['Anual']) {
    const { data: ext } = await supabase
      .from('membresias_cliente')
      .select('id_membresia')
      .eq('id_cliente', clientesMap['Juan'])
      .maybeSingle();

    if (!ext) {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 10);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 365);

      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];

      await supabase.from('membresias_cliente').insert({
        id_cliente: clientesMap['Juan'],
        id_tipo: planesMap['Anual'],
        precio_pagado: 1000.00,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr,
        estado: 'ACTIVA'
      });
      console.log('Membresía activa de Juan Pérez sembrada.');
    }
  }

  // María Gómez: Membresía Mensual Vencida (Inició hace 35 días, venció hace 5 días)
  if (clientesMap['María'] && planesMap['Mensual']) {
    const { data: ext } = await supabase
      .from('membresias_cliente')
      .select('id_membresia')
      .eq('id_cliente', clientesMap['María'])
      .maybeSingle();

    if (!ext) {
      const fechaInicio = new Date();
      fechaInicio.setDate(fechaInicio.getDate() - 35);
      const fechaFin = new Date(fechaInicio);
      fechaFin.setDate(fechaFin.getDate() + 30);

      const fechaInicioStr = fechaInicio.toISOString().split('T')[0];
      const fechaFinStr = fechaFin.toISOString().split('T')[0];

      await supabase.from('membresias_cliente').insert({
        id_cliente: clientesMap['María'],
        id_tipo: planesMap['Mensual'],
        precio_pagado: 120.00,
        fecha_inicio: fechaInicioStr,
        fecha_fin: fechaFinStr,
        estado: 'VENCIDA'
      });
      console.log('Membresía vencida de María Gómez sembrada.');
    }
  }

  // 6. Asignar todos los permisos al Rol Administrador (id_rol = 1) en base de datos
  const { data: todosPermisos } = await supabase.from('permisos').select('id_permiso');
  if (todosPermisos && todosPermisos.length > 0) {
    const { data: rolAdmin } = await supabase.from('roles').select('id_rol').eq('id_rol', 1).maybeSingle();
    if (rolAdmin) {
      for (const p of todosPermisos) {
        const { data: ext } = await supabase
          .from('roles_permisos')
          .select('id')
          .eq('id_rol', 1)
          .eq('id_permiso', p.id_permiso)
          .maybeSingle();
        if (!ext) {
          await supabase.from('roles_permisos').insert({ id_rol: 1, id_permiso: p.id_permiso });
        }
      }
      console.log('Todos los permisos del sistema mapeados al rol de Administrador.');
    }
  }

  console.log('Sembrado de datos finalizado con éxito.');
}

seed();
