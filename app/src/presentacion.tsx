import React from 'react';
import Link from 'next/link';

export default function Presentacion() {
  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      {/* Navbar */}
      <nav className="flex justify-between items-center p-6 lg:px-12 bg-white shadow-sm sticky top-0 z-50">
        <div className="text-2xl font-bold text-blue-600 tracking-tighter">
          GestionWeb.
        </div>
        <div className="hidden md:flex gap-8 font-medium text-gray-600">
          <a href="#inicio" className="hover:text-blue-600 transition-colors">Inicio</a>
          <a href="#caracteristicas" className="hover:text-blue-600 transition-colors">Características</a>
          <a href="#nosotros" className="hover:text-blue-600 transition-colors">Nosotros</a>
        </div>
        <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5">
          Comenzar
        </Link>
      </nav>

      {/* Hero Section */}
      <section id="inicio" className="flex flex-col items-center text-center px-4 py-32 lg:py-48 bg-gradient-to-b from-blue-50 to-white">
        <div className="inline-block mb-4 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-semibold tracking-wide uppercase">
          La nueva forma de gestionar
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-gray-900 leading-tight">
          Simplifica tu trabajo con <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-blue-400">GestionWeb</span>
        </h1>
        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mb-10 leading-relaxed">
          Una plataforma integral diseñada para optimizar tus procesos, aumentar tu productividad y llevar tu negocio al siguiente nivel con una interfaz limpia y moderna.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <Link href="/login" className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg hover:shadow-blue-500/30 transform hover:-translate-y-1">
            Empieza Gratis
          </Link>
          <button className="bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-sm transform hover:-translate-y-1">
            Ver Demo
          </button>
        </div>
      </section>

      {/* Features Section */}
      <section id="caracteristicas" className="py-24 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Todo lo que necesitas, en un solo lugar</h2>
          <p className="text-gray-500 max-w-xl mx-auto">Descubre las herramientas diseñadas específicamente para impulsar el crecimiento de tu proyecto sin complicaciones.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-10">
          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Rápido y Eficiente</h3>
            <p className="text-gray-600 leading-relaxed">
              Optimizado para la máxima velocidad, garantizando que tu flujo de trabajo nunca se interrumpa.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Seguridad Total</h3>
            <p className="text-gray-600 leading-relaxed">
              Tus datos están protegidos con los estándares de seguridad más altos de la industria.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 group">
            <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
              <svg className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold mb-3 text-gray-900">Datos en la Nube</h3>
            <p className="text-gray-600 leading-relaxed">
              Accede a tu información desde cualquier lugar y en cualquier momento, de forma segura.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-blue-600 py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">¿Listo para transformar tu negocio?</h2>
          <p className="text-blue-100 text-lg mb-10 max-w-2xl mx-auto">
            Únete a cientos de empresas que ya están mejorando su productividad con nuestra plataforma.
          </p>
          <Link href="/login" className="inline-block bg-white text-blue-600 px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-50 transition-all shadow-lg transform hover:-translate-y-1">
            Crear mi cuenta gratis
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 py-12 px-6 border-t border-gray-200">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center">
          <div className="text-2xl font-bold text-blue-600 tracking-tighter mb-4 md:mb-0">
            GestionWeb.
          </div>
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} GestionWeb. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
