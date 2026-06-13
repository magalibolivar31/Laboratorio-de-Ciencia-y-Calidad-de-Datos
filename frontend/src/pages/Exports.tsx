import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface ExportItem {
  id: number;
  nombre_archivo: string;
  fecha: string;
  tamaño: string;
  url: string;
}

interface UserInfo {
  nombre: string;
  email: string;
}

const Exports: React.FC = () => {
  const [exports, setExports] = useState<ExportItem[]>([]);
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

    // Datos de ejemplo
    setExports([
      { id: 1, nombre_archivo: 'REPOSITORIO_SALUD_2024.xlsx', fecha: '2024-06-12', tamaño: '1.2 MB', url: '#' },
      { id: 2, nombre_archivo: 'BUSQUEDA_DIABETES.xlsx', fecha: '2024-06-11', tamaño: '850 KB', url: '#' },
    ]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight">Mis Exportaciones</h2>
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
          <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-2 border-gray-200 uppercase font-black text-gray-600 text-xs">
                  <th className="p-6">Archivo</th>
                  <th className="p-6">Fecha de Generación</th>
                  <th className="p-6">Tamaño</th>
                  <th className="p-6 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {exports.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-6 font-bold text-gray-800">{item.nombre_archivo}</td>
                    <td className="p-6 text-gray-600">{item.fecha}</td>
                    <td className="p-6 text-gray-600">{item.tamaño}</td>
                    <td className="p-6 text-center">
                      <button className="bg-gray-900 text-white px-6 py-2 rounded-xl font-bold hover:bg-black transition-all">
                        Descargar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Exports;
