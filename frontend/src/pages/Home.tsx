import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Database, Cpu, ShieldCheck, Search, BarChart3 } from 'lucide-react';

const Home: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full relative overflow-hidden flex flex-col items-center justify-center">

      {/* Fondo */}
      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat scale-105 blur-[2px]"
        style={{ backgroundImage: "url('/fondo.png')" }}
      />
      <div className="absolute inset-0 z-10 bg-gradient-to-br from-black/85 via-black/65 to-uai-red/30" />

      {/* Sello UAI top-left */}
      <div className="absolute top-7 left-7 z-30">
        <div className="bg-white/95 backdrop-blur px-4 py-2.5 rounded-2xl shadow-xl border border-white/30 flex items-center gap-3">
          <img src="/logo.png" alt="UAI" className="h-9 object-contain" />
          <div className="border-l border-gray-200 pl-3 hidden sm:block">
            <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest leading-tight">Universidad Abierta</p>
            <p className="text-[9px] font-black text-uai-red uppercase tracking-widest leading-tight">Interamericana</p>
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-6 flex flex-col items-center">

        {/* Card glassmorphism */}
        <div className="w-full bg-white/[0.07] backdrop-blur-2xl rounded-[3rem] border border-white/10 shadow-2xl px-10 py-14 md:px-16 md:py-16 flex flex-col items-center text-center gap-8">

          {/* Badge institución */}
          <div className="flex items-center gap-2 bg-uai-red/20 border border-uai-red/30 backdrop-blur px-5 py-2 rounded-full">
            <span className="w-2 h-2 bg-uai-accent rounded-full animate-pulse" />
            <span className="text-xs font-black text-uai-accent uppercase tracking-[0.2em]">UAI · CAETI · Investigación</span>
          </div>

          {/* Nombre del laboratorio */}
          <div className="space-y-3">
            <h1 className="text-4xl md:text-6xl font-black text-white leading-tight tracking-tight">
              Laboratorio de
              <span className="block text-uai-accent">Calidad y Ciencia</span>
              <span className="block text-white/90">de Datos</span>
            </h1>
            <p className="text-sm font-bold text-white/40 uppercase tracking-[0.3em]">
              Centro de Altos Estudios en Tecnología Informática
            </p>
          </div>

          {/* Descripción */}
          <p className="text-lg md:text-xl text-white/70 font-medium max-w-xl leading-relaxed">
            Plataforma institucional para la búsqueda, análisis y generación de
            <span className="text-white font-bold"> datasets científicos </span>
            de calidad para investigación avanzada.
          </p>

          {/* CTA */}
          <button
            onClick={() => navigate('/login')}
            className="group bg-uai-red hover:bg-red-800 text-white px-10 py-5 rounded-2xl font-black text-lg flex items-center gap-3 transition-all shadow-[0_10px_40px_rgba(180,0,0,0.4)] hover:-translate-y-1 active:scale-95 border-b-4 border-red-950"
          >
            INGRESAR AL LABORATORIO
            <ArrowRight className="group-hover:translate-x-1.5 transition-transform" size={22} />
          </button>

          {/* Features */}
          <div className="grid grid-cols-3 gap-3 w-full pt-2">
            {[
              { icon: <Database size={16} />, label: 'Repositorio Científico' },
              { icon: <Search size={16} />, label: 'Búsqueda Multifuente' },
              { icon: <BarChart3 size={16} />, label: 'Calidad de Datos' },
              { icon: <Cpu size={16} />, label: 'Motor ETL con IA' },
              { icon: <ShieldCheck size={16} />, label: 'Acceso Seguro' },
              { icon: <ArrowRight size={16} />, label: 'Exportación Excel' },
            ].map((f, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5 bg-white/5 border border-white/8 rounded-xl px-3 py-3 text-center">
                <div className="text-uai-accent">{f.icon}</div>
                <span className="text-[10px] font-black text-white/60 uppercase tracking-wider leading-tight">{f.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer institucional */}
        <p className="mt-8 text-white/20 text-xs font-bold uppercase tracking-widest text-center">
          Universidad Abierta Interamericana · CAETI · Av. Montes de Oca 745, CABA
        </p>
      </div>

      {/* Watermark decorativo */}
      <div className="absolute bottom-6 right-8 z-20 hidden lg:block select-none pointer-events-none">
        <p className="text-white/[0.04] font-black text-9xl uppercase">CAETI</p>
      </div>
    </div>
  );
};

export default Home;
