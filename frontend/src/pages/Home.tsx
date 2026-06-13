import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ShieldCheck, Cpu } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center">
      
      {/* LOGO INSTITUCIONAL SUPERIOR (FIJO) */}
      <div className="absolute top-10 left-10 z-30 animate-fade-in">
        <img src="/logo.png" alt="Logo UAI" className="h-12 md:h-16 object-contain" />
      </div>

      {/* IMAGEN DE FONDO CON DESENFOQUE SUTIL */}
      <div 
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-transform duration-[20s] scale-105 blur-[3px]"
        style={{ backgroundImage: "url('/fondo.png')" }}
      />
      
      {/* CAPA DE OSCURECIMIENTO */}
      <div className="absolute inset-0 z-10 bg-black/60 bg-gradient-to-br from-black/80 via-transparent to-uai-red/20" />

      {/* CONTENIDO PRINCIPAL EN TARJETA GLASS */}
      <div className="relative z-20 container mx-auto px-6 flex flex-col items-center">
        <div className="bg-black/40 backdrop-blur-xl p-10 md:p-16 rounded-[4rem] border border-white/10 shadow-2xl flex flex-col items-center text-center space-y-10 max-w-5xl">
          
          {/* LOGO CENTRAL */}
          <div className="space-y-4 animate-fade-in-down">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-white p-4 md:p-6 rounded-[2.5rem] shadow-2xl border-4 border-uai-accent/30 overflow-hidden">
                <img src="/logo.png" alt="UAI CAETI" className="h-20 md:h-28 object-contain" />
              </div>
              <div className="text-white mt-8 text-center space-y-2 w-full">
                <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none text-uai-accent">
                  CAETI
                </h1>
                <p className="text-xl md:text-3xl font-bold uppercase tracking-[0.4em] text-white opacity-90">
                  Laboratorio de Ciencias de Datos
                </p>
              </div>
            </div>
          </div>

          {/* DESCRIPCIÓN */}
          <div className="max-w-3xl animate-fade-in-up delay-200">
            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight">
              Análisis, calidad y generación de <span className="text-uai-accent underline decoration-4 decoration-uai-accent/30 italic">datasets científicos</span> para investigación avanzada.
            </h2>
          </div>

          {/* BOTÓN DE ACCESO */}
          <div className="animate-fade-in-up delay-500">
            <button 
              onClick={() => navigate('/login')}
              className="group bg-uai-red text-white px-12 py-6 rounded-3xl font-black text-2xl flex items-center gap-4 hover:bg-red-800 transition-all shadow-[0_20px_50px_rgba(128,0,32,0.4)] hover:-translate-y-2 active:scale-95 border-b-4 border-red-950"
            >
              INGRESAR AL LABORATORIO
              <ArrowRight className="group-hover:translate-x-2 transition-transform" size={28} />
            </button>
          </div>
        </div>

        {/* CARACTERÍSTICAS INFERIORES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-16 animate-fade-in delay-700">
          {[
            { icon: <BookOpen />, text: "Repositorio Público" },
            { icon: <Cpu />, text: "Procesamiento IA" },
            { icon: <ShieldCheck />, text: "Datos Certificados" }
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-3 text-white font-bold uppercase tracking-widest text-sm bg-uai-red/40 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/5">
              <div className="p-2 bg-white/10 rounded-lg">{item.icon}</div>
              {item.text}
            </div>
          ))}
        </div>
      </div>

      {/* TEXTO DECORATIVO INFERIOR */}
      <div className="absolute bottom-10 left-10 z-20 hidden lg:block">
        <p className="text-white/10 font-black text-8xl opacity-10 select-none uppercase">
          CAETI LAB
        </p>
      </div>
    </div>
  );
};

export default Home;
