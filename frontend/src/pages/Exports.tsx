import React, { useState, useEffect, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import {
  FileSpreadsheet, Download, Loader2, RefreshCw, Search,
  RotateCcw, Database, HardDrive, Calendar, Globe, Lock, Users
} from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface ExportItem {
  id: number;
  nombre_archivo: string;
  formato: string;
  tamanio_bytes: number | null;
  url: string | null;
  nombre?: string | null;
  publica: boolean;
  descripcion?: string | null;
  created_at: string;
  usuario?: { nombre: string } | null;
  busqueda?: {
    keywords: string;
    fuente: string;
    resultados: number;
    created_at: string;
  } | null;
}

interface UserInfo { nombre: string; email: string; rol?: string }

const formatBytes = (bytes: number | null) => {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const FUENTE_LABELS: Record<string, string> = {
  ADMIN_DEFAULT: 'Todas las fuentes',
  ZENODO: 'Zenodo', KAGGLE: 'Kaggle',
  HF: 'Hugging Face', UCI: 'UCI Repository', HEALTHDATA: 'HealthData.gov',
};

type Tab = 'mias' | 'publicas' | 'todas';

const ExportCard: React.FC<{
  item: ExportItem;
  esMia: boolean;
  onRepetir?: () => void;
  onToggleVisibilidad?: () => void;
  toggling?: boolean;
}> = ({ item, esMia, onRepetir, onToggleVisibilidad, toggling }) => (
  <div className="bg-white rounded-2xl border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all p-6">
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-4 flex-1 min-w-0">
        <div className={`p-3 rounded-xl shrink-0 ${item.publica ? 'bg-blue-50' : 'bg-green-50'}`}>
          <FileSpreadsheet size={24} className={item.publica ? 'text-blue-600' : 'text-green-600'} />
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          {/* Nombre + badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-black text-gray-800 truncate">{item.nombre || item.nombre_archivo}</p>
            <span className={`px-2 py-0.5 text-[10px] font-black rounded-lg uppercase tracking-wider shrink-0 flex items-center gap-1 ${item.publica ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
              {item.publica ? <><Globe size={9} /> Pública</> : <><Lock size={9} /> Privada</>}
            </span>
            {!esMia && item.usuario && (
              <span className="px-2 py-0.5 bg-uai-accent text-uai-red text-[10px] font-black rounded-lg shrink-0">
                {item.usuario.nombre}
              </span>
            )}
            {item.tamanio_bytes && (
              <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg shrink-0">
                {formatBytes(item.tamanio_bytes)}
              </span>
            )}
          </div>

          {/* Descripción */}
          {item.descripcion && (
            <p className="text-sm text-gray-600 italic leading-snug">{item.descripcion}</p>
          )}

          {/* Keywords */}
          {item.busqueda && (
            <div className="flex items-start gap-2 flex-wrap">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest shrink-0 mt-0.5">Keywords:</span>
              <div className="flex flex-wrap gap-1">
                {item.busqueda.keywords.split(',').map((kw, i) => (
                  <span key={i} className="px-2 py-0.5 bg-uai-accent text-uai-red text-[10px] font-black rounded-full">
                    {kw.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Meta */}
          <div className="flex items-center gap-4 text-xs text-gray-400 flex-wrap">
            {item.busqueda && (
              <span className="flex items-center gap-1 font-bold">
                <Database size={11} />
                {FUENTE_LABELS[item.busqueda.fuente] || item.busqueda.fuente}
              </span>
            )}
            {item.busqueda?.resultados != null && (
              <span className="font-bold">{item.busqueda.resultados} datasets</span>
            )}
            <span className="flex items-center gap-1">
              <Calendar size={11} />
              {formatDate(item.created_at)}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones */}
      <div className="flex flex-col gap-2 shrink-0">
        {item.url ? (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-black transition-all"
          >
            <Download size={15} /> DESCARGAR
          </a>
        ) : (
          <span className="px-5 py-2.5 text-gray-300 text-sm font-bold text-center">No disponible</span>
        )}
        {esMia && onToggleVisibilidad && (
          <button
            onClick={onToggleVisibilidad}
            disabled={toggling}
            title={item.publica ? 'Hacer privada' : 'Hacer pública'}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm border-2 transition-all disabled:opacity-50 ${
              item.publica
                ? 'border-blue-300 text-blue-600 hover:bg-blue-50'
                : 'border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {toggling ? <Loader2 size={14} className="animate-spin" /> : item.publica ? <Lock size={14} /> : <Globe size={14} />}
            {item.publica ? 'Hacer privada' : 'Hacer pública'}
          </button>
        )}
        {esMia && onRepetir && (
          <button
            onClick={onRepetir}
            className="flex items-center gap-2 border-2 border-uai-red text-uai-red px-5 py-2.5 rounded-xl font-black text-sm hover:bg-uai-accent transition-all"
          >
            <RotateCcw size={15} /> REPETIR
          </button>
        )}
      </div>
    </div>
  </div>
);

const Exports: React.FC = () => {
  const navigate = useNavigate();
  const [mias, setMias]       = useState<ExportItem[]>([]);
  const [publicas, setPublicas] = useState<ExportItem[]>([]);
  const [user, setUser]       = useState<UserInfo | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [filtro, setFiltro]     = useState('');
  const [tab, setTab]           = useState<Tab>('mias');
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true); setError('');
    try {
      const [rMias, rPublicas] = await Promise.all([
        api.get('/historial/exportaciones'),
        api.get('/historial/exportaciones/publicas'),
      ]);
      setMias(rMias.data);
      setPublicas(rPublicas.data);
    } catch {
      setError('No se pudieron cargar las exportaciones.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVisibilidad = async (item: ExportItem) => {
    setTogglingId(item.id);
    try {
      await api.patch(`/historial/exportaciones/${item.id}/visibilidad`);
      await fetchAll();
    } catch {}
    finally { setTogglingId(null); }
  };

  const repetirBusqueda = (item: ExportItem) => {
    if (!item.busqueda) return;
    localStorage.setItem('pendingSearch', JSON.stringify({
      keywords: item.busqueda.keywords,
      fuente: item.busqueda.fuente,
    }));
    navigate('/laboratory');
  };

  // "Todas": mias + públicas de otros (sin duplicar las mias que son públicas)
  const miasIds = useMemo(() => new Set(mias.map(e => e.id)), [mias]);
  const todas = useMemo(() => [
    ...mias,
    ...publicas.filter(e => !miasIds.has(e.id))
  ], [mias, publicas, miasIds]);

  const listaActiva: ExportItem[] = tab === 'mias' ? mias : tab === 'publicas' ? publicas : todas;

  const filtered = useMemo(() => {
    if (!filtro.trim()) return listaActiva;
    const q = filtro.toLowerCase();
    return listaActiva.filter(e =>
      e.nombre_archivo.toLowerCase().includes(q) ||
      e.busqueda?.keywords.toLowerCase().includes(q) ||
      e.descripcion?.toLowerCase().includes(q) ||
      e.usuario?.nombre.toLowerCase().includes(q)
    );
  }, [listaActiva, filtro]);

  const totalBytes = mias.reduce((acc, e) => acc + (e.tamanio_bytes || 0), 0);

  const tabs: { id: Tab; label: string; icon: React.ReactNode; count: number }[] = [
    { id: 'mias', label: 'Mis exportaciones', icon: <Lock size={14} />, count: mias.length },
    { id: 'publicas', label: 'Exportaciones públicas', icon: <Globe size={14} />, count: publicas.length },
    { id: 'todas', label: 'Todas', icon: <Users size={14} />, count: todas.length },
  ];

  return (
    <div className="min-height-screen bg-gray-50 flex overflow-hidden" style={{ minHeight: '100vh' }}>
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <FileSpreadsheet size={28} className="text-uai-red" /> Exportaciones
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-uai-red hover:bg-gray-100 rounded-xl transition-all" title="Actualizar">
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

        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-5">

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-uai-accent rounded-xl"><Database size={22} className="text-uai-red" /></div>
              <div>
                <p className="text-2xl font-black text-gray-800">{mias.length}</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Mis exportaciones</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl"><Globe size={22} className="text-blue-600" /></div>
              <div>
                <p className="text-2xl font-black text-gray-800">{publicas.length}</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Exportaciones públicas</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center gap-4">
              <div className="p-3 bg-uai-accent rounded-xl"><HardDrive size={22} className="text-uai-red" /></div>
              <div>
                <p className="text-2xl font-black text-gray-800">{formatBytes(totalBytes)}</p>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Espacio utilizado</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex border-b border-gray-100">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3.5 text-sm font-black transition-all ${tab === t.id ? 'text-uai-red border-b-2 border-uai-red bg-uai-accent/40' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                >
                  {t.icon}
                  {t.label}
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${tab === t.id ? 'bg-uai-red text-white' : 'bg-gray-100 text-gray-500'}`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-gray-100">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, keywords, descripción o autor..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none transition-all"
                  value={filtro}
                  onChange={e => setFiltro(e.target.value)}
                />
              </div>
            </div>

            {/* Lista */}
            <div className="p-4">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="animate-spin text-uai-red" size={36} />
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl font-medium">{error}</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                  <FileSpreadsheet size={52} className="mb-4 opacity-40" />
                  {filtro ? (
                    <>
                      <p className="font-black uppercase tracking-widest text-sm">Sin resultados para "{filtro}"</p>
                      <button onClick={() => setFiltro('')} className="mt-3 text-xs text-uai-red font-black hover:underline">Limpiar búsqueda</button>
                    </>
                  ) : tab === 'mias' ? (
                    <>
                      <p className="font-black uppercase tracking-widest text-sm">Sin exportaciones aún</p>
                      <p className="text-gray-300 text-sm mt-2 mb-6">Realizá una búsqueda y guardá la exportación</p>
                      <button onClick={() => navigate('/laboratory')} className="flex items-center gap-2 bg-uai-red text-white px-6 py-3 rounded-xl font-black hover:bg-red-800 transition-all text-sm">
                        <Search size={16} /> IR A BÚSQUEDA
                      </button>
                    </>
                  ) : (
                    <p className="font-black uppercase tracking-widest text-sm">No hay exportaciones públicas todavía</p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {filtered.map(item => (
                    <ExportCard
                      key={`${tab}-${item.id}`}
                      item={item}
                      esMia={miasIds.has(item.id)}
                      onToggleVisibilidad={miasIds.has(item.id) ? () => handleToggleVisibilidad(item) : undefined}
                      toggling={togglingId === item.id}
                      onRepetir={item.busqueda ? () => repetirBusqueda(item) : undefined}
                    />
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

export default Exports;
