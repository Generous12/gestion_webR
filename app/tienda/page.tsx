import React from 'react';
import { obtenerProductosTienda } from '@/app/actions/stripe';
import TiendaClient from './components/TiendaClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tienda Online & Suplementos | Compra con Stripe',
  description: 'Compra suplementos deportivos, proteínas, bebidas y accesorios del gimnasio online con pago seguro por tarjeta Stripe.'
};

export default async function TiendaPage() {
  const productos = await obtenerProductosTienda();

  return <TiendaClient initialProductos={productos} />;
}
