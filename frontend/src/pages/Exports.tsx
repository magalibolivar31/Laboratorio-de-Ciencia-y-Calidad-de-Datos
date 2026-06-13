import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Download, Search, Database, Settings as SettingsIcon, LogOut, ExternalLink, Calendar, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Exports: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [exportations, setExportations] = useState<any[]>([]);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    
    // Mock de exportaciones realizadas
    setExportations([
      {
        id: 1,
        query: "Diabetes Mellitus Tipo 2",
        fecha: "2024-06-10",
        datasets_encontrados: 15,
        archivo: "reporte_diabetes_20240610.xlsx",
        estado: "Completado"
      },
      {
        id: 2,
        query: "Inteligencia Artificial en Medicina",
        fecha: "2024-06-08",
        datasets_encontrados: 8,
        archivo: "ia_medicina_junio.xlsx",
        estado: "Completado"
      },
      {
        id: 3,
        query: "Estadísticas Educación Secundaria CABA",
        fecha: "2024-06-05",
        datasets_encontrados: 4,
        archivo: "educacion_caba_2024.xlsx",
        estado: "Completado"
      }
    ]);
  }, []);

  const handleDownload = (exp: any) => {
    // Simulamos la descarga del archivo que ya está en el servidor
    const content = `Reporte de Exportación\nTema: ${exp.query}\nFecha: ${exp.fecha}\nDatasets encontrados: ${exp.datasets_encontrados}\nArchivo: ${exp.archivo}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = exp.archivo.replace('.xlsx', '.txt'); // Simulamos el archivo
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('¿Estás seguro de que querés eliminar este registro de exportación?')) {
      setExportations(exportations.filter(e => e.id !== id));
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="bg-uai-red p-2 rounded-lg text-white">
            <Database size={24} />
          </div>
          <span className="font-display font-bold text-gray-800 leading-tight">LABORATORIO DATOS</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase px-3 mb-2">Principal</p>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full text-left font-medium">
            <Search size={18} /> Buscador
          </button>
          <button className="flex items-center gap-3 px-3 py-2 bg-uai-accent text-uai-red rounded-lg font-medium w-full text-left">
            <FileSpreadsheet size={18} /> Mis Exportaciones
          </button>
          <p className="text-xs font-bold text-gray-400 uppercase px-3 mb-2 mt-6">Administración</p>
          <button onClick={() => navigate('/settings')} className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full text-left font-medium">
            <SettingsIcon size={18} /> Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-display font-bold text-gray-800">Historial de Exportaciones</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{user?.nombre || 'Flor Gomez'}</p>
              <p className="text-xs text-gray-500">Investigadora UAI</p>
            </div>
            <div className="w-10 h-10 bg-uai-red rounded-full flex items-center justify-center text-white font-bold">
              {user?.nombre?.substring(0, 2).toUpperCase() || 'FG'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Búsqueda / Tema</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Fecha</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-center">Resultados</th>
                    <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {exportations.map((exp) => (
                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                            <FileSpreadsheet size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{exp.query}</p>
                            <p className="text-xs text-gray-500">{exp.archivo}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar size={14} /> {exp.fecha}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="px-2 py-1 bg-uai-accent text-uai-red text-xs font-bold rounded">
                          {exp.datasets_encontrados} datasets
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => handleDownload(exp)}
                            className="p-2 text-uai-red hover:bg-uai-accent rounded-lg transition-colors" 
                            title="Descargar Excel"
                          >
                            <Download size={18} />
                          </button>
                          <button 
                            onClick={() => handleDelete(exp.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                            title="Eliminar"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {exportations.length === 0 && (
                <div className="p-20 text-center">
                  <div className="inline-flex p-4 bg-gray-50 text-gray-300 rounded-full mb-4">
                    <FileSpreadsheet size={48} />
                  </div>
                  <p className="text-gray-500 font-medium">Aún no has realizado ninguna exportación.</p>
                  <button 
                    onClick={() => navigate('/dashboard')}
                    className="mt-4 text-uai-red font-bold hover:underline"
                  >
                    Ir al buscador ahora
                  </button>
                </div>
              )}
            </div>
            
            <div className="mt-8 bg-uai-accent/30 border border-uai-accent p-6 rounded-2xl flex items-start gap-4">
              <div className="text-uai-red mt-1">
                <Database size={24} />
              </div>
              <div>
                <h4 className="font-display font-bold text-uai-red">¿Sabías qué?</h4>
                <p className="text-sm text-red-800/80 leading-relaxed">
                  Todos los archivos Excel generados se guardan automáticamente en la carpeta <code className="bg-white/50 px-1 rounded">/exports</code> de tu servidor para que nunca pierdas tu trabajo de investigación.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Exports;
