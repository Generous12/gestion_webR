'use client';

import React, { useState, useEffect } from 'react';
import { ContactoWeb } from '@/types/gym.types';
import {
  X,
  Mail,
  ExternalLink,
  MessageSquare,
  Copy,
  Check,
  Sparkles,
  Eye,
  Edit3,
  Dumbbell
} from 'lucide-react';

interface EmailDesignerModalProps {
  contacto: ContactoWeb | null;
  isOpen: boolean;
  onClose: () => void;
  onMarkAsContacted?: (id: number) => void;
}

type TemplateType = 'MEMBRESIAS' | 'ENTRENAMIENTO' | 'TIENDA' | 'CUSTOM';

const TEMPLATES: Record<TemplateType, { name: string; subject: string; body: string; ctaText: string; ctaUrl: string }> = {
  MEMBRESIAS: {
    name: '🌟 Info de Membresías & Promociones',
    subject: '¡Tu Pase a una Vida Fitness! Info de Membresías | GestionWeb Gym',
    body: '¡Muchas gracias por contactarnos e interesarte en formar parte de nuestra comunidad!\n\nContamos con planes flexibles (Mensual, Trimestral y Anual VIP) diseñados para ajustarse a tus objetivos. Todas nuestras membresías incluyen acceso ilimitado a sala de musculación, pesas libres, cardio hi-tech, vestidores con duchas calientes y evaluación física inicial sin costo adicional.\n\nActualmente tenemos promociones exclusivas con matrícula gratis si te registras esta semana.',
    ctaText: 'Ver Planes e Inscribirme Online',
    ctaUrl: 'https://gestionweb-gym.com/unete'
  },
  ENTRENAMIENTO: {
    name: '💪 Asesoría de Entrenamiento',
    subject: 'Asesoría y Rutinas Personalizadas | GestionWeb Gym',
    body: '¡Hola! Nos alegra mucho tu interés en entrenar con nosotros.\n\nContamos con entrenadores certificados en piso en todos los horarios para guiar tu técnica desde el primer día, diseñar una rutina adaptada a tus metas (ganancia de masa muscular, pérdida de grasa o acondicionamiento) y medir tu progreso periódicamente.\n\nTe invitamos a visitarnos con tu DNI para conocer las instalaciones y recibir una sesión demostrativa guiada.',
    ctaText: 'Agendar Visita Guiada Gratis',
    ctaUrl: 'https://gestionweb-gym.com#contacto'
  },
  TIENDA: {
    name: '🥤 Suplementos y Nutrición',
    subject: 'Consulta sobre Suplementos y Tienda Oficial | GestionWeb Gym',
    body: '¡Hola! Recibimos tu consulta acerca de nuestros suplementos deportivos y nutrición.\n\nContamos con amplio stock en tienda de proteínas Whey Isolate, creatinas micronizadas Creapure®, pre-entrenos, aminoácidos y accesorios oficiales 100% garantizados. Puedes adquirirlos en línea o recogerlos directamente en nuestro counter de recepción.',
    ctaText: 'Explorar Catálogo de Suplementos',
    ctaUrl: 'https://gestionweb-gym.com/tienda'
  },
  CUSTOM: {
    name: '✍️ Mensaje Personalizado',
    subject: 'Respuesta a tu consulta | GestionWeb Gym',
    body: '',
    ctaText: 'Visitar GestionWeb Gym',
    ctaUrl: 'https://gestionweb-gym.com'
  }
};

export default function EmailDesignerModal({
  contacto,
  isOpen,
  onClose,
  onMarkAsContacted
}: EmailDesignerModalProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('MEMBRESIAS');
  const [subject, setSubject] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  // Inicializar valores al abrir el modal con el contacto seleccionado
  useEffect(() => {
    if (contacto) {
      const template = TEMPLATES[selectedTemplate];
      setSubject(`Respuesta a tu consulta sobre ${contacto.motivo} | GestionWeb Gym`);
      setBodyText(template.body);
    }
  }, [contacto, selectedTemplate]);

  if (!isOpen || !contacto) return null;

  const currentTemplate = TEMPLATES[selectedTemplate];

  const handleTemplateChange = (type: TemplateType) => {
    setSelectedTemplate(type);
    const tmpl = TEMPLATES[type];
    setSubject(
      type === 'CUSTOM'
        ? `Respuesta a tu consulta | GestionWeb Gym`
        : tmpl.subject
    );
    setBodyText(tmpl.body);
  };

  // Genera el HTML enriquecido estilo gran empresa para Gmail
  const generateRichHtmlEmail = () => {
    const formattedParagraphs = bodyText
      .split('\n\n')
      .map(p => `<p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #374151;">${p.replace(/\n/g, '<br/>')}</p>`)
      .join('');

    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
    <!-- Header Corporativo -->
    <tr>
      <td style="background-color: #09090b; padding: 24px 32px; text-align: left; border-bottom: 2px solid #2563eb;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0">
          <tr>
            <td style="vertical-align: middle;">
              <div style="display: inline-block; font-size: 20px; font-weight: 900; color: #ffffff; letter-spacing: -0.5px;">
                ⚡ GESTIONWEB <span style="color: #60a5fa; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px;">FITNESS</span>
              </div>
            </td>
            <td style="text-align: right; vertical-align: middle;">
              <span style="display: inline-block; background-color: #1e293b; color: #93c5fd; font-size: 11px; font-weight: 700; padding: 4px 12px; border-radius: 9999px; border: 1px solid #334155;">
                Atención al Cliente
              </span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Banner con Imagen de Gimnasio -->
    <tr>
      <td>
        <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop" alt="Gym Atmosphere" style="width: 100%; height: 180px; object-fit: cover; display: block;" />
      </td>
    </tr>

    <!-- Contenido Principal -->
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 800; color: #111827;">
          ¡Hola ${contacto.nombre}! 👋
        </h2>

        <!-- Tarjeta de Referencia a su Consulta -->
        <div style="background-color: #f0f9ff; border-left: 4px solid #0284c7; padding: 14px 18px; border-radius: 8px; margin-bottom: 24px;">
          <p style="margin: 0; font-size: 13px; color: #0369a1; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
            Tu Consulta sobre: ${contacto.motivo}
          </p>
          <p style="margin: 6px 0 0 0; font-size: 13px; color: #475569; font-style: italic;">
            "${contacto.mensaje}"
          </p>
        </div>

        <!-- Párrafos del Mensaje -->
        ${formattedParagraphs}

        <!-- Botón de Acción Call-to-Action (Estilo Corporativo) -->
        <div style="text-align: center; margin: 32px 0 24px 0;">
          <a href="${currentTemplate.ctaUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; font-size: 14px; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 12px; box-shadow: 0 4px 12px rgba(37,99,235,0.3);">
            ${currentTemplate.ctaText} →
          </a>
        </div>

        <p style="margin: 0; font-size: 13px; color: #6b7280; text-align: center;">
          ¿Prefieres escribirnos directo? Puedes responder a este correo o escribir a nuestro WhatsApp: <strong>+51 987 654 321</strong>
        </p>
      </td>
    </tr>

    <!-- Footer Corporativo -->
    <tr>
      <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="margin: 0 0 6px 0; font-size: 12px; font-weight: 700; color: #1e293b;">
          GestionWeb Fitness Club • Sede Central
        </p>
        <p style="margin: 0 0 12px 0; font-size: 12px; color: #64748b;">
          Av. Principal 1234, Lima, Perú | Horarios: Lun-Sáb 6:00 AM – 10:00 PM
        </p>
        <p style="margin: 0; font-size: 11px; color: #94a3b8;">
          © ${new Date().getFullYear()} GestionWeb Gym. Todos los derechos reservados.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
  };

  // Copia al portapapeles en formato HTML real para pegar directo en el redactor de Gmail
  const handleCopyRichHtml = async () => {
    const htmlContent = generateRichHtmlEmail();
    const plainContent = `¡Hola ${contacto.nombre}!\n\nRespecto a tu consulta sobre "${contacto.motivo}":\n\n${bodyText}\n\n${currentTemplate.ctaText}: ${currentTemplate.ctaUrl}\n\nAtentamente,\nGestionWeb Fitness Club\nAv. Principal 1234, Lima, Perú | Tel: +51 987 654 321`;

    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const blobHtml = new Blob([htmlContent], { type: 'text/html' });
        const blobText = new Blob([plainContent], { type: 'text/plain' });
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': blobHtml,
            'text/plain': blobText
          })
        ]);
      } else {
        await navigator.clipboard.writeText(plainContent);
      }
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3500);
    } catch {
      // Fallback
      await navigator.clipboard.writeText(plainContent);
      setCopiedHtml(true);
      setTimeout(() => setCopiedHtml(false), 3500);
    }
  };

  const handleOpenGmail = () => {
    const gmailBody = `Hola ${contacto.nombre},\n\nRespecto a tu consulta sobre "${contacto.motivo}":\n\n${bodyText}\n\n${currentTemplate.ctaText}: ${currentTemplate.ctaUrl}\n\nAtentamente,\nEquipo de Atención al Cliente - GestionWeb Gym\nAv. Principal 1234, Lima, Perú\nTel / WhatsApp: +51 987 654 321\nhttps://gestionweb-gym.com`;
    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(contacto.email)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(gmailBody)}`;
    window.open(gmailUrl, '_blank');
    onMarkAsContacted?.(contacto.id_contacto);
    onClose();
  };

  return (
    <div
      suppressHydrationWarning
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[92vh] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-zinc-900 dark:text-zinc-100"
        onClick={e => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="h-16 px-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/90 dark:bg-zinc-950/60 backdrop-blur-xs shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-600/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span>Diseñador de Correo Corporativo</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800">
                  Gmail HTML
                </span>
              </h2>
              <p className="text-xs text-zinc-500">
                Destinatario: <strong className="text-zinc-800 dark:text-zinc-200">{contacto.nombre}</strong> &lt;{contacto.email}&gt;
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Selector de Pestañas Editor / Vista Previa */}
            <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editor</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-xs'
                    : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Vista Previa con Logo</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Contenido Principal Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'editor' ? (
            <>
              {/* Card Resumen de la consulta del cliente */}
              <div className="p-4 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/80 dark:border-blue-900/40 space-y-1 text-xs">
                <span className="font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Consulta Web #{contacto.id_contacto} • Motivo: {contacto.motivo}
                </span>
                <p className="text-zinc-700 dark:text-zinc-300 font-medium italic mt-1 bg-white/80 dark:bg-zinc-900/60 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30">
                  &quot;{contacto.mensaje}&quot;
                </p>
              </div>

              <div className="space-y-4">
                {/* Selector de Plantillas */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Seleccionar Plantilla Corporativa
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    {(Object.keys(TEMPLATES) as TemplateType[]).map(key => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => handleTemplateChange(key)}
                        className={`p-2.5 rounded-xl text-left text-xs font-semibold border transition-all cursor-pointer ${
                          selectedTemplate === key
                            ? 'border-blue-600 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold shadow-xs'
                            : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 hover:border-zinc-300 dark:hover:border-zinc-700'
                        }`}
                      >
                        {TEMPLATES[key].name}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Asunto del Correo */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Asunto del Correo
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600"
                  />
                </div>

                {/* Cuerpo del Mensaje */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center justify-between">
                    <span>Mensaje Personalizado (Editable)</span>
                    <span className="text-[11px] font-normal text-zinc-400">
                      Puedes personalizar los párrafos
                    </span>
                  </label>
                  <textarea
                    rows={6}
                    value={bodyText}
                    onChange={e => setBodyText(e.target.value)}
                    placeholder="Escribe aquí tu respuesta personalizada..."
                    className="w-full p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-blue-600 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Vista Previa Visual del Correo con Imágenes y Branding */
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white text-zinc-900 shadow-sm max-w-xl mx-auto">
              {/* Header con Logo */}
              <div className="bg-zinc-950 p-4 border-b-2 border-blue-600 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
                    <Dumbbell className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-white font-black text-sm tracking-tight">GESTIONWEB <span className="text-blue-400 text-xs font-bold">FITNESS</span></span>
                </div>
                <span className="bg-zinc-800 text-blue-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                  Atención al Cliente
                </span>
              </div>

              {/* Banner Imagen */}
              <img
                src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=800&auto=format&fit=crop"
                alt="Gym Banner"
                className="w-full h-36 object-cover"
              />

              {/* Contenido */}
              <div className="p-6 space-y-4 text-xs">
                <h3 className="font-extrabold text-base text-zinc-900">
                  ¡Hola {contacto.nombre}! 👋
                </h3>

                <div className="p-3 bg-sky-50 border-l-4 border-sky-600 rounded-r-lg text-sky-950 space-y-0.5">
                  <span className="font-bold text-[10px] text-sky-700 uppercase tracking-wider block">
                    Tu Consulta sobre: {contacto.motivo}
                  </span>
                  <p className="italic text-[11px] text-zinc-600">
                    &quot;{contacto.mensaje}&quot;
                  </p>
                </div>

                <div className="text-zinc-700 leading-relaxed space-y-2 whitespace-pre-line">
                  {bodyText}
                </div>

                {/* Botón CTA */}
                <div className="pt-3 text-center">
                  <span className="inline-block bg-blue-600 text-white font-bold px-6 py-2.5 rounded-xl shadow-md shadow-blue-500/20 text-xs">
                    {currentTemplate.ctaText} →
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-zinc-50 p-4 border-t border-zinc-200 text-center text-[10px] text-zinc-500 space-y-1">
                <p className="font-bold text-zinc-800">GestionWeb Fitness Club • Sede Central</p>
                <p>Av. Principal 1234, Lima, Perú | Central: +51 987 654 321</p>
                <p>© {new Date().getFullYear()} GestionWeb Gym. Todos los derechos reservados.</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Barra de Acciones */}
        <div className="h-16 px-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Para:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{contacto.email}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Botón Copiar Formato HTML para Pegar en Gmail */}
            <button
              type="button"
              onClick={handleCopyRichHtml}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                copiedHtml
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
              }`}
            >
              {copiedHtml ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>¡HTML Corporativo Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Copiar Formato con Logo (Ctrl+V)</span>
                </>
              )}
            </button>

            {/* Botón Abrir en Gmail */}
            <button
              type="button"
              onClick={handleOpenGmail}
              className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold flex items-center gap-2 shadow-md shadow-red-500/25 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Abrir en Gmail</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
