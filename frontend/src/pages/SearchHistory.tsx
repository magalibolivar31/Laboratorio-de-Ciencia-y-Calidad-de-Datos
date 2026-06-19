import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { History, Search, RotateCcw, Trash2, Loader2, RefreshCw, Database, Calendar, BarChart2 } from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface BusquedaItem {
  id: number;
  keywords: string;
  fuente: string;
  resultados: number;
  created_at: string;
}

interface UserInfo { nombre: string; email: string; rol?: string }

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const FUENTE_LABELS: Record<string, string> = {
  ADMIN_DEFAULT: 'Todas las fuentes',
  ZENODO: 'Zenodo', KAGGLE: 'Kaggle',
  HF: 'Hugging Face', UCI: 'UCI Repository', HEALTHDATA: 'HealthData.gov',
};

const SearchHistory: React.FC = () => {
  const navigate = useNavigate();
  const [historial, setHistorial] = useState<BusquedaItem[]>([]);
  const [user, setUser]           = useState<UserInfo | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [filtro, setFiltro]       = useState('');
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    fetchHistorial();
  }, []);

  const fetchHistorial = async () => {
    setLoading(true); setError('');
    try {
      const res = await api.get('/historial/busquedas');
      setHistorial(res.data);
    } catch {
      setError('No se pudo cargar el historial.');
    } finally {
      setLoading(false);
    }
  };

  const repetir = (item: BusquedaItem) => {
    localStorage.setItem('pendingSearch', JSON.stringify({
      keywords: item.keywords,
      fuente: item.fuente,
    }));
    navigate('/laboratory');
  };

  const eliminar = async (id: number) => {
    if (!confirm('¿Eliminar esta búsqueda del historial?')) return;
    setDeletingId(id);
    try {
      await api.delete(`/historial/busquedas/${id}`);
      setHistorial(prev => prev.filter(b => b.id !== id));
    } catch {
      alert('Error al eliminar');
    } finally {
      setDeletingId(null);
    }
  };

  // Stats
  const totalResultados = historial.reduce((acc, b) => acc + b.resultados, 0);
  const fuenteMasUsada = useMemo(() => {
    if (!historial.length) return null;
    const counts: Record<string, number> = {};
    historial.forEach(b => { counts[b.fuente] = (counts[b.fuente] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  }, [historial]);

  const filtered = useMemo(() =>
    filtro.trim()
      ? historial.filter(b =>
          b.keywords.toLowerCase().includes(filtro.toLowerCase()) ||
          (FUENTE_LABELS[b.fuente] || b.fuente).toLowerCase().includes(filtro.toLowerCase())
        )
      : historial,
    [historial, filtro]
  );

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <History size={28} className="text-uai-red" /> Historial de Búsquedas
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={fetchHistorial} className="p-2 text-gray-400 hover:text-uai-red hover:bg-gray-100 rounded-xl transition-all" title="Actualizar">
              <RefreshCw size={18} />
            </button>
            <div className="text-right hidden sm:block">
              <p className="text-base font-black text-gray-800">{user?.nombre || 'Investigadora'}</p>
              <p className="text-xs text-uai-red font-black uppercase tracking-widest">
                {user?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Investigador'}
              </p>
            </div>
            <div className="w-12 h-12 bg-uai-red rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {user?.nombre?.substring(0, 2).toUpperCase() || 'FG'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-6">

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="animate-spin text-uai-red" size={36} />
            </div>
          ) : error ? (
            <div className="p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl font-medium">{error}</div>
          ) : historial.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 bg-white rounded-2xl border-2 border-dashed border-gray-100">
              <History size={52} className="text-gray-200 mb-4" />
              <p className="text-gray-400 font-black uppercase tracking-widest">Sin búsquedas aún</p>
              <p className="text-gray-300 text-sm mt-2 mb-6">Tus búsquedas se registran automáticamente</p>
              <button
                onClick={() => navigate('/laboratory')}
                className="flex items-center gap-2 bg-uai-red text-white px-6 py-3 rounded-xl font-black hover:bg-red-800 transition-all text-sm"
              >
                <Search size={16} /> IR A BÚSQUEDA
              </button>
            </div>
          ) : (
            <>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="p-3 bg-uai-accent rounded-xl">
                    <History size={22} className="text-uai-red" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-800">{historial.length}</p>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Búsquedas realizadas</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="p-3 bg-uai-accent rounded-xl">
                    <BarChart2 size={22} className="text-uai-red" />
                  </div>
                  <div>
                    <p className="text-2xl font-black text-gray-800">{totalResultados.toLocaleString('es-AR')}</p>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Resultados obtenidos</p>
                  </div>
                </div>
                <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
                  <div className="p-3 bg-uai-accent rounded-xl">
                    <Database size={22} className="text-uai-red" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800 leading-tight">
                      {fuenteMasUsada ? (FUENTE_LABELS[fuenteMasUsada] || fuenteMasUsada) : '—'}
                    </p>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Fuente más usada</p>
                  </div>
                </div>
              </div>

              {/* Filtro */}
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Filtrar por keywords o fuente..."
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none transition-all"
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                />
              </div>

              {/* Lista */}
              {filtered.length === 0 ? (
                <div className="text-center py-16 text-gray-300 font-bold">Sin resultados para "{filtro}"</div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(item => (
                    <div key={item.id} className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-6">
                      <div className="flex items-start justify-between gap-4">

                        {/* Info */}
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className="p-3 bg-gray-50 rounded-xl shrink-0">
                            <Search size={22} className="text-uai-red" />
                          </div>
                          <div className="flex-1 min-w-0 space-y-2">
                            {/* Keywords chips */}
                            <div className="flex flex-wrap gap-1.5">
                              {item.keywords.split(',').map((kw, i) => (
                                <span key={i} className="px-3 py-1 bg-uai-accent text-uai-red text-xs font-black rounded-full border border-uai-red/10">
                                  {kw.trim()}
                                </span>
                              ))}
                            </div>

                            {/* Meta */}
                            <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
                              <span className="flex items-center gap-1 font-bold">
                                <Database size={11} />
                                {FUENTE_LABELS[item.fuente] || item.fuente}
                              </span>
                              <span className="flex items-center gap-1 font-bold text-gray-600">
                                <BarChart2 size={11} />
                                {item.resultados} resultado{item.resultados !== 1 ? 's' : ''}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar size={11} />
                                {formatDate(item.created_at)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex flex-col gap-2 shrink-0">
                          <button
                            onClick={() => repetir(item)}
                            className="flex items-center gap-2 bg-uai-red text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-red-800 transition-all"
                          >
                            <RotateCcw size={15} /> REPETIR
                          </button>
                          <button
                            onClick={() => eliminar(item.id)}
                            disabled={deletingId === item.id}
                            className="flex items-center gap-2 border border-gray-200 text-gray-400 px-5 py-2.5 rounded-xl font-black text-sm hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-40"
                          >
                            {deletingId === item.id
                              ? <Loader2 size={15} className="animate-spin" />
                              : <Trash2 size={15} />
                            }
                            ELIMINAR
                          </button>
                        </div>

                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SearchHistory;
