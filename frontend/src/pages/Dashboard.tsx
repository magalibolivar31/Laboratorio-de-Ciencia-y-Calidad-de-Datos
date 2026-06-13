import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from '../components/Sidebar';
import { useNavigate } from 'react-router-dom';
import { Search, Download, ExternalLink, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface DatasetResult {
  id: number;
  titulo: string;
  descripcion: string;
  fuente: string;
  url_fuente: string | null;
  area: string;
  formato: string;
  fecha: string;
  archivo_url: string | null;
}

interface UserInfo {
  nombre: string;
  email: string;
}

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DatasetResult[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const categorias = ['Todos', 'Salud', 'Educación', 'Ciencias Sociales', 'Tecnología', 'Economía'];

  const loadInitialData = useCallback(() => {
    setResults([
      {
        id: 1,
        titulo: "Base de Datos de Cardiología UAI 2024",
        descripcion: "Conjunto de datos clínicos anonimizados de pacientes con patologías cardiovasculares crónicas.",
        fuente: "Zenodo",
        url_fuente: "https://zenodo.org",
        area: "Salud",
        formato: "XLSX",
        fecha: "2024-05-12",
        archivo_url: null
      }
    ]);
  }, []);

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
    loadInitialData();
  }, [loadInitialData]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError('');
    
    try {
      const response = await api.post('/datasets/search', { 
        keywords: [searchTerm] 
      });
      
      const newResults = (response.data.resultados || []).map((r: any) => ({
        ...r,
        archivo_url: response.data.url
      }));
      
      setResults(prev => [...newResults, ...prev]);
    } catch (err: unknown) {
      console.error('Error en la búsqueda:', err);
      setError('Error al conectar con el motor de Python.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (result: DatasetResult) => {
    if (result.archivo_url) {
      window.open(result.archivo_url, '_blank');
    } else {
      alert('Archivo no disponible para descarga directa.');
    }
  };

  const filteredResults = activeCategory === 'Todos' 
    ? results 
    : results.filter(r => r.area === activeCategory);

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />

      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-display font-bold text-gray-800 tracking-tight">Repositorio Público</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">{user?.nombre || 'Flor Gomez'}</p>
              <p className="text-xs text-uai-red font-bold uppercase tracking-widest">Investigadora UAI</p>
            </div>
            <div className="w-10 h-10 bg-uai-red rounded-full flex items-center justify-center text-white font-bold shadow-md">
              {user?.nombre?.substring(0, 2).toUpperCase() || 'FG'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {error && (
              <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3 rounded-lg shadow-sm">
                <AlertCircle size={20} />
                <p className="text-sm font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Explorar datasets institucionales..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-uai-red/10 focus:border-uai-red outline-none transition-all text-lg font-medium"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="bg-uai-red text-white px-8 rounded-2xl font-bold hover:bg-red-800 shadow-xl shadow-uai-red/20 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : 'BUSCAR'}
              </button>
            </form>

            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-6 py-2 rounded-full text-xs font-black tracking-widest uppercase transition-all ${
                    activeCategory === cat 
                      ? 'bg-uai-red text-white shadow-lg' 
                      : 'bg-white text-gray-500 border border-gray-100 hover:bg-gray-50 shadow-sm'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="space-y-6 pt-4">
              <h3 className="text-lg font-black text-gray-800 flex items-center gap-2 uppercase tracking-tighter">
                {activeCategory === 'Todos' ? 'Base de Datos Global' : `Filtrado por: ${activeCategory}`} <ChevronRight className="text-uai-red" size={20} />
              </h3>

              {filteredResults.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[2rem] border-2 border-dashed border-gray-100">
                  <p className="text-gray-300 font-bold uppercase tracking-[0.2em]">Sin resultados disponibles</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6">
                  {filteredResults.map((result) => (
                    <div key={result.id} className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-md hover:shadow-xl transition-all group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Download size={120} />
                      </div>
                      <div className="flex justify-between items-start relative z-10">
                        <div className="space-y-4">
                          <div className="flex items-center gap-3">
                            <span className="px-3 py-1 bg-uai-accent text-uai-red text-[10px] font-black rounded-lg uppercase tracking-[0.2em]">
                              {result.area}
                            </span>
                            <span className="text-xs text-gray-400 font-bold font-mono uppercase">{result.fecha}</span>
                          </div>
                          <h4 className="text-2xl font-black text-gray-800 group-hover:text-uai-red transition-colors leading-tight">
                            {result.titulo}
                          </h4>
                          <p className="text-gray-500 font-medium leading-relaxed max-w-4xl italic">
                            {result.descripcion}
                          </p>
                        </div>
                        <div className="flex flex-col gap-3 shrink-0 ml-8">
                          <button 
                            onClick={() => handleDownload(result)}
                            className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-xl font-black text-sm hover:bg-black transition-all shadow-lg"
                          >
                            <Download size={18} /> DESCARGAR
                          </button>
                          <button 
                            onClick={() => result.url_fuente && window.open(result.url_fuente, '_blank')}
                            className="flex items-center justify-center gap-2 px-6 py-3 text-uai-red font-black text-sm hover:bg-uai-accent/30 rounded-xl transition-all uppercase tracking-widest"
                          >
                            VER FUENTE <ExternalLink size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
