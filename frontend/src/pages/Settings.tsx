import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface UserInfo {
  nombre: string;
  email: string;
}

const Settings: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        setUser({ nombre: 'Flor Gomez', email: 'flor@uai.edu.ar' });
      }
    } else {
      setUser({ nombre: 'Flor Gomez', email: 'flor@uai.edu.ar' });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight">Configuración</h2>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-base font-black text-gray-800">{user?.nombre || 'Investigadora'}</p>
              <p className="text-xs text-uai-red font-black uppercase tracking-widest">Investigadora Principal</p>
            </div>
            <div className="w-12 h-12 bg-uai-red rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {user?.nombre?.substring(0, 2).toUpperCase() || 'FG'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-3xl space-y-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Perfil del Investigador</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                  <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" defaultValue={user?.nombre} readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Correo Institucional</label>
                  <input type="email" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold" defaultValue={user?.email} readOnly />
                </div>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6 text-center py-20">
              <p className="text-gray-400 font-bold italic">Opciones avanzadas de sistema en desarrollo...</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
