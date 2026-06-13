import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Search, Database, Download, Loader2, Play, CheckCircle, AlertCircle, Key, BookOpen, ChevronDown, Plus, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';

interface LabResult {
  id: number;
  nro: number;
  titulo: string;
  area: string;
  tipo: string;
  fuente: string;
  institucion: string;
  pais: string;
  registros: string;
  formato: string;
  variables: string;
  cant_variables: string;
  año_pub: string;
  año_act: string;
  url_original?: string;
  idioma: string;
  descripcion: string;
  propuesta: string;
  observaciones: string;
  responsable: string;
  archivo_url?: string;
}

interface SavedToken {
  id: number;
  servicio: string;
  api_key_cifrada: string;
}

interface UserInfo {
  nombre: string;
  email: string;
}

const SearchLaboratory: React.FC = () => {
  const [selectedApi, setSelectedApi] = useState('ADMIN_DEFAULT');
  const [customKey, setCustomKey] = useState('');
  const [keywords, setKeywords] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<LabResult[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'searching' | 'cleaning' | 'completed'>('idle');
  const [savedTokens, setSavedTokens] = useState<SavedToken[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingToken, setEditingToken] = useState<SavedToken | null>(null);
  const [newApiName, setNewApiName] = useState('');
  const [newApiKey, setNewApiKey] = useState('');
  const navigate = useNavigate();

  const apiOptions = [
    { id: 'ADMIN_DEFAULT', label: 'BÚSQUEDA INTEGRAL (Todas las fuentes)', icon: <Database size={16} /> },
    ...savedTokens.map(t => ({ id: `SAVED_${t.id}`, label: `PERSONAL: ${t.servicio}`, icon: <Key size={16} /> })),
    { id: 'ZENODO', label: 'ZENODO (Usar llave del sistema)', icon: <Key size={16} /> },
    { id: 'KAGGLE', label: 'KAGGLE (Usar llave del sistema)', icon: <Key size={16} /> },
    { id: 'HF', label: 'HUGGING FACE (Usar llave del sistema)', icon: <Key size={16} /> },
    { id: 'UCI', label: 'UCI Repository', icon: <Key size={16} /> },
    { id: 'HEALTHDATA', label: 'HealthData.gov', icon: <Key size={16} /> },
  ];

  const fetchTokens = async () => {
    try {
      const response = await api.get('/tokens');
      setSavedTokens(response.data);
    } catch (err) {
      console.error('Error fetching tokens:', err);
    }
  };

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
    fetchTokens();
  }, []);

  const handleAddOrUpdateToken = async () => {
    if (!newApiName || !newApiKey) return;
    try {
      if (editingToken) {
        await api.put(`/tokens/${editingToken.id}`, { servicio: newApiName, api_key: newApiKey });
      } else {
        await api.post('/tokens', { servicio: newApiName, api_key: newApiKey });
      }
      setNewApiName('');
      setNewApiKey('');
      setEditingToken(null);
      fetchTokens();
    } catch (err) {
      alert('Error al guardar la API');
    }
  };

  const handleDeleteToken = async (id: number) => {
    if (!confirm('¿Seguro que querés eliminar esta API?')) return;
    try {
      await api.delete(`/tokens/${id}`);
      fetchTokens();
    } catch (err) {
      alert('Error al eliminar');
    }
  };

  const handleRunMotor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) return;

    setLoading(true);
    setError('');
    setStatus('searching');
    setResults([]);

    let finalApiKey = '';
    if (selectedApi.startsWith('SAVED_')) {
      const tokenId = parseInt(selectedApi.split('_')[1]);
      const token = savedTokens.find(t => t.id === tokenId);
      finalApiKey = token ? token.api_key_cifrada : '';
    } else {
      finalApiKey = selectedApi === 'ADMIN_DEFAULT' ? '' : customKey;
    }

    try {
      const response = await api.post('/datasets/search', { 
        keywords: [keywords],
        apiKey: finalApiKey,
        service: selectedApi
      });
      
      setStatus('cleaning');
      await new Promise(r => setTimeout(r, 1000));
      
      setStatus('completed');
      const backendResults = response.data.resultados || [];
      const fileUrl = response.data.url;
      
      const mappedResults = backendResults.map((r: any) => ({
        ...r,
        archivo_url: fileUrl
      }));
      
      setResults(mappedResults);
    } catch (err: any) {
      console.error('Error en el motor:', err);
      const msg = err.response?.data?.error || 'Error al conectar con el servidor.';
      setError(msg);
      setStatus('idle');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (results.length > 0 && results[0].archivo_url) {
      window.open(results[0].archivo_url, '_blank');
    } else {
      alert('Primero debés realizar una búsqueda.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="h-screen w-full bg-gray-50 flex overflow-hidden">
      {/* Sidebar Fija */}
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
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 ml-1">Ciencias de Datos</p>
        </div>

        <nav className="flex-1 p-4 space-y-2 mt-4">
          <p className="text-[10px] font-black text-gray-400 uppercase px-4 mb-4 tracking-widest">Navegación Sistema</p>
          <button className="flex items-center gap-3 px-4 py-3 bg-uai-accent/50 text-uai-red rounded-2xl font-black w-full text-left shadow-sm border border-uai-red/10 text-sm">
            <Play size={20} /> Iniciar Búsqueda
          </button>
          <button onClick={() => navigate('/dashboard')} className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all w-full text-left font-bold text-sm">
            <Search size={20} /> Repositorio Público
          </button>
          <button onClick={() => navigate('/exports')} className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all w-full text-left font-bold text-sm">
            <FileSpreadsheet size={20} /> Mis Exportaciones
          </button>
          <p className="text-[10px] font-black text-gray-400 uppercase px-4 mb-4 mt-10 tracking-widest">Administración</p>
          <button onClick={() => navigate('/settings')} className="flex items-center gap-3 px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-2xl transition-all w-full text-left font-bold text-sm">
            <SettingsIcon size={20} /> Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full text-red-600 hover:bg-red-50 rounded-xl transition-colors font-bold">
            <LogOut size={20} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido Principal - Ocupa todo el resto de la pantalla (flex-grow: 1) */}
      <main className="flex-1 flex flex-col h-screen bg-gray-50 min-w-0">
        {/* Header Superior - Ocupa el 100% de ancho sin restricciones */}
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 z-30 shadow-sm w-full">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight">Generación de Datasets</h2>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-base font-black text-gray-800">{user?.nombre || 'Investigadora'}</p>
              <p className="text-xs text-uai-red font-black uppercase tracking-widest">Investigadora Principal</p>
            </div>
            <div className="w-12 h-12 bg-uai-red rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-uai-red/30">
              {user?.nombre?.substring(0, 2).toUpperCase() || 'FG'}
            </div>
          </div>
        </header>

        {/* Zona de contenido - Fluida y sin cortes */}
        <div className="flex-1 flex flex-col min-h-0 w-full overflow-hidden">
          
          {/* Parámetros - Alineados con el header */}
          <div className="p-6 md:p-10 shrink-0 w-full bg-gray-50">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-200 shadow-lg relative overflow-hidden w-full">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 w-full">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                      <Database size={18} className="text-uai-red" /> Fuente / API
                    </label>
                    <button 
                      onClick={() => setIsModalOpen(true)}
                      className="text-xs font-black text-uai-red hover:underline flex items-center gap-1"
                    >
                      <Plus size={14} /> GESTIONAR APIs
                    </button>
                  </div>
                  <select 
                    className="w-full p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-uai-red outline-none font-black text-gray-700"
                    value={selectedApi}
                    onChange={(e) => setSelectedApi(e.target.value)}
                  >
                    {apiOptions.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-sm font-black text-gray-700 flex items-center gap-2">
                    <BookOpen size={18} className="text-uai-red" /> Diccionario de Keywords
                  </label>
                  <div className="flex gap-4">
                    <input 
                      type="text"
                      placeholder="Ej: Diabetes, Argentina..."
                      className="flex-1 p-4 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-uai-red outline-none font-black"
                      value={keywords}
                      onChange={(e) => setKeywords(e.target.value)}
                    />
                    <button 
                      onClick={handleRunMotor}
                      disabled={loading}
                      className="bg-uai-red text-white px-8 rounded-xl font-black flex items-center gap-3 hover:bg-red-800 transition-all disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="animate-spin" size={20} /> : <Search size={20} />}
                      BUSCAR
                    </button>
                    <button 
                      onClick={handleExport}
                      disabled={results.length === 0 || loading}
                      className="bg-gray-800 text-white px-8 rounded-xl font-black flex items-center gap-3 hover:bg-black transition-all disabled:opacity-30"
                    >
                      <Download size={20} /> EXCEL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* GRILLA - Expandida totalmente hasta el final */}
          <div className="flex-1 min-h-0 bg-white mx-6 md:mx-10 mb-8 rounded-[2rem] shadow-2xl border border-gray-200 overflow-hidden flex flex-col border-t-8 border-t-uai-red">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="text-xl font-black text-gray-800 flex items-center gap-3">
                <CheckCircle className="text-green-500" size={24} /> 
                Resultados del Repositorio
              </h3>
              {results.length > 0 && (
                <span className="bg-uai-accent text-uai-red px-4 py-1 rounded-full text-xs font-black">
                  {results.length} REGISTROS ENCONTRADOS
                </span>
              )}
            </div>

            {/* Contenedor con Scroll Doble (V y H) */}
            <div className="flex-1 overflow-auto bg-gray-50/30">
              {results.length === 0 && !loading ? (
                <div className="h-full flex items-center justify-center text-gray-300">
                  <div className="text-center">
                    <Database size={80} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xl font-black uppercase tracking-widest">Esperando Parámetros...</p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse min-w-[4000px]">
                  <thead className="sticky top-0 z-20 bg-white shadow-sm">
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                      <th className="p-6 text-xs font-black text-gray-600 uppercase sticky left-0 bg-gray-100 z-30 w-20">Nro</th>
                      <th className="p-6 text-xs font-black text-gray-800 uppercase sticky left-24 bg-gray-100 z-30 min-w-[500px]">Nombre del dataset</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[250px]">Área médica</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[250px]">Tipo de datos</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[200px]">Fuente</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[350px]">Autor / Institución</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[200px]">País</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[250px]">Cant. registros</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[250px]">Tipo de formato</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[400px]">Variables principales</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[150px]">Cant. var</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[150px]">Año Pub</th>
                      <th className="p-6 text-xs font-black text-gray-600 uppercase min-w-[150px]">Año Act</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[400px]">Link</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[200px]">Idioma</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[600px]">Breve descripción</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[400px]">Propuesta / Objetivo</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[350px]">Observaciones</th>
                      <th className="p-8 text-sm font-black text-gray-600 uppercase min-w-[250px]">Responsable</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 bg-white">
                    {results.map((result) => (
                      <tr key={result.id} className="hover:bg-uai-accent/10 transition-colors group">
                        <td className="p-6 text-lg font-black text-gray-400 sticky left-0 bg-white group-hover:bg-gray-50 z-10">{result.nro}</td>
                        <td className="p-6 text-lg font-black text-uai-red sticky left-24 bg-white group-hover:bg-gray-50 z-10 shadow-[6px_0_15px_-4px_rgba(0,0,0,0.15)]">{result.titulo}</td>
                        <td className="p-6 text-lg font-bold text-gray-700">{result.area}</td>
                        <td className="p-6 text-lg text-gray-600 font-medium">{result.tipo}</td>
                        <td className="p-6 text-lg">
                          <span className="px-5 py-2 bg-uai-red text-white font-black rounded-2xl text-xs uppercase tracking-widest shadow-md">{result.fuente}</span>
                        </td>
                        <td className="p-6 text-lg text-gray-700 font-medium">{result.institucion}</td>
                        <td className="p-6 text-lg text-gray-600">{result.pais}</td>
                        <td className="p-6 text-2xl text-gray-800 font-black font-mono bg-gray-50/50">{result.registros}</td>
                        <td className="p-6 text-lg text-gray-600">{result.formato}</td>
                        <td className="p-6 text-lg text-gray-700 leading-relaxed italic">{result.variables}</td>
                        <td className="p-6 text-2xl text-gray-800 font-black font-mono bg-gray-50/50">{result.cant_variables}</td>
                        <td className="p-6 text-lg text-gray-600">{result.año_pub}</td>
                        <td className="p-6 text-lg text-uai-red font-black underline decoration-4 underline-offset-4">{result.año_act}</td>
                        <td className="p-8 text-lg">
                          {result.url_original ? (
                            <a href={result.url_original} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800 font-black underline break-all block" title={result.url_original}>
                              {result.url_original}
                            </a>
                          ) : '-'}
                        </td>
                        <td className="p-8 text-lg text-gray-600 font-black">{result.idioma}</td>
                        <td className="p-8 text-lg text-gray-600 leading-loose text-justify font-medium">{result.descripcion}</td>
                        <td className="p-8 text-lg text-gray-700 bg-uai-accent/10 font-medium">{result.propuesta}</td>
                        <td className="p-8 text-lg text-gray-500 italic">{result.observaciones}</td>
                        <td className="p-8 text-lg font-black text-gray-800">{result.responsable}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            
            <div className="bg-uai-red/10 p-4 text-xs text-uai-red text-center border-t border-gray-200 uppercase font-black tracking-[0.4em] shrink-0">
              ← Deslizá lateralmente para explorar la base de datos integral →
            </div>
          </div>
        </div>
      </main>

      {/* MODAL DE GESTIÓN DE APIs */}
      <ApiManagerModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        tokens={savedTokens}
        onAddOrUpdate={handleAddOrUpdateToken}
        onDelete={handleDeleteToken}
      />
    </div>
  );
};

/* --- COMPONENTE MODAL DE GESTIÓN DE APIs --- */
const ApiManagerModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  tokens: SavedToken[];
  onAddOrUpdate: (name: string, key: string, editingId: number | null) => void;
  onDelete: (id: number) => void;
}> = ({ isOpen, onClose, tokens, onAddOrUpdate, onDelete }) => {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onAddOrUpdate(name, key, editingId);
    setName('');
    setKey('');
    setEditingId(null);
  };

  const handleEdit = (t: SavedToken) => {
    setName(t.servicio);
    setKey(t.api_key_cifrada);
    setEditingId(t.id);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-uai-red text-white">
          <div>
            <h3 className="text-2xl font-black uppercase tracking-tight">Mis Conexiones API</h3>
            <p className="text-xs font-bold opacity-80 uppercase tracking-widest">Gestioná tus llaves de Zenodo, Kaggle o HuggingFace</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto space-y-8">
          {/* Formulario de Carga */}
          <form onSubmit={handleSubmit} className="bg-gray-50 p-6 rounded-3xl border-2 border-gray-100 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 uppercase ml-1">Nombre de la Conexión</label>
                <input 
                  type="text" 
                  placeholder="Ej: Mi Zenodo Personal"
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-uai-red/10 outline-none font-bold"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-black text-gray-500 uppercase ml-1">Token / API Key</label>
                <input 
                  type="password" 
                  placeholder="Pega el token aquí..."
                  className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-uai-red/10 outline-none font-bold"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  required
                />
              </div>
            </div>
            <button 
              type="submit"
              className="w-full bg-uai-red text-white py-3 rounded-xl font-black uppercase tracking-widest hover:bg-red-800 transition-all shadow-lg shadow-uai-red/20"
            >
              {editingId ? 'ACTUALIZAR API' : 'GUARDAR NUEVA API'}
            </button>
          </form>

          {/* Lista de APIs */}
          <div className="space-y-4">
            <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest ml-1">LLaves Almacenadas ({tokens.length})</h4>
            {tokens.length === 0 ? (
              <p className="text-center py-10 text-gray-400 italic">No tenés APIs guardadas todavía.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {tokens.map(t => (
                  <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-uai-red transition-all group shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-uai-accent text-uai-red rounded-xl group-hover:scale-110 transition-transform">
                        <Key size={20} />
                      </div>
                      <div>
                        <p className="font-black text-gray-800 uppercase text-sm">{t.servicio}</p>
                        <p className="text-xs text-gray-400 font-mono">••••••••••••••••</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleEdit(t)}
                        className="p-2 text-gray-400 hover:text-uai-red hover:bg-uai-accent rounded-lg transition-all"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => onDelete(t.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchLaboratory;
