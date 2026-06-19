import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

interface GlobalLayoutProps {
  children: React.ReactNode;
}

const GlobalLayout: React.FC<GlobalLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // No mostramos el header global en la Home para no tapar el diseño Glassmorphism especial
  // Pero sí en el resto del sitio
  const isHome = location.pathname === '/';

  return (
    <div className="relative min-h-screen w-full flex flex-col">
      {/* NAVBAR GLOBAL INSTITUCIONAL */}
      {!isHome && (
        <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-100 z-[60] px-6 flex items-center shadow-sm">
          <div 
            onClick={() => navigate('/')} 
            className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
            title="Volver al Inicio"
          >
            <div className="bg-white p-1.5 rounded-lg shadow-inner border border-gray-50">
              <img src="/logo.png" alt="Universidad Abierta Interamericana" className="h-10 object-contain" />
            </div>
            <div className="hidden sm:block border-l border-gray-200 pl-3">
              <p className="text-[10px] font-black text-uai-red uppercase leading-none tracking-tighter">Universidad Abierta</p>
              <p className="text-[10px] font-black text-uai-red uppercase leading-none tracking-tighter">Interamericana</p>
            </div>
          </div>
        </header>
      )}

      {/* CONTENIDO DE LA PÁGINA */}
      <main className={`flex-1 ${!isHome ? 'pt-16' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default GlobalLayout;
