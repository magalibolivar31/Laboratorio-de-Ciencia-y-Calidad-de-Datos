import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Tag, Filter, Save, CheckCircle, Database, Search, FileSpreadsheet, LogOut, Plus, X, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para la configuración
  const [tokens, setTokens] = useState({
    zenodo: '',
    kaggle: '',
    pubmed: ''
  });

  const [keywords, setKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [yearCutoff, setYearCutoff] = useState(2020);

  // Cargar configuración inicial
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // Por ahora simulamos la carga hasta tener los endpoints listos
        // const response = await api.get('/user/settings');
        // setTokens(response.data.tokens);
        // setKeywords(response.data.keywords);
        // setYearCutoff(response.data.yearCutoff);
        
        // Datos iniciales de prueba
        setKeywords(['Salud', 'Educación', 'Medicina']);
      } catch (err) {
        console.error('Error al cargar configuración:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // await api.post('/user/settings', { tokens, keywords, yearCutoff });
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError('Error al guardar la configuración.');
    } finally {
      setLoading(false);
    }
  };

  const addKeyword = () => {
    if (newKeyword.trim() && !keywords.includes(newKeyword.trim())) {
      setKeywords([...keywords, newKeyword.trim()]);
      setNewKeyword('');
    }
  };

  const removeKeyword = (word: string) => {
    setKeywords(keywords.filter(k => k !== word));
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
          <button onClick={() => navigate('/exports')} className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full text-left font-medium">
            <FileSpreadsheet size={18} /> Mis Exportaciones
          </button>
          <p className="text-xs font-bold text-gray-400 uppercase px-3 mb-2 mt-6">Administración</p>
          <button className="flex items-center gap-3 px-3 py-2 bg-uai-accent text-uai-red rounded-lg font-medium w-full text-left">
            <SettingsIcon size={18} /> Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/login');
            }} 
            className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-display font-bold text-gray-800">Configuración Personal</h2>
          <div className="flex items-center gap-4">
            {showSuccess && (
              <div className="flex items-center gap-2 text-green-600 font-bold animate-fade-in">
                <CheckCircle size={20} /> ¡Guardado!
              </div>
            )}
            {error && (
              <div className="flex items-center gap-2 text-red-600 font-bold">
                <AlertCircle size={20} /> {error}
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-3xl mx-auto space-y-8">
            
            {/* Sección de API Keys */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <Key className="text-uai-red" size={20} />
                <h3 className="font-display font-bold text-gray-800">Tus Tokens y Llaves de API</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Zenodo API Token</label>
                  <input 
                    type="password" 
                    value={tokens.zenodo}
                    onChange={(e) => setTokens({...tokens, zenodo: e.target.value})}
                    placeholder="Pega tu token de Zenodo aquí"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-uai-red transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Kaggle API Key</label>
                  <input 
                    type="password" 
                    value={tokens.kaggle}
                    onChange={(e) => setTokens({...tokens, kaggle: e.target.value})}
                    placeholder="Pega tu key de Kaggle aquí"
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-uai-red transition-all"
                  />
                </div>
              </div>
            </section>

            {/* Sección de Palabras Clave */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <Tag className="text-uai-red" size={20} />
                <h3 className="font-display font-bold text-gray-800">Mis Temas de Búsqueda</h3>
              </div>
              <div className="p-6">
                <p className="text-sm text-gray-600 mb-4">Define qué temas querés que el sistema priorice para vos.</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {keywords.map((kw, i) => (
                    <span key={i} className="px-3 py-1 bg-uai-accent text-uai-red rounded-full text-sm font-bold flex items-center gap-2">
                      {kw} 
                      <button onClick={() => removeKeyword(kw)} className="hover:text-red-900">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="text"
                    value={newKeyword}
                    onChange={(e) => setNewKeyword(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addKeyword()}
                    placeholder="Nueva palabra clave..."
                    className="flex-1 p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-uai-red"
                  />
                  <button 
                    onClick={addKeyword}
                    className="bg-gray-800 text-white p-2 rounded-lg hover:bg-black transition-colors"
                  >
                    <Plus size={20} />
                  </button>
                </div>
              </div>
            </section>

            {/* Sección de Filtros Globales */}
            <section className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-gray-50 flex items-center gap-3">
                <Filter className="text-uai-red" size={20} />
                <h3 className="font-display font-bold text-gray-800">Filtros de Calidad Personalizados</h3>
              </div>
              <div className="p-6">
                <div className="max-w-xs">
                  <label className="block text-sm font-bold text-gray-700 mb-2">Año de Corte (Desde)</label>
                  <input 
                    type="number" 
                    value={yearCutoff}
                    onChange={(e) => setYearCutoff(parseInt(e.target.value))}
                    className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-uai-red transition-all"
                  />
                </div>
              </div>
            </section>

            <div className="flex justify-end pt-4">
              <button 
                onClick={handleSave}
                disabled={loading}
                className={`flex items-center gap-2 bg-uai-red text-white px-8 py-3 rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-uai-red/20 transition-all ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <Save size={20} /> {loading ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
