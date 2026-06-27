import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Database, FileSpreadsheet, Settings as SettingsIcon, Play, LogOut, BookOpen, ShieldCheck, History, Activity } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const userRaw = localStorage.getItem('user');
  const rol = userRaw ? JSON.parse(userRaw)?.rol : null;

  const navItems = [
    { id: 'laboratory', label: 'Búsqueda', icon: <Play size={20} />, path: '/laboratory' },
    { id: 'keywords', label: 'Diccionario Keywords', icon: <BookOpen size={20} />, path: '/keywords' },
    { id: 'history', label: 'Historial', icon: <History size={20} />, path: '/history' },
    { id: 'exports', label: 'Mis Exportaciones', icon: <FileSpreadsheet size={20} />, path: '/exports' },
    { id: 'quality', label: 'Calidad de Datos', icon: <Activity size={20} />, path: '/quality' },
    { id: 'settings', label: 'Configuración', icon: <SettingsIcon size={20} />, path: '/settings' },
  ];

  return (
    <aside className="w-72 bg-white border-r border-gray-200 hidden md:flex flex-col shrink-0 h-full">
      <div className="p-8 border-b border-gray-200 flex flex-col gap-2 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <div className="bg-uai-red p-2.5 rounded-xl text-white shadow-lg shadow-uai-red/20">
            <Database size={28} />
          </div>
          <span className="font-display font-black text-uai-red text-xl tracking-tighter leading-none">
            UAI <span className="text-gray-400 font-light">|</span> CAETI
          </span>
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Calidad y Ciencia de Datos</p>
      </div>

      <nav className="flex-1 p-4 space-y-2 mt-4">
        <p className="text-[10px] font-black text-gray-400 uppercase px-4 mb-4 tracking-widest">Navegación Sistema</p>

        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full text-left text-sm font-bold ${
                isActive
                  ? 'bg-uai-accent/50 text-uai-red border border-uai-red/10'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}

        {rol === 'ADMINISTRADOR' && (
          <>
            <p className="text-[10px] font-black text-gray-400 uppercase px-4 pt-4 pb-2 tracking-widest">Administración</p>
            <button
              onClick={() => navigate('/admin')}
              className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all w-full text-left text-sm font-bold ${
                location.pathname === '/admin'
                  ? 'bg-uai-accent/50 text-uai-red border border-uai-red/10'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <ShieldCheck size={20} /> Panel Admin
            </button>
          </>
        )}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-all font-bold text-sm"
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
