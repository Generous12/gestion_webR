import React from 'react';
import PortalClient from './components/PortalClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Portal de Socios | Consulta de Membresía y Pase Digital',
  description: 'Consulta el estado de tu membresía de gimnasio, días restantes, código QR de acceso y renueva online con Stripe.'
};

export default function PortalPage() {
  return <PortalClient />;
}
