'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { crearPaymentIntent, comprarProductosOnline, ItemCarritoCompra, ResultadoCompraProductosOnline } from '@/app/actions/stripe';
import StripePaymentForm from '@/components/stripe/StripePaymentForm';
import ThemeToggle from '@/components/theme/ThemeToggle';
import ProductoDetalleModal from '@/components/tienda/ProductoDetalleModal';
import { Producto } from '@/app/actions/productos';
import {
  Dumbbell,
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Package,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Zap,
  X,
  User,
  Mail,
  Phone,
  FileText,
  ShieldCheck,
  Eye
} from 'lucide-react';

interface TiendaClientProps {
  initialProductos: Producto[];
}

export default function TiendaClient({ initialProductos }: TiendaClientProps) {
  const [productos] = useState<Producto[]>(initialProductos);
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<ItemCarritoCompra[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Estado del Modal de Detalle / Zoom Interactivo
  const [selectedProductForModal, setSelectedProductForModal] = useState<Producto | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  // Estados del Checkout
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<1 | 2 | 3>(1); // 1: Datos, 2: Pago Stripe, 3: Confirmación

  // Datos del Comprador
  const [dni, setDni] = useState('');
  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');

  // Stripe
  const [clientSecret, setClientSecret] = useState<string>('');
  const [simulado, setSimulado] = useState<boolean>(false);
  const [loadingIntent, setLoadingIntent] = useState<boolean>(false);
  const [processingOrder, setProcessingOrder] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Orden Exitosa
  const [ordenExitosa, setOrdenExitosa] = useState<ResultadoCompraProductosOnline | null>(null);

  // Filtrar productos
  const filteredProducts = productos.filter(p =>
    p.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Carrito helpers
  const addToCart = (producto: Producto) => {
    addToCartWithQuantity(producto, 1);
  };

  const addToCartWithQuantity = (producto: Producto, cantidadToAdd = 1) => {
    const precioUnitario = producto.precio_final || producto.precio_venta;
    setCart(prev => {
      const existing = prev.find(item => item.id_producto === producto.id_producto);
      if (existing) {
        const nuevaCantidad = existing.cantidad + cantidadToAdd;
        if (nuevaCantidad > producto.stock) {
          alert(`Stock máximo disponible para ${producto.nombre} (${producto.stock} unidades).`);
          return prev.map(item =>
            item.id_producto === producto.id_producto
              ? { ...item, cantidad: producto.stock }
              : item
          );
        }
        return prev.map(item =>
          item.id_producto === producto.id_producto
            ? { ...item, cantidad: nuevaCantidad }
            : item
        );
      }
      return [
        ...prev,
        {
          id_producto: producto.id_producto,
          nombre: producto.nombre,
          precio_unitario: precioUnitario,
          cantidad: Math.min(cantidadToAdd, producto.stock),
          imagen_url: producto.imagen_url
        }
      ];
    });
    setIsCartOpen(true);
  };

  const handleOpenDetailModal = (producto: Producto) => {
    setSelectedProductForModal(producto);
    setIsDetailModalOpen(true);
  };

  const handleBuyNowFromModal = (producto: Producto, cantidadToBuy: number) => {
    setIsDetailModalOpen(false);
    addToCartWithQuantity(producto, cantidadToBuy);
    setTimeout(() => {
      setIsCartOpen(false);
      setCheckoutStep(1);
      setErrorMessage(null);
      setIsCheckoutModalOpen(true);
    }, 150);
  };

  const updateQuantity = (idProducto: number, delta: number) => {
    setCart(prev =>
      prev
        .map(item => {
          if (item.id_producto === idProducto) {
            const prodRef = productos.find(p => p.id_producto === idProducto);
            const newQty = item.cantidad + delta;
            if (prodRef && newQty > prodRef.stock) {
              alert(`Stock máximo alcanzado (${prodRef.stock}).`);
              return item;
            }
            return { ...item, cantidad: newQty };
          }
          return item;
        })
        .filter(item => item.cantidad > 0)
    );
  };

  const removeFromCart = (idProducto: number) => {
    setCart(prev => prev.filter(item => item.id_producto !== idProducto));
  };

  const totalItemsCount = cart.reduce((sum, i) => sum + i.cantidad, 0);
  const totalAmount = cart.reduce((sum, i) => sum + i.precio_unitario * i.cantidad, 0);

  // Iniciar Proceso de Checkout
  const handleOpenCheckout = () => {
    if (cart.length === 0) return;
    setIsCartOpen(false);
    setCheckoutStep(1);
    setErrorMessage(null);
    setIsCheckoutModalOpen(true);
  };

  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dni.trim() || !nombre.trim() || !email.trim() || !telefono.trim()) {
      setErrorMessage('Por favor completa todos tus datos personales requeridos.');
      return;
    }

    if (dni.trim().length < 8 || dni.trim().length > 12) {
      setErrorMessage('El DNI / documento debe tener entre 8 y 12 caracteres.');
      return;
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Por favor ingresa un correo electrónico válido (ej: nombre@correo.com).');
      return;
    }

    if (telefono.trim().length !== 9 || !/^\d{9}$/.test(telefono.trim())) {
      setErrorMessage('El número de teléfono debe constar exactamente de 9 dígitos numéricos.');
      return;
    }

    setLoadingIntent(true);
    setErrorMessage(null);

    try {
      const res = await crearPaymentIntent({
        monto: totalAmount,
        nombrePlan: `Tienda Gym - ${totalItemsCount} productos`,
        clienteEmail: email,
        clienteDni: dni
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else if (res.clientSecret) {
        setClientSecret(res.clientSecret);
        setSimulado(!!res.simulado);
        setCheckoutStep(2);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error al conectar con la pasarela de pagos.');
    } finally {
      setLoadingIntent(false);
    }
  };

  // Paso 2: Pago Exitoso en Stripe -> Registrar Venta en BD
  const handlePaymentSuccess = async (paymentIntentId: string) => {
    setProcessingOrder(true);
    setErrorMessage(null);

    try {
      const res = await comprarProductosOnline({
        dni,
        nombre,
        apellido,
        email,
        telefono,
        items: cart,
        stripePaymentIntentId: paymentIntentId
      });

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setOrdenExitosa(res);
        setCart([]); // Vaciar carrito
        setCheckoutStep(3);
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Error al registrar tu orden en el sistema.');
    } finally {
      setProcessingOrder(false);
    }
  };

  return (
    <div suppressHydrationWarning className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 pb-20 font-sans selection:bg-blue-600 selection:text-white transition-colors duration-200">
      
      {/* Header Sticky */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800/80 transition-colors duration-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Dumbbell className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 block leading-tight">GestionWeb</span>
              <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 block uppercase tracking-wider">Tienda de Suplementos</span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors hidden sm:inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver</span>
            </Link>

            {/* Dark / Light Mode Switch */}
            <ThemeToggle />

            {/* Botón Carrito Azul Admin */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Carrito</span>
              {totalItemsCount > 0 && (
                <span className="bg-white text-blue-600 rounded-full px-1.5 py-0.2 text-[10px] font-black">
                  {totalItemsCount}
                </span>
              )}
              <span className="font-mono hidden sm:inline">• S/ {totalAmount.toFixed(2)}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Hero & Search Banner */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-6 space-y-4 text-center">
        <div className="max-w-xl mx-auto space-y-2">
          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-widest inline-flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Catálogo Oficial de Tienda
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-zinc-900 dark:text-zinc-100 tracking-tight">
            Nutrición y Suplementos Deportivos
          </h1>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
            Compra online con Stripe y recoge tu pedido en la recepción del gimnasio indicando tu DNI.
          </p>
        </div>

        {/* Buscador Minimalista */}
        <div className="max-w-md mx-auto pt-2">
          <div className="relative flex items-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus-within:border-blue-500 dark:focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 rounded-2xl px-3.5 py-2.5 shadow-xs transition-all">
            <Search className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre o descripción..."
              className="w-full pl-2.5 bg-transparent text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de Productos */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        {filteredProducts.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredProducts.map(producto => {
              const inCartItem = cart.find(i => i.id_producto === producto.id_producto);
              const hasDiscount = !!(producto.descuento_porcentaje && producto.descuento_porcentaje > 0);
              const isAvailable = (producto.stock || 0) > 0;

              return (
                <div
                  key={producto.id_producto}
                  className="bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-5 flex flex-col justify-between transition-all hover:border-blue-300 dark:hover:border-blue-800 shadow-xs hover:shadow-md group"
                >
                  <div className="space-y-3.5">
                    {/* Imagen / Thumbnail con Badges y Lupa Zoom al Hover */}
                    <div
                      onClick={() => handleOpenDetailModal(producto)}
                      className="h-44 w-full bg-zinc-100 dark:bg-zinc-950 rounded-2xl overflow-hidden flex items-center justify-center relative border border-zinc-200/60 dark:border-zinc-800 cursor-pointer select-none"
                    >
                      {producto.imagen_url ? (
                        <img
                          src={producto.imagen_url}
                          alt={producto.nombre}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-1">
                          <Package className="w-8 h-8 text-blue-600/50 dark:text-blue-400/50" />
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-600">Suplemento</span>
                        </div>
                      )}



                      {/* Badge Descuento */}
                      {hasDiscount && (
                        <span className="absolute top-2.5 left-2.5 bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-xs flex items-center gap-1 z-10">
                          <span>-{producto.descuento_porcentaje}%</span>
                        </span>
                      )}

                      {/* Stock Badge (Sin números) */}
                      {producto.stock && producto.stock > 5 ? (
                        <span className="absolute top-2.5 right-2.5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-750 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-md z-10 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Con stock</span>
                        </span>
                      ) : producto.stock && producto.stock > 0 ? (
                        <span className="absolute top-2.5 right-2.5 bg-amber-50/95 dark:bg-zinc-900/95 border border-amber-200 dark:border-amber-900/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md z-10 flex items-center gap-1 shadow-2xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          <span>Poco stock</span>
                        </span>
                      ) : (
                        <span className="absolute top-2.5 right-2.5 bg-zinc-100 dark:bg-zinc-850 text-zinc-500 text-[10px] font-bold px-2 py-0.5 rounded-md border border-zinc-200 dark:border-zinc-750 z-10 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                          <span>Sin stock</span>
                        </span>
                      )}
                    </div>

                    <div>
                      <h3
                        onClick={() => handleOpenDetailModal(producto)}
                        className="font-bold text-zinc-900 dark:text-zinc-100 text-sm line-clamp-1 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors"
                      >
                        {producto.nombre}
                      </h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {producto.descripcion || 'Producto disponible para recojo en el counter.'}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 mt-4 flex items-center justify-between gap-2">
                    <div>
                      {hasDiscount ? (
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-black text-rose-600 dark:text-rose-400 font-mono">S/ {producto.precio_final?.toFixed(2)}</span>
                          <span className="text-xs text-zinc-400 line-through font-mono">S/ {producto.precio_venta.toFixed(2)}</span>
                        </div>
                      ) : (
                        <span className="text-base font-black text-blue-600 dark:text-blue-400 font-mono">S/ {producto.precio_venta.toFixed(2)}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {isAvailable ? (
                        inCartItem ? (
                          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-700">
                            <button
                              onClick={() => updateQuantity(producto.id_producto, -1)}
                              className="w-6 h-6 bg-white dark:bg-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-600 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-mono font-bold text-xs text-zinc-900 dark:text-zinc-100 px-1">
                              {inCartItem.cantidad}
                            </span>
                            <button
                              onClick={() => updateQuantity(producto.id_producto, 1)}
                              className="w-6 h-6 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(producto)}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-1 transition-all shadow-md shadow-blue-500/20 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Agregar</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg">
                          Sin stock
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 space-y-3">
            <Search className="w-8 h-8 mx-auto text-zinc-400" />
            <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">No se encontraron productos</h3>
            <p className="text-xs text-zinc-500">Prueba con otra búsqueda o limpia el filtro.</p>
          </div>
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* DRAWER / CARRITO FLOTANTE */}
      {/* ------------------------------------------------------------- */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            onClick={() => setIsCartOpen(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white dark:bg-zinc-950 border-l border-zinc-200 dark:border-zinc-800 p-6 flex flex-col justify-between shadow-2xl animate-fadeIn">
              
              {/* Header Carrito */}
              <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Mi Carrito de Compras</h3>
                  <span className="bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300 text-xs px-2 py-0.5 rounded-full font-mono font-bold">
                    {totalItemsCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items Lista */}
              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {cart.length > 0 ? (
                  cart.map(item => (
                    <div
                      key={item.id_producto}
                      className="p-3.5 bg-zinc-50 dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs truncate">{item.nombre}</h4>
                        <p className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                          S/ {(item.precio_unitario * item.cantidad).toFixed(2)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <div className="flex items-center gap-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg p-0.5">
                          <button
                            onClick={() => updateQuantity(item.id_producto, -1)}
                            className="w-5 h-5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center justify-center cursor-pointer"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="font-mono text-xs font-bold px-1 text-zinc-900 dark:text-zinc-100">{item.cantidad}</span>
                          <button
                            onClick={() => updateQuantity(item.id_producto, 1)}
                            className="w-5 h-5 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded flex items-center justify-center cursor-pointer"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        <button
                          onClick={() => removeFromCart(item.id_producto)}
                          className="p-1.5 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-zinc-400 space-y-2">
                    <ShoppingCart className="w-8 h-8 mx-auto text-zinc-300 dark:text-zinc-700" />
                    <p className="text-xs">El carrito está vacío.</p>
                  </div>
                )}
              </div>

              {/* Footer Carrito */}
              {cart.length > 0 && (
                <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500 font-medium">Subtotal</span>
                    <span className="font-mono font-black text-lg text-blue-600 dark:text-blue-400">
                      S/ {totalAmount.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={handleOpenCheckout}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceder al Pago con Stripe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE CHECKOUT STRIPE */}
      {/* ------------------------------------------------------------- */}
      {isCheckoutModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 animate-fadeIn">
            
            {/* Header Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  {checkoutStep === 1 ? 'Tus Datos para Recojo' : checkoutStep === 2 ? 'Pago Seguro Stripe' : 'Orden Confirmada'}
                </h3>
              </div>
              <button
                onClick={() => setIsCheckoutModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {errorMessage && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400">
                {errorMessage}
              </div>
            )}

            {/* Paso 1: Datos Personales */}
            {checkoutStep === 1 && (
              <form onSubmit={handleProceedToPayment} className="space-y-4">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/30 flex items-center justify-between text-xs">
                  <span className="text-zinc-500">Total a Pagar ({totalItemsCount} items):</span>
                  <span className="font-mono font-black text-blue-600 dark:text-blue-400 text-sm">S/ {totalAmount.toFixed(2)}</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">DNI / Documento de Identidad *</label>
                  <div className="relative flex items-center">
                    <FileText className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      required
                      maxLength={12}
                      placeholder="Ej. 74829103"
                      value={dni}
                      onChange={(e) => setDni(e.target.value.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12))}
                      className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Nombres *</label>
                    <div className="relative flex items-center">
                      <User className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                      <input
                        type="text"
                        required
                        placeholder="Ej. Carlos"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, ''))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Apellidos</label>
                    <input
                      type="text"
                      placeholder="Ej. Mendoza Ramos"
                      value={apellido}
                      onChange={(e) => setApellido(e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]/g, ''))}
                      className="w-full px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Correo Electrónico *</label>
                    <div className="relative flex items-center">
                      <Mail className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                      <input
                        type="email"
                        required
                        placeholder="carlos@correo.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">Teléfono *</label>
                    <div className="relative flex items-center">
                      <Phone className="w-4 h-4 text-zinc-400 absolute left-3 pointer-events-none" />
                      <input
                        type="tel"
                        required
                        maxLength={9}
                        placeholder="987654321"
                        value={telefono}
                        onChange={(e) => setTelefono(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2">
                  <button
                    type="submit"
                    disabled={loadingIntent}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    {loadingIntent ? (
                      <>
                        <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                        <span>Conectando...</span>
                      </>
                    ) : (
                      <>
                        <span>Continuar al Pago</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* Paso 2: Stripe Form */}
            {checkoutStep === 2 && clientSecret && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-zinc-500 block text-[10px]">Titular:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{nombre} {apellido}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-zinc-500 block text-[10px]">Total:</span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">S/ {totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                <StripePaymentForm
                  clientSecret={clientSecret}
                  monto={totalAmount}
                  simulado={simulado}
                  onSuccess={handlePaymentSuccess}
                  onError={(err) => setErrorMessage(err)}
                  loading={processingOrder}
                  setLoading={setProcessingOrder}
                />

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setCheckoutStep(1)}
                    className="text-xs text-zinc-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Modificar datos de contacto</span>
                  </button>
                </div>
              </div>
            )}

            {/* Paso 3: Confirmación de Compra */}
            {checkoutStep === 3 && ordenExitosa && (
              <div className="text-center space-y-5">
                <div className="w-14 h-14 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">¡Compra Confirmada!</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    Tu comprobante ha sido emitido con éxito y enviado a <strong>{email}</strong>.
                  </p>
                </div>

                <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-200 dark:border-blue-900/30 text-left space-y-2">
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
                    Instrucciones de Retiro:
                  </span>
                  <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    Acércate a la recepción del gimnasio e indica tu <strong>DNI ({dni})</strong> para que el personal te entregue tus productos.
                  </p>
                </div>

                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  Entendido, volver a la tienda
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal de Detalle & Zoom de Producto */}
      <ProductoDetalleModal
        producto={selectedProductForModal}
        productosList={filteredProducts}
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        onAddToCart={(prod, qty) => addToCartWithQuantity(prod, qty)}
        onBuyNow={(prod, qty) => handleBuyNowFromModal(prod, qty)}
        onSelectProducto={(prod) => setSelectedProductForModal(prod)}
      />
    </div>
  );
}
