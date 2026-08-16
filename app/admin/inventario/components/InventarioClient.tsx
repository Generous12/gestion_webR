'use client';

import React, { useState } from 'react';
import { 
  Producto, 
  guardarProducto, 
  registrarAjusteStock, 
  obtenerMovimientosInventario, 
  eliminarProducto,
  cambiarEstadoProducto,
  MovimientoInventario 
} from '@/app/actions/productos';
import { SesionUsuarioActual } from '@/types/gym.types';
import { useModalAlert } from '@/context/ModalAlertContext';
import { exportarExcelInventario } from '@/utils/exportadorExcel';

interface InventarioClientProps {
  productos: Producto[];
  user: SesionUsuarioActual;
}

export default function InventarioClient({ productos: initialProductos, user }: InventarioClientProps) {
  const { showConfirm, showAlert, showToast } = useModalAlert();
  const [productos, setProductos] = useState<Producto[]>(initialProductos);
  const [selectedProduct, setSelectedProduct] = useState<Producto | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'TODOS' | 'ACTIVO' | 'INACTIVO'>('TODOS');
  
  // Modales
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Estados de carga e imágenes
  const [loading, setLoading] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyList, setHistoryList] = useState<MovimientoInventario[]>([]);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Formulario de Producto
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Ajuste de Inventario
  const [adjustQty, setAdjustQty] = useState<number>(0);
  const [adjustConcept, setAdjustConcept] = useState<string>('');

  const esAdmin = user.usuario === 'admin' || 
    user.roles?.includes('Super Admin') || 
    user.roles?.includes('Administrador') ||
    user.modulos?.includes('Inventario');

  // Filtrado reactivo de productos
  const filteredProducts = productos.filter(p => {
    const matchesSearch = 
      p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.codigo_barras && p.codigo_barras.includes(searchTerm)) ||
      (p.descripcion && p.descripcion.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = 
      filterStatus === 'TODOS' ? true : p.estado === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const countActivos = productos.filter(p => p.estado === 'ACTIVO').length;
  const countInactivos = productos.filter(p => p.estado === 'INACTIVO').length;

  // Refrescar listado
  const recargarProductos = async () => {
    const { obtenerProductos } = await import('@/app/actions/productos');
    const prods = await obtenerProductos();
    setProductos(prods);
  };

  // Previsualizar y comprimir imagen cargada localmente
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_DIM = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImagePreview(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Abrir Modal de Creación
  const handleOpenCreate = () => {
    setSelectedProduct(null);
    setImagePreview(null);
    setFormError(null);
    setFormSuccess(null);
    setIsFormModalOpen(true);
  };

  // Abrir Modal de Edición
  const handleOpenEdit = (p: Producto) => {
    setSelectedProduct(p);
    setImagePreview(p.imagen_url);
    setFormError(null);
    setFormSuccess(null);
    setIsFormModalOpen(true);
  };

  // Guardar Producto
  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    if (selectedProduct) {
      formData.append('id_producto', selectedProduct.id_producto.toString());
    }

    if (imagePreview) {
      formData.set('imagen_url', imagePreview);
    }

    const res = await guardarProducto(formData);
    setLoading(false);

    if (res.error) {
      setFormError(res.error);
      showToast(res.error, 'danger');
    } else {
      setFormSuccess(selectedProduct ? 'Producto editado con éxito.' : 'Producto registrado con éxito.');
      showToast(selectedProduct ? 'Producto actualizado' : 'Producto registrado', 'success');
      setTimeout(async () => {
        setIsFormModalOpen(false);
        await recargarProductos();
      }, 800);
    }
  };

  // Eliminar Producto (Con detección automática de soft-delete vs hard-delete)
  const handleDeleteProduct = async (p: Producto) => {
    const ok = await showConfirm({
      title: 'Eliminar Producto del Catálogo',
      message: `¿Estás seguro de que deseas eliminar "${p.nombre}"? Si cuenta con ventas o movimientos históricos, se archivará automáticamente como INACTIVO para proteger los balances contables.`,
      confirmText: 'Sí, Eliminar Producto',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (!ok) return;

    setLoading(true);
    try {
      const res = await eliminarProducto(p.id_producto);
      if (res.error) {
        await showAlert({
          title: 'No se pudo eliminar',
          message: res.error,
          type: 'danger'
        });
      } else {
        const msg = res.message || 'Operación completada con éxito';
        if (res.softDeleted) {
          showToast(msg, 'warning');
        } else {
          showToast(msg, 'success');
        }
        await recargarProductos();
      }
    } catch (e) {
      console.error(e);
      showToast('Error de conexión al eliminar el producto', 'danger');
    } finally {
      setLoading(false);
    }
  };

  // Alternar Estado Activo / Inactivo
  const handleToggleEstado = async (p: Producto) => {
    const nuevoEstado = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const res = await cambiarEstadoProducto(p.id_producto, nuevoEstado);
    if (res.error) {
      showToast(res.error, 'danger');
    } else {
      showToast(`Producto ${p.nombre} ahora está ${nuevoEstado}`, 'success');
      await recargarProductos();
    }
  };

  // Abrir Ajuste de Inventario
  const handleOpenAdjust = (p: Producto) => {
    setSelectedProduct(p);
    setAdjustQty(0);
    setAdjustConcept('');
    setFormError(null);
    setFormSuccess(null);
    setIsAdjustModalOpen(true);
  };

  // Guardar Ajuste de Inventario
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    setFormError(null);
    setFormSuccess(null);
    setLoading(true);

    const res = await registrarAjusteStock(selectedProduct.id_producto, adjustQty, adjustConcept);
    setLoading(false);

    if (res.error) {
      setFormError(res.error);
    } else {
      setFormSuccess('Inventario ajustado con éxito.');
      showToast('Stock actualizado correctamente', 'success');
      setTimeout(async () => {
        setIsAdjustModalOpen(false);
        await recargarProductos();
      }, 1000);
    }
  };

  // Ver Historial
  const handleOpenHistory = async (p: Producto) => {
    setSelectedProduct(p);
    setIsHistoryModalOpen(true);
    setHistoryLoading(true);
    try {
      const data = await obtenerMovimientosInventario(p.id_producto);
      setHistoryList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Exportar a Excel
  const handleExportExcel = async () => {
    setExportingExcel(true);
    try {
      await exportarExcelInventario(filteredProducts);
      showToast('Inventario exportado a Excel con éxito.', 'success');
    } catch (e) {
      console.error('Error al exportar inventario a Excel:', e);
      showToast('Error al exportar archivo Excel.', 'danger');
    } finally {
      setExportingExcel(false);
    }
  };

  // Cambiar visibilidad / estado del producto con un clic
  const handleToggleStatus = async (p: Producto) => {
    const nuevoEstado = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
    const res = await cambiarEstadoProducto(p.id_producto, nuevoEstado);
    if (res.error) {
      showToast(res.error, 'danger');
    } else {
      showToast(`Producto ${nuevoEstado === 'ACTIVO' ? 'Activado (Visible en tienda web)' : 'Desactivado (Oculto de la web)'}.`, 'success');
      await recargarProductos();
    }
  };

  const [mounted, setMounted] = useState(false);
  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div suppressHydrationWarning className="space-y-6 animate-pulse p-2 sm:p-4">
        <div suppressHydrationWarning className="h-32 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-14 rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
        <div suppressHydrationWarning className="h-[450px] rounded-2xl bg-zinc-200/60 dark:bg-zinc-850" />
      </div>
    );
  }

  return (
    <div suppressHydrationWarning className="space-y-6">
      {/* Header Panel */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 p-6 shadow-md border border-zinc-200/10 sm:p-8 dark:border-zinc-800">
        <div className="absolute right-0 top-0 -mr-20 -mt-20 h-80 w-80 rounded-full bg-blue-600/10 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Catálogo e Inventario</h1>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400">
              Administración de suplementos deportivos, bebidas, merchandising y control de existencias (stock).
            </p>
          </div>
          
          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={handleExportExcel}
              disabled={exportingExcel || productos.length === 0}
              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer disabled:opacity-50"
              title="Descargar catálogo e inventario completo en Excel (.xlsx)"
            >
              <span>📥</span>
              <span>{exportingExcel ? 'Generando...' : 'Exportar Inventario (Excel)'}</span>
            </button>

            {esAdmin && (
              <button
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Registrar Producto
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Search, Filter Tabs and Statistics */}
      <div className="bg-white border border-zinc-200/80 rounded-2xl shadow-xs p-4 space-y-4 dark:bg-zinc-900 dark:border-zinc-850">
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 flex items-center bg-zinc-50 border border-zinc-200 rounded-xl dark:bg-zinc-850 dark:border-zinc-800 p-1">
            <div className="pl-3 text-zinc-400 dark:text-zinc-500">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nombre, descripción o código de barras..."
              className="w-full pl-2.5 pr-4 py-1.5 bg-transparent text-xs text-zinc-900 dark:text-zinc-50 focus:outline-none"
            />
          </div>

          {/* Filter Status Tabs */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setFilterStatus('TODOS')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'TODOS'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Todos ({productos.length})
            </button>
            <button
              onClick={() => setFilterStatus('ACTIVO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'ACTIVO'
                  ? 'bg-white text-emerald-700 shadow-xs dark:bg-zinc-900 dark:text-emerald-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Activos ({countActivos})
            </button>
            <button
              onClick={() => setFilterStatus('INACTIVO')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                filterStatus === 'INACTIVO'
                  ? 'bg-white text-rose-700 shadow-xs dark:bg-zinc-900 dark:text-rose-400'
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Archivados ({countInactivos})
            </button>
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map((p) => {
            const profit = p.precio_compra ? p.precio_venta - p.precio_compra : null;
            const isInactivo = p.estado === 'INACTIVO';
            
            return (
              <div 
                key={p.id_producto} 
                className={`bg-white border rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between transition-all ${
                  isInactivo 
                    ? 'border-zinc-300 dark:border-zinc-800 opacity-75 bg-zinc-50/50 dark:bg-zinc-900/40' 
                    : 'border-zinc-200/80 dark:bg-zinc-900 dark:border-zinc-850 hover:shadow-md'
                }`}
              >
                {/* Product Info Block */}
                <div className="p-5 space-y-4">
                  <div className="flex gap-4 items-start">
                    {/* Photo from PC / upload */}
                    <div className="w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 border border-zinc-150 dark:border-zinc-800 relative">
                      {p.imagen_url ? (
                        <img src={p.imagen_url} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-6 h-6 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                        </svg>
                      )}
                      {isInactivo && (
                        <div className="absolute inset-0 bg-zinc-950/60 backdrop-blur-[1px] flex items-center justify-center text-[9px] font-black text-rose-300 uppercase">
                          Inactivo
                        </div>
                      )}
                    </div>
                    
                    <div className="min-w-0 space-y-1 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`inline-block w-2.5 h-2.5 rounded-full shrink-0 ${p.estado === 'ACTIVO' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          <h3 className="font-bold text-sm text-zinc-850 dark:text-zinc-100 truncate">{p.nombre}</h3>
                        </div>
                        {esAdmin && (
                          <button
                            onClick={() => handleToggleStatus(p)}
                            title="Haz clic para cambiar visibilidad en la tienda web"
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 transition-colors cursor-pointer border ${
                              p.estado === 'ACTIVO'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                            }`}
                          >
                            {p.estado === 'ACTIVO' ? 'Visible Web' : 'Oculto Web'}
                          </button>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 truncate">{p.descripcion || 'Sin descripción'}</p>
                      {p.codigo_barras && (
                        <span className="inline-block bg-zinc-100 dark:bg-zinc-800 text-[9px] px-2 py-0.5 rounded text-zinc-500 font-semibold uppercase tracking-wider">
                          Barcode: {p.codigo_barras}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Stock levels and prices details */}
                  <div className="grid grid-cols-2 gap-4 pt-2 text-xs">
                    <div>
                      <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider">Existencias</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="font-black text-zinc-800 dark:text-zinc-100 text-sm">{p.stock}</span>
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[8px] font-bold ${
                          p.stock === 0 ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400' :
                          p.stock <= 5 ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400' :
                          'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400'
                        }`}>
                          {p.stock === 0 ? 'AGOTADO' : p.stock <= 5 ? 'BAJO STOCK' : 'OK'}
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-zinc-400 block uppercase text-[9px] tracking-wider">Precio Venta</span>
                        {p.descuento_porcentaje && p.descuento_porcentaje > 0 && (
                          <span className="bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[8px] font-black px-1.5 py-0.2 rounded">
                            -{p.descuento_porcentaje}%
                          </span>
                        )}
                      </div>
                      {p.descuento_porcentaje && p.descuento_porcentaje > 0 ? (
                        <div className="flex items-baseline gap-1.5 mt-0.5">
                          <span className="font-black text-rose-600 dark:text-rose-400 text-sm">S/ {p.precio_final?.toFixed(2)}</span>
                          <span className="text-zinc-400 line-through text-[10px]">S/ {p.precio_venta.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="font-black text-zinc-850 dark:text-zinc-50 text-sm mt-0.5 block">S/ {p.precio_venta.toFixed(2)}</span>
                      )}
                    </div>
                  </div>

                  {/* Margins */}
                  {esAdmin && p.precio_compra !== null && (
                    <div className="bg-zinc-50 dark:bg-zinc-900/30 p-2.5 rounded-xl border border-zinc-150/40 dark:border-zinc-850/40 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-zinc-400 font-medium">Costo de compra:</span>
                        <p className="font-bold text-zinc-700 dark:text-zinc-300 mt-0.5">S/ {p.precio_compra.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-zinc-400 font-medium">Margen estimado:</span>
                        <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          S/ {profit?.toFixed(2)} (+{Math.round((profit! / p.precio_compra) * 100)}%)
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons Footer */}
                <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-850/20 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleOpenHistory(p)}
                    className="text-center bg-white hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors"
                    title="Ver kardex de movimientos"
                  >
                    Kardex
                  </button>
                  <button
                    onClick={() => handleOpenAdjust(p)}
                    className="text-center bg-white hover:bg-zinc-50 border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-800 dark:hover:bg-zinc-850 text-zinc-700 dark:text-zinc-300 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer transition-colors"
                    title="Sumar o restar existencias de stock"
                  >
                    Stock
                  </button>
                  {esAdmin && (
                    <>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/40 px-2.5 py-1.5 rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                        title="Eliminar o archivar producto"
                      >
                        Eliminar
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-white border border-zinc-200 dark:bg-zinc-900 dark:border-zinc-850 rounded-2xl text-zinc-400 text-xs">
          No se encontraron productos que coincidan con la búsqueda o filtro seleccionado.
        </div>
      )}

      {/* ----------------- MODAL CREAR / EDITAR PRODUCTO ----------------- */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">
                {selectedProduct ? 'Editar Producto' : 'Registrar Nuevo Producto'}
              </h3>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-650 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              {/* Local Image Uploader */}
              <div className="flex flex-col items-center gap-2 p-4 bg-zinc-50 dark:bg-zinc-900/40 rounded-xl border border-dashed border-zinc-250 dark:border-zinc-800">
                <div className="w-20 h-20 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 overflow-hidden flex items-center justify-center">
                  {imagePreview ? (
                    <img src={imagePreview} alt="Previsualización" className="w-full h-full object-cover" />
                  ) : (
                    <svg className="w-8 h-8 text-zinc-350" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                    </svg>
                  )}
                </div>
                <label className="bg-zinc-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg cursor-pointer hover:bg-zinc-800 dark:bg-white dark:text-zinc-950 transition-all">
                  Subir Foto desde PC
                  <input
                    type="file"
                    name="imagen_file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Nombre del Producto *</label>
                <input
                  type="text"
                  name="nombre"
                  defaultValue={selectedProduct?.nombre || ''}
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Descripción</label>
                <textarea
                  name="descripcion"
                  rows={2}
                  defaultValue={selectedProduct?.descripcion || ''}
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                ></textarea>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Costo Compra S/</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio_compra"
                    defaultValue={selectedProduct?.precio_compra || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Precio Venta S/ *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="precio_venta"
                    defaultValue={selectedProduct?.precio_venta || ''}
                    required
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-rose-500 uppercase">Descuento (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="99"
                    name="descuento_porcentaje"
                    placeholder="Ej. 15"
                    defaultValue={selectedProduct?.descuento_porcentaje || ''}
                    className="w-full bg-rose-50/50 border border-rose-200 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-xl px-3 py-2.5 text-xs text-rose-600 dark:text-rose-400 font-bold focus:outline-none placeholder-rose-300 dark:placeholder-rose-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Existencias Iniciales</label>
                  <input
                    type="number"
                    name="stock"
                    defaultValue={selectedProduct?.stock || 0}
                    disabled={!!selectedProduct} // Deshabilitado en edición para evitar descuadres contables
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none disabled:opacity-50"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Código de Barras</label>
                  <input
                    type="text"
                    name="codigo_barras"
                    defaultValue={selectedProduct?.codigo_barras || ''}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  />
                </div>
              </div>

              {selectedProduct && (
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase">Estado del Producto</label>
                  <select
                    name="estado"
                    defaultValue={selectedProduct.estado}
                    className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                  >
                    <option value="ACTIVO">ACTIVO (Disponible en Ventas)</option>
                    <option value="INACTIVO">INACTIVO (Archivado / Oculto)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer transition-all"
                >
                  {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL AJUSTE DE INVENTARIO ----------------- */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Ajustar Stock: {selectedProduct.nombre}</h3>
              <button
                onClick={() => setIsAdjustModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-650 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-semibold">
                  {formSuccess}
                </div>
              )}

              <div className="bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded-xl border border-zinc-150/40 dark:border-zinc-800 text-xs">
                <span className="font-bold text-zinc-450">Stock Actual:</span>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 ml-1.5 text-sm">{selectedProduct.stock} unidades</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Cantidad del Ajuste (+ o -)</label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                  placeholder="Ej. +10 o -2"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                />
                <span className="text-[9px] text-zinc-400 block mt-0.5">Ingresa números positivos para sumar stock y negativos para restar stock por pérdida o merma.</span>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase">Motivo / Concepto del Ajuste *</label>
                <input
                  type="text"
                  value={adjustConcept}
                  onChange={(e) => setAdjustConcept(e.target.value)}
                  placeholder="Ej. Compra lote a proveedor o Rotura de frasco"
                  required
                  className="w-full bg-zinc-50 border border-zinc-200 dark:bg-zinc-850 dark:border-zinc-800 rounded-xl px-3 py-2.5 text-xs text-zinc-800 dark:text-zinc-50 focus:outline-none"
                />
              </div>

              <div className="pt-4 border-t border-zinc-150 dark:border-zinc-850 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="bg-zinc-100 hover:bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:hover:bg-zinc-750 dark:text-zinc-200 px-4 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || adjustQty === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 px-5 py-2.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50 transition-all"
                >
                  {loading ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ----------------- MODAL HISTORIAL DE INVENTARIO ----------------- */}
      {isHistoryModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden border border-zinc-200 dark:border-zinc-850">
            <div className="px-6 py-5 border-b border-zinc-150 dark:border-zinc-850 bg-zinc-50/50 flex justify-between items-center">
              <h3 className="font-bold text-base text-zinc-900 dark:text-zinc-50">Kardex de Inventario: {selectedProduct.nombre}</h3>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-650 transition-colors p-1 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
              {historyLoading ? (
                <div className="p-12 text-center">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-zinc-900 border-t-transparent dark:border-white"></div>
                  <p className="mt-2 text-xs text-zinc-400 font-medium">Cargando historial...</p>
                </div>
              ) : historyList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-50 dark:bg-zinc-850 text-zinc-400 font-bold border-b border-zinc-150 dark:border-zinc-800">
                        <th className="p-3 uppercase tracking-wider">Fecha</th>
                        <th className="p-3 uppercase tracking-wider">Operación</th>
                        <th className="p-3 uppercase tracking-wider text-center">Cant.</th>
                        <th className="p-3 uppercase tracking-wider">Motivo</th>
                        <th className="p-3 uppercase tracking-wider">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-850">
                      {historyList.map((h) => (
                        <tr key={h.id_mov_inventario} className="hover:bg-zinc-50/30 dark:hover:bg-zinc-850/10">
                          <td className="p-3 text-zinc-500 font-semibold">
                            {new Date(h.fecha).toLocaleDateString()} {new Date(h.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="p-3">
                            <span className={`inline-block px-2 py-0.5 rounded font-black text-[9px] ${
                              h.tipo === 'INGRESO' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400' :
                              h.tipo === 'VENTA' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400' :
                              'bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-400'
                            }`}>
                              {h.tipo}
                            </span>
                          </td>
                          <td className={`p-3 font-bold text-center ${h.cantidad > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {h.cantidad > 0 ? `+${h.cantidad}` : h.cantidad}
                          </td>
                          <td className="p-3 text-zinc-700 dark:text-zinc-350 font-semibold">{h.concepto}</td>
                          <td className="p-3 text-zinc-500 font-medium">{h.usuarios_sistema?.usuario || 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-zinc-400">
                  No hay movimientos registrados para este producto todavía.
                </div>
              )}
            </div>

            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-150 dark:border-zinc-850 flex justify-end">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="bg-zinc-900 hover:bg-zinc-850 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-100 px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
