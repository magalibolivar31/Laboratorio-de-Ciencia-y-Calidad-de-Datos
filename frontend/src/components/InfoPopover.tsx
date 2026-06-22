import React, { useState, useEffect } from 'react';
import { HelpCircle, X, Target, Calculator, Sparkles, Lightbulb } from 'lucide-react';
import { QUALITY_EXPLANATIONS } from '../lib/quality-explanations';

interface Props {
  metric: keyof typeof QUALITY_EXPLANATIONS;
  size?: number;
  light?: boolean; // variante para fondos oscuros (ej. el banner rojo)
}

const InfoPopover: React.FC<Props> = ({ metric, size = 14, light = false }) => {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false); // para la animación de entrada
  const exp = QUALITY_EXPLANATIONS[metric];

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => setShow(true), 10);
      return () => clearTimeout(t);
    }
    setShow(false);
  }, [open]);

  if (!exp) return null;

  const close = () => { setShow(false); setTimeout(() => setOpen(false), 150); };

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        aria-label={`Información sobre ${exp.title}`}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full transition-all align-middle ${light ? 'text-white/80 hover:text-white hover:bg-white/20' : 'text-gray-300 hover:text-uai-red hover:bg-uai-accent/60'}`}
      >
        <HelpCircle size={size} strokeWidth={2.5} />
      </button>

      {open && (
        <div
          className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-150 ${show ? 'opacity-100' : 'opacity-0'} bg-gray-900/50 backdrop-blur-sm`}
          onClick={close}
        >
          <div
            className={`bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-hidden flex flex-col transition-all duration-150 ${show ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header con acento */}
            <div className="relative bg-gradient-to-br from-uai-red to-red-800 p-5 text-white shrink-0">
              <button
                onClick={close}
                className="absolute top-4 right-4 p-1.5 text-white/70 hover:text-white hover:bg-white/15 rounded-lg transition-all"
                aria-label="Cerrar"
              >
                <X size={16} />
              </button>
              <div className="flex items-center gap-3 pr-8">
                <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
                  <HelpCircle size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="text-lg font-display font-black leading-tight">{exp.title}</h3>
                  {exp.iso && <p className="text-[11px] text-white/70 font-bold">{exp.iso}</p>}
                </div>
              </div>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-sm text-gray-700 font-semibold leading-relaxed">{exp.short}</p>

              <Row icon={<Target size={14} />} label="Qué mide" text={exp.mide} />
              <Row icon={<Calculator size={14} />} label="Cómo se calcula" text={exp.calculo} />
              <Row icon={<Sparkles size={14} />} label="Por qué importa" text={exp.importancia} />

              <div className="bg-uai-accent/40 rounded-xl p-3.5 flex gap-2.5">
                <Lightbulb size={16} className="text-uai-red shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] font-black text-uai-red uppercase tracking-wider mb-0.5">Ejemplo</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{exp.ejemplo}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

const Row: React.FC<{ icon: React.ReactNode; label: string; text: string }> = ({ icon, label, text }) => (
  <div className="flex gap-3">
    <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
    <div>
      <p className="text-xs font-black text-gray-700 mb-0.5">{label}</p>
      <p className="text-sm text-gray-600 leading-relaxed">{text}</p>
    </div>
  </div>
);

export default InfoPopover;
