'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Producto } from '@/app/actions/productos';
import {
  X,
  ShoppingCart,
  Zap,
  Sparkles,
  ShieldCheck,
  Check,
  Package,
  ChevronLeft,
  ChevronRight,
  Flame,
  Plus,
  Minus
} from 'lucide-react';

interface ProductoDetalleModalProps {
  producto: Producto | null;
  productosList?: Producto[];
  isOpen: boolean;
  onClose: () => void;
  onAddToCart?: (producto: Producto, cantidad: number) => void;
  onBuyNow?: (producto: Producto, cantidad: number) => void;
  onSelectProducto?: (producto: Producto) => void;
}

export default function ProductoDetalleModal({
  producto,
  productosList = [],
  isOpen,
  onClose,
  onAddToCart,
  onBuyNow,
  onSelectProducto
}: ProductoDetalleModalProps) {
  // Cantidad seleccionada
  const [cantidad, setCantidad] = useState(1);
  const [activeTab, setActiveTab] = useState<'info' | 'garantia'>('info');
  const [addedAnimation, setAddedAnimation] = useState(false);

  // Estados de Zoom Interactivo (Lens) - Fijo en 1.8x
  const [isZoomActive, setIsZoomActive] = useState(false);
  const zoomLevel = 1.8;
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  const imageContainerRef = useRef<HTMLDivElement>(null);

  // Helper para Estado de Stock sin números
  const getStockStatus = (stock: number) => {
    if (!stock || stock <= 0) {
      return {
        label: 'Sin stock',
        badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border border-zinc-200 dark:border-zinc-700',
        dotClass: 'bg-zinc-400',
        isAvailable: false
      };
    }
    if (stock <= 5) {
      return {
        label: 'Poco stock',
        badgeClass: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40',
        dotClass: 'bg-amber-500',
        isAvailable: true
      };
    }
    return {
      label: 'Con stock',
      badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40',
      dotClass: 'bg-emerald-500',
      isAvailable: true
    };
  };

  // Resetear estado al cambiar de producto sin causar renderizados en cascada
  const [prevProductoId, setPrevProductoId] = useState(producto?.id_producto);
  if (producto?.id_producto !== prevProductoId) {
    setPrevProductoId(producto?.id_producto);
    setCantidad(1);
    setIsZoomActive(false);
    setActiveTab('info');
    setAddedAnimation(false);
  }

  // Manejo de teclado (ESC para cerrar, Flechas para navegar)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen || !producto) return;
      if (e.key === 'Escape') {
        onClose();
      } else if (productosList.length > 1) {
        const currentIndex = productosList.findIndex(p => p.id_producto === producto.id_producto);
        if (e.key === 'ArrowLeft' && currentIndex > 0) {
          onSelectProducto?.(productosList[currentIndex - 1]);
        } else if (e.key === 'ArrowRight' && currentIndex < productosList.length - 1) {
          onSelectProducto?.(productosList[currentIndex + 1]);
        }
      }
    },
    [isOpen, producto, productosList, onClose, onSelectProducto]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isOpen || !producto) return null;

  const currentIndex = productosList.findIndex(p => p.id_producto === producto.id_producto);
  const prevProduct = currentIndex > 0 ? productosList[currentIndex - 1] : null;
  const nextProduct = currentIndex >= 0 && currentIndex < productosList.length - 1 ? productosList[currentIndex + 1] : null;

  const precioFinal = producto.precio_final || producto.precio_venta;
  const hasDiscount = !!(producto.descuento_porcentaje && producto.descuento_porcentaje > 0);
  const ahorroSoles = hasDiscount ? producto.precio_venta - precioFinal : 0;
  const stockInfo = getStockStatus(producto.stock || 0);
  const isAvailable = stockInfo.isAvailable;
  const totalSubtotal = precioFinal * cantidad;

  // Lógica de Movimiento del Ratón sobre la Imagen para el Zoom
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setMousePos({ x, y });
  };

  const handleAddToCartClick = () => {
    if (!isAvailable) return;
    onAddToCart?.(producto, cantidad);
    setAddedAnimation(true);
    setTimeout(() => setAddedAnimation(false), 1800);
  };

  const handleBuyNowClick = () => {
    if (!isAvailable) return;
    onBuyNow?.(producto, cantidad);
  };

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 md:p-8 bg-black/70 dark:bg-black/85 backdrop-blur-md animate-fadeIn transition-all duration-200"
      onClick={onClose}
    >
      {/* Contenedor Principal del Modal */}
      <div
        className="relative w-full max-w-5xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl sm:rounded-4xl shadow-2xl overflow-hidden flex flex-col transition-all text-zinc-900 dark:text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior Header Modal */}
        <div className="h-14 px-5 sm:px-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-950/60 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold uppercase tracking-wider text-[10px]">
              Detalle de Producto
            </span>
            <span className="text-zinc-400 hidden sm:inline">• SKU #{producto.id_producto}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Navegación Rápida Anterior / Siguiente */}
            {productosList.length > 1 && (
              <div className="flex items-center gap-1 bg-zinc-200/60 dark:bg-zinc-800/80 rounded-xl p-0.5 mr-2">
                <button
                  type="button"
                  disabled={!prevProduct}
                  onClick={() => prevProduct && onSelectProducto?.(prevProduct)}
                  title={prevProduct ? `Anterior: ${prevProduct.nombre}` : 'No hay anterior'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={!nextProduct}
                  onClick={() => nextProduct && onSelectProducto?.(nextProduct)}
                  title={nextProduct ? `Siguiente: ${nextProduct.nombre}` : 'No hay siguiente'}
                  className="p-1.5 rounded-lg text-zinc-600 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Botón Cerrar */}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Cuerpo del Modal (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 sm:pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-7 lg:gap-8 items-start">

            {/* ------------------------------------------------------------- */}
            {/* COLUMNA IZQUIERDA: VISOR DE IMAGEN CON ZOOM LIMPIO 1.8X (SIN CUADRO AZUL) */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-6 space-y-3.5">
              <div
                ref={imageContainerRef}
                onMouseEnter={() => setIsZoomActive(true)}
                onMouseLeave={() => setIsZoomActive(false)}
                onMouseMove={handleMouseMove}
                className="relative h-72 sm:h-96 w-full rounded-3xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 overflow-hidden flex items-center justify-center cursor-crosshair group shadow-inner select-none"
              >
                {producto.imagen_url ? (
                  <>
                    {/* Imagen Base */}
                    <Image
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      fill
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
                      priority
                      unoptimized
                      className={`object-contain p-4 transition-opacity duration-200 ${isZoomActive ? 'opacity-0' : 'opacity-100'
                        }`}
                    />

                    {/* Capa de Lupa / Zoom Ampliado en tiempo real 1.8x Limpio sin cuadro azul */}
                    {isZoomActive && (
                      <div
                        className="absolute inset-0 pointer-events-none bg-no-repeat transition-all duration-75"
                        style={{
                          backgroundImage: `url(${producto.imagen_url})`,
                          backgroundPosition: `${mousePos.x}% ${mousePos.y}%`,
                          backgroundSize: `${zoomLevel * 100}%`
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-2 p-8 text-center">
                    <Package className="w-16 h-16 text-blue-600/40 dark:text-blue-400/40 stroke-1" />
                    <span className="text-xs font-semibold uppercase tracking-wider">Sin Fotografía Oficial</span>
                  </div>
                )}

                {/* Badges Flotantes sobre la Imagen (Sin números en disponibilidad) */}
                <div className="absolute top-3 left-3 flex flex-col gap-1.5 pointer-events-none z-10">
                  {hasDiscount && (
                    <span className="bg-rose-600 text-white text-xs font-black px-2.5 py-1 rounded-xl shadow-md flex items-center gap-1">
                      <Flame className="w-3 h-3 fill-current" />
                      <span>-{producto.descuento_porcentaje}% OFF</span>
                    </span>
                  )}
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-lg shadow-xs flex items-center gap-1.5 backdrop-blur-xs ${stockInfo.badgeClass}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${stockInfo.dotClass}`} />
                    <span>{stockInfo.label}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------------------- */}
            {/* COLUMNA DERECHA: INFORMACIÓN, PESTAÑAS (DESCRIPCIÓN Y GARANTÍA), PRECIO Y COMPRA */}
            {/* ------------------------------------------------------------- */}
            <div className="lg:col-span-6 flex flex-col justify-between space-y-6">

              <div className="space-y-4">
                {/* Categoría */}
                <div>
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Nutrición & Rendimiento Deportivo</span>
                  </span>
                </div>

                {/* Título Principal del Producto */}
                <h2 className="text-2xl sm:text-3xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight leading-tight">
                  {producto.nombre}
                </h2>

                {/* Precios & Ahorro */}
                <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/70 border border-zinc-200/80 dark:border-zinc-800/80 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wider block">
                      Precio Oficial
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className={`text-3xl font-black font-mono ${hasDiscount ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                        S/ {precioFinal.toFixed(2)}
                      </span>
                      {hasDiscount && (
                        <span className="text-sm font-semibold text-zinc-400 line-through font-mono">
                          S/ {producto.precio_venta.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  {hasDiscount && (
                    <div className="text-right">
                      <span className="inline-block px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 font-black text-xs">
                        Ahorras S/ {ahorroSoles.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Pestañas Simplificadas: Solo Descripción y Entrega/Garantía */}
                <div className="space-y-3 pt-1">
                  <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setActiveTab('info')}
                      className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'info'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                      Descripción
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('garantia')}
                      className={`pb-2.5 px-3 border-b-2 transition-all cursor-pointer whitespace-nowrap ${activeTab === 'garantia'
                          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                          : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                        }`}
                    >
                      Entrega & Garantía
                    </button>
                  </div>

                  {/* Contenido Dinámico */}
                  <div className="text-xs text-zinc-600 dark:text-zinc-300 min-h-[90px] leading-relaxed pt-1">
                    {activeTab === 'info' && (
                      <div className="space-y-3">
                        <p>
                          {producto.descripcion ||
                            'Suplemento deportivo de alta concentración formulado para atletas de alto rendimiento y usuarios que buscan optimizar su masa muscular, recuperación y salud general.'}
                        </p>
                        <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60">
                            <span className="text-zinc-400 block text-[10px]">Disponibilidad:</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">
                              {stockInfo.label}
                            </span>
                          </div>
                          <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/60 dark:border-zinc-800/60">
                            <span className="text-zinc-400 block text-[10px]">Formato:</span>
                            <span className="font-bold text-zinc-800 dark:text-zinc-200">Envase original sellado</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeTab === 'garantia' && (
                      <div className="space-y-2">
                        <div className="flex items-start gap-2.5">
                          <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                          <div>
                            <strong className="block text-zinc-900 dark:text-zinc-100">Recojo Inmediato en Recepción</strong>
                            <p className="text-zinc-500">Tu compra queda registrada con tu DNI. Solo acércate al counter con tu comprobante digital y retiras tu producto al instante.</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección de Compra y Botones */}
              <div className="space-y-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
                {isAvailable ? (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      {/* Selector de Cantidad */}
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400">Cantidad:</span>
                        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1">
                          <button
                            type="button"
                            disabled={cantidad <= 1}
                            onClick={() => setCantidad(prev => Math.max(1, prev - 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-40 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-10 text-center font-mono font-bold text-sm text-zinc-900 dark:text-zinc-100">
                            {cantidad}
                          </span>
                          <button
                            type="button"
                            disabled={cantidad >= producto.stock}
                            onClick={() => setCantidad(prev => Math.min(producto.stock, prev + 1))}
                            className="w-8 h-8 rounded-lg bg-white dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 disabled:opacity-40 flex items-center justify-center text-xs font-bold transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Subtotal en tiempo real */}
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block">Total a Pagar</span>
                        <span className="text-xl font-black text-blue-600 dark:text-blue-400 font-mono">
                          S/ {totalSubtotal.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Botones de Acción */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <button
                        type="button"
                        onClick={handleAddToCartClick}
                        className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md ${addedAnimation
                            ? 'bg-emerald-600 text-white shadow-emerald-500/20'
                            : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                          }`}
                      >
                        {addedAnimation ? (
                          <>
                            <Check className="w-4 h-4" />
                            <span>¡Agregado al Carrito!</span>
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="w-4 h-4" />
                            <span>Agregar al Carrito</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleBuyNowClick}
                        className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 shadow-md shadow-blue-500/20"
                      >
                        <Zap className="w-4 h-4 fill-current" />
                        <span>Comprar Ahora con Stripe</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-2xl bg-zinc-100 dark:bg-zinc-800/80 text-center space-y-1">
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider block">Producto Agotado</span>
                    <p className="text-xs text-zinc-400">Pronto repondremos unidades de este suplemento en counter.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
