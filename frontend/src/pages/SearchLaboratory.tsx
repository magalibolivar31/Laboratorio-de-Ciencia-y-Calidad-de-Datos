import React, { useState, useEffect, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import {
  Search, Database, Download, Loader2, Key,
  BookOpen, Plus, X, Edit, Trash2, Clock,
  ChevronDown, ArrowRight, ExternalLink, SlidersHorizontal, Maximize2
} from 'lucide-react';
import api from '../lib/api';

interface LabResult {
  id: number; nro: number; titulo: string; area: string; tipo: string;
  fuente: string; institucion: string; pais: string; registros: string;
  formato: string; variables: string; cant_variables: string;
  año_pub: string; año_act: string; url_original?: string;
  idioma: string; descripcion: string; propuesta: string;
  observaciones: string; responsable: string; archivo_url?: string;
}
interface SavedToken { id: number; servicio: string; api_key_cifrada: string }
interface UserInfo { nombre: string; email: string; rol?: string }
interface Diccionario { id: number; nombre: string; keywords: { keyword: { palabra: string } }[] }
interface HistorialItem { id: number; keywords: string; fuente: string; resultados: number; created_at: string }

interface Filtros {
  idioma: string;
  formatos: string[];
  añoPubDesde: string;
  añoPubHasta: string;
  añoActDesde: string;
  añoActHasta: string;
  registros: string;
}

const FILTROS_INIT: Filtros = {
  idioma: '', formatos: [], añoPubDesde: '', añoPubHasta: '', añoActDesde: '', añoActHasta: '', registros: ''
};

const FUENTES = [
  { id: 'ADMIN_DEFAULT', label: 'Todas las fuentes' },
  { id: 'ZENODO',        label: 'Zenodo' },
  { id: 'KAGGLE',        label: 'Kaggle' },
  { id: 'HF',            label: 'Hugging Face' },
  { id: 'UCI',           label: 'UCI Repository' },
  { id: 'HEALTHDATA',    label: 'HealthData.gov' },
];

const IDIOMAS  = ['Español', 'Inglés', 'Portugués', 'Francés'];
const FORMATOS = ['CSV', 'XLSX', 'JSON', 'XML', 'TXT', 'Parquet'];
const CURRENT_YEAR = new Date().getFullYear();

function countFiltrosActivos(f: Filtros) {
  let n = 0;
  if (f.idioma) n++;
  if (f.formatos.length) n++;
  if (f.añoPubDesde || f.añoPubHasta) n++;
  if (f.añoActDesde || f.añoActHasta) n++;
  if (f.registros) n++;
  return n;
}

function applyFiltros(results: LabResult[], f: Filtros): LabResult[] {
  return results.filter(r => {
    if (f.idioma) {
      const lang = r.idioma?.toLowerCase() ?? '';
      if (lang !== 'n/a' && lang && !lang.includes(f.idioma.toLowerCase())) return false;
    }
    if (f.formatos.length) {
      const fmt = r.formato?.toLowerCase() ?? '';
      if (fmt && fmt !== 'n/a' && !f.formatos.some(ff => fmt.includes(ff.toLowerCase()))) return false;
    }
    if (f.añoPubDesde || f.añoPubHasta) {
      const y = parseInt(r.año_pub);
      if (!isNaN(y)) {
        if (f.añoPubDesde && y < parseInt(f.añoPubDesde)) return false;
        if (f.añoPubHasta && y > parseInt(f.añoPubHasta)) return false;
      }
    }
    if (f.añoActDesde || f.añoActHasta) {
      const y = parseInt(r.año_act);
      if (!isNaN(y)) {
        if (f.añoActDesde && y < parseInt(f.añoActDesde)) return false;
        if (f.añoActHasta && y > parseInt(f.añoActHasta)) return false;
      }
    }
    if (f.registros) {
      const raw = r.registros?.replace(/[^0-9]/g, '');
      const n = raw ? parseInt(raw) : NaN;
      if (!isNaN(n)) {
        if (f.registros === '<1k'       && n >= 1_000)                       return false;
        if (f.registros === '1k-10k'    && (n < 1_000   || n >= 10_000))     return false;
        if (f.registros === '10k-100k'  && (n < 10_000  || n >= 100_000))    return false;
        if (f.registros === '>100k'     && n < 100_000)                      return false;
      }
    }
    return true;
  });
}

const Pill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border whitespace-nowrap ${
      active ? 'bg-uai-red text-white border-uai-red shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-uai-red hover:text-uai-red'
    }`}
  >
    {label}
  </button>
);

const CheckPill: React.FC<{ label: string; active: boolean; onClick: () => void }> = ({ label, active, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`px-3 py-1.5 rounded-full text-xs font-black transition-all border whitespace-nowrap flex items-center gap-1.5 ${
      active ? 'bg-uai-red text-white border-uai-red shadow-sm' : 'bg-white text-gray-500 border-gray-200 hover:border-uai-red hover:text-uai-red'
    }`}
  >
    {active && <span className="text-[10px]">✓</span>}
    {label}
  </button>
);

const SearchLaboratory: React.FC = () => {
  const [selectedApi, setSelectedApi]     = useState('ADMIN_DEFAULT');
  const [keywords, setKeywords]           = useState('');
  const [selectedDic, setSelectedDic]     = useState('');
  const [loading, setLoading]             = useState(false);
  const [results, setResults]             = useState<LabResult[]>([]);
  const [user, setUser]                   = useState<UserInfo | null>(null);
  const [savedTokens, setSavedTokens]     = useState<SavedToken[]>([]);
  const [diccionarios, setDiccionarios]   = useState<Diccionario[]>([]);
  const [historial, setHistorial]         = useState<HistorialItem[]>([]);
  const [isModalOpen, setIsModalOpen]     = useState(false);
  const [showHistorial, setShowHistorial] = useState(false);
  const [showFiltros, setShowFiltros]     = useState(false);
  const [filtros, setFiltros]             = useState<Filtros>(FILTROS_INIT);
  const [error, setError]                 = useState('');
  const resultsRef                          = useRef<HTMLDivElement>(null);
  const [showTableModal, setShowTableModal] = useState(false);
  const [lastSearchMeta, setLastSearchMeta] = useState<{ url: string; filename: string; busquedaId: number | null } | null>(null);
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const [savingExport, setSavingExport]       = useState(false);
  const [exportPublica, setExportPublica]         = useState(false);
  const [exportDescripcion, setExportDescripcion] = useState('');
  const [exportNombre, setExportNombre]           = useState('');

  const apiOptions = [
    ...FUENTES,
    ...savedTokens.map(t => ({ id: `SAVED_${t.id}`, label: `Personal: ${t.servicio}` })),
  ];

  const fetchAll = async () => {
    try { const r = await api.get('/tokens');              setSavedTokens(r.data); }           catch {}
    try { const r = await api.get('/diccionarios');        setDiccionarios(r.data); }           catch {}
    try { const r = await api.get('/historial/busquedas'); setHistorial(r.data.slice(0, 8)); }  catch {}
  };

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }

    const pending = localStorage.getItem('pendingSearch');
    if (pending) {
      try {
        const { keywords: kw, fuente } = JSON.parse(pending);
        if (kw) setKeywords(kw);
        if (fuente) setSelectedApi(fuente);
        localStorage.removeItem('pendingSearch');
      } catch {}
    }

    fetchAll();
  }, []);

  const filtrosActivos = countFiltrosActivos(filtros);
  const filteredResults = useMemo(() => applyFiltros(results, filtros), [results, filtros]);

  const setF = <K extends keyof Filtros>(key: K, val: Filtros[K]) =>
    setFiltros(prev => ({ ...prev, [key]: val }));

  const toggleFormato = (fmt: string) =>
    setFiltros(prev => ({
      ...prev,
      formatos: prev.formatos.includes(fmt)
        ? prev.formatos.filter(f => f !== fmt)
        : [...prev.formatos, fmt]
    }));

  const handleDicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedDic(val);
    if (val) {
      const g = diccionarios.find(d => String(d.id) === val);
      if (g) setKeywords(g.keywords.map(gk => gk.keyword.palabra).join(', '));
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keywords.trim()) return;
    setLoading(true); setResults([]); setError('');
    try {
      const kws = keywords.split(',').map(k => k.trim()).filter(Boolean);
      const res = await api.post('/datasets/search', { keywords: kws, apiKey: '', service: selectedApi });
      const url = res.data.url;
      const newResults = (res.data.resultados || []).map((r: any) => ({ ...r, archivo_url: url }));
      setResults(newResults);
      if (res.data.archivo) {
        setLastSearchMeta({ url: res.data.url, filename: res.data.archivo, busquedaId: res.data.busqueda_id ?? null });
        setExportNombre(sugerirNombre(kws));
      }
      if (newResults.length > 0 && filtrosActivos === 0) setShowFiltros(true);
      if (newResults.length > 0) {
        setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
      }
      fetchAll();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al conectar con el motor de búsqueda.');
    } finally {
      setLoading(false);
    }
  };

  const sugerirNombre = (kws: string[]): string => {
    const limpias = kws.slice(0, 3).map(k =>
      k.trim().charAt(0).toUpperCase() + k.trim().slice(1).toLowerCase()
    );
    return limpias.join(' · ');
  };

  const handleExport = () => {
    if (!lastSearchMeta?.url) { alert('Primero realizá una búsqueda.'); return; }
    setShowExportConfirm(true);
  };

  const doDownload = () => {
    if (lastSearchMeta?.url) window.open(lastSearchMeta.url, '_blank');
  };

  const handleConfirmExport = async (save: boolean) => {
    doDownload();
    if (save && lastSearchMeta) {
      setSavingExport(true);
      try {
        await api.post('/historial/exportaciones', {
          filename: lastSearchMeta.filename,
          busqueda_id: lastSearchMeta.busquedaId,
          nombre: exportNombre.trim() || null,
          publica: exportPublica,
          descripcion: exportDescripcion || null,
        });
        fetchAll();
      } catch {}
      finally {
        setSavingExport(false);
        setExportPublica(false);
        setExportDescripcion('');
        setExportNombre('');
      }
    }
    setShowExportConfirm(false);
  };

  const reuseSearch = (h: HistorialItem) => {
    setKeywords(h.keywords); setSelectedApi(h.fuente || 'ADMIN_DEFAULT'); setShowHistorial(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <Search size={28} className="text-uai-red" /> Búsqueda
          </h2>
          <div className="flex items-center gap-6">
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

        {/* Guía de flujo */}
        <div className="bg-white border-b border-gray-100 px-10 py-4 shrink-0">
          <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
            <span className="flex items-center gap-2 font-bold text-uai-red">
              <span className="w-6 h-6 bg-uai-red text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
              Elegí la fuente
            </span>
            <ArrowRight size={14} className="text-gray-300" />
            <span className="flex items-center gap-2 font-bold text-gray-500">
              <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
              Ingresá keywords o elegí un diccionario
            </span>
            <ArrowRight size={14} className="text-gray-300" />
            <span className="flex items-center gap-2 font-bold text-gray-500">
              <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
              Filtrá y exportá
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="px-10 pt-6 pb-10 space-y-4">

            {/* Panel de búsqueda */}
            <div className="bg-gray-50 rounded-2xl border border-gray-200 p-6 space-y-4">
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <Database size={12} className="text-uai-red" /> Fuente
                      <button type="button" onClick={() => setIsModalOpen(true)} className="ml-auto text-uai-red font-black text-[10px] hover:underline flex items-center gap-0.5">
                        <Plus size={11} /> Gestionar APIs
                      </button>
                    </label>
                    <select className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-700 focus:border-uai-red outline-none transition-all" value={selectedApi} onChange={e => setSelectedApi(e.target.value)}>
                      {apiOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                      <BookOpen size={12} className="text-uai-red" /> Diccionario (opcional)
                    </label>
                    <select className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold text-gray-600 focus:border-uai-red outline-none transition-all" value={selectedDic} onChange={handleDicChange}>
                      <option value="">— Escribir keywords manualmente —</option>
                      {diccionarios.map(d => (
                        <option key={d.id} value={String(d.id)}>{d.nombre} ({d.keywords.length} keywords)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Keywords</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Ej: diabetes, hypertension, Argentina..."
                      className="flex-1 p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none transition-all"
                      value={keywords}
                      onChange={e => { setKeywords(e.target.value); setSelectedDic(''); }}
                    />
                    <button type="submit" disabled={loading || !keywords.trim()} className="flex items-center gap-2 bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm">
                      {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />} BUSCAR
                    </button>
                    <button type="button" onClick={handleExport} disabled={results.length === 0} className="flex items-center gap-2 bg-gray-800 text-white px-6 py-3 rounded-xl font-black hover:bg-black transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                      <Download size={18} /> EXCEL
                    </button>
                  </div>
                </div>

                {error && <p className="text-sm text-red-600 font-bold bg-red-50 px-4 py-3 rounded-xl border border-red-100">{error}</p>}
              </form>

              {/* Historial reciente */}
              {historial.length > 0 && (
                <div className="border-t border-gray-200 pt-4">
                  <button onClick={() => setShowHistorial(!showHistorial)} className="flex items-center gap-2 text-xs font-black text-gray-400 hover:text-uai-red transition-all">
                    <Clock size={13} /> Búsquedas recientes
                    <ChevronDown size={13} className={`transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
                  </button>
                  {showHistorial && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {historial.map(h => (
                        <button key={h.id} onClick={() => reuseSearch(h)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full text-xs font-bold text-gray-600 hover:border-uai-red hover:text-uai-red transition-all"
                          title={`${h.fuente} · ${h.resultados} resultados`}>
                          <Search size={11} />
                          <span className="max-w-[160px] truncate">{h.keywords}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-gray-400">{h.resultados} res.</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Panel de Filtros ── */}
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div
                role="button"
                onClick={() => setShowFiltros(!showFiltros)}
                className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-all cursor-pointer"
              >
                <span className="flex items-center gap-2 text-sm font-black text-gray-700">
                  <SlidersHorizontal size={16} className="text-uai-red" />
                  Filtros
                  {filtrosActivos > 0 && (
                    <span className="bg-uai-red text-white text-[10px] font-black px-2 py-0.5 rounded-full">
                      {filtrosActivos} activo{filtrosActivos > 1 ? 's' : ''}
                    </span>
                  )}
                  {results.length > 0 && filtrosActivos > 0 && (
                    <span className="text-gray-400 font-medium text-xs">
                      — mostrando {filteredResults.length} de {results.length}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-3">
                  {filtrosActivos > 0 && (
                    <span
                      role="button"
                      onClick={e => { e.stopPropagation(); setFiltros(FILTROS_INIT); }}
                      className="text-xs font-black text-gray-400 hover:text-red-500 transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <X size={13} /> Limpiar
                    </span>
                  )}
                  <ChevronDown size={16} className={`text-gray-400 transition-transform ${showFiltros ? 'rotate-180' : ''}`} />
                </div>
              </div>

              {showFiltros && (
                <div className="border-t border-gray-100 px-6 py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">

                    {/* Idioma */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">🌎 Idioma</p>
                      <div className="flex flex-wrap gap-2">
                        <Pill label="Todos" active={filtros.idioma === ''} onClick={() => setF('idioma', '')} />
                        {IDIOMAS.map(lang => (
                          <Pill key={lang} label={lang} active={filtros.idioma === lang} onClick={() => setF('idioma', filtros.idioma === lang ? '' : lang)} />
                        ))}
                      </div>
                    </div>

                    {/* Formato */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">📄 Formato</p>
                      <div className="flex flex-wrap gap-2">
                        <Pill label="Todos" active={filtros.formatos.length === 0} onClick={() => setF('formatos', [])} />
                        {FORMATOS.map(fmt => (
                          <CheckPill key={fmt} label={fmt} active={filtros.formatos.includes(fmt)} onClick={() => toggleFormato(fmt)} />
                        ))}
                      </div>
                    </div>

                    {/* Cantidad de registros */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">📊 Cantidad de registros</p>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: '',          label: 'Todos' },
                          { id: '<1k',       label: '< 1.000' },
                          { id: '1k-10k',    label: '1K – 10K' },
                          { id: '10k-100k',  label: '10K – 100K' },
                          { id: '>100k',     label: '> 100K' },
                        ].map(o => (
                          <Pill key={o.id} label={o.label} active={filtros.registros === o.id} onClick={() => setF('registros', o.id)} />
                        ))}
                      </div>
                    </div>

                    {/* Año de publicación */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">📅 Año de publicación</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Desde</label>
                          <input
                            type="number" min="1990" max={CURRENT_YEAR} placeholder="2010"
                            className="w-full p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-uai-red outline-none mt-1"
                            value={filtros.añoPubDesde}
                            onChange={e => setF('añoPubDesde', e.target.value)}
                          />
                        </div>
                        <span className="text-gray-300 font-black mt-5">—</span>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Hasta</label>
                          <input
                            type="number" min="1990" max={CURRENT_YEAR} placeholder={String(CURRENT_YEAR)}
                            className="w-full p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-uai-red outline-none mt-1"
                            value={filtros.añoPubHasta}
                            onChange={e => setF('añoPubHasta', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Año de actualización */}
                    <div className="space-y-2">
                      <p className="text-xs font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">🔄 Año de actualización</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Desde</label>
                          <input
                            type="number" min="1990" max={CURRENT_YEAR} placeholder="2018"
                            className="w-full p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-uai-red outline-none mt-1"
                            value={filtros.añoActDesde}
                            onChange={e => setF('añoActDesde', e.target.value)}
                          />
                        </div>
                        <span className="text-gray-300 font-black mt-5">—</span>
                        <div className="flex-1">
                          <label className="text-[10px] text-gray-400 font-black uppercase ml-1">Hasta</label>
                          <input
                            type="number" min="1990" max={CURRENT_YEAR} placeholder={String(CURRENT_YEAR)}
                            className="w-full p-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl font-bold text-sm focus:border-uai-red outline-none mt-1"
                            value={filtros.añoActHasta}
                            onChange={e => setF('añoActHasta', e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* Tabla de resultados */}
            <div ref={resultsRef} className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col ${filteredResults.length > 0 ? 'h-[52vh]' : ''}`}>
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0">
                <h3 className="text-sm font-black text-gray-700 uppercase tracking-widest flex items-center gap-2">
                  <Database size={16} className="text-uai-red" /> Resultados
                </h3>
                {results.length > 0 && (
                  <div className="flex items-center gap-2">
                    {filtrosActivos > 0 && filteredResults.length !== results.length && (
                      <span className="text-xs text-gray-400 font-medium">
                        {filteredResults.length} de {results.length} resultados
                      </span>
                    )}
                    <span className="bg-uai-accent text-uai-red px-3 py-1 rounded-full text-xs font-black border border-uai-red/10">
                      {filteredResults.length} registros
                    </span>
                    <button
                      onClick={() => setShowTableModal(true)}
                      title="Ver tabla completa"
                      className="p-1.5 text-gray-400 hover:text-uai-red hover:bg-gray-100 rounded-lg transition-all"
                    >
                      <Maximize2 size={15} />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-24 gap-3 text-gray-400">
                  <Loader2 className="animate-spin text-uai-red" size={32} />
                  <div className="text-center">
                    <p className="font-bold text-gray-600">Consultando fuentes de datos...</p>
                    <p className="text-xs text-gray-400 mt-1">Zenodo · Kaggle · Hugging Face · UCI · HealthData.gov</p>
                    <p className="text-xs text-gray-300 mt-1">Esto puede tardar hasta 20 segundos</p>
                  </div>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-gray-300">
                  <Search size={52} className="mb-4 opacity-30" />
                  {results.length > 0
                    ? <><p className="font-black uppercase tracking-widest text-sm">Sin resultados con los filtros aplicados</p>
                       <button onClick={() => setFiltros(FILTROS_INIT)} className="mt-3 text-xs text-uai-red font-black hover:underline">Limpiar filtros</button></>
                    : <p className="font-black uppercase tracking-widest text-sm">Ingresá keywords y presioná BUSCAR</p>
                  }
                </div>
              ) : (
                <div className="overflow-auto flex-1">
                  <table className="w-full text-left border-collapse min-w-[3800px]">
                    <thead className="sticky top-0 z-20">
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        {[
                          ['Nro', 'w-14 text-center'],
                          ['Dataset', 'min-w-[380px]'],
                          ['Área', 'min-w-[180px]'],
                          ['Tipo', 'min-w-[180px]'],
                          ['Fuente', 'min-w-[130px] text-center'],
                          ['Institución', 'min-w-[260px]'],
                          ['País', 'min-w-[130px]'],
                          ['Registros', 'min-w-[110px] text-center'],
                          ['Formato', 'min-w-[130px]'],
                          ['Variables', 'min-w-[280px]'],
                          ['Cant. Var', 'min-w-[90px] text-center'],
                          ['Año Pub', 'min-w-[90px] text-center'],
                          ['Año Act', 'min-w-[90px] text-center'],
                          ['Link', 'min-w-[280px]'],
                          ['Idioma', 'min-w-[110px] text-center'],
                          ['Descripción', 'min-w-[480px]'],
                          ['Propuesta', 'min-w-[280px]'],
                          ['Observaciones', 'min-w-[260px]'],
                        ].map(([label, cls]) => (
                          <th key={label as string} className={`px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap ${cls}`}>
                            {label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {filteredResults.map(r => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-sm font-black text-gray-400 text-center">{r.nro}</td>
                          <td className="px-5 py-3 text-sm font-black text-uai-red leading-snug">{r.titulo}</td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-700">{r.area}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{r.tipo}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="px-2 py-1 bg-uai-red text-white text-[10px] font-black rounded-lg uppercase tracking-wider">{r.fuente}</span>
                          </td>
                          <td className="px-5 py-3 text-sm text-gray-700">{r.institucion}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{r.pais}</td>
                          <td className="px-5 py-3 text-sm font-black font-mono text-gray-800 text-center">{r.registros}</td>
                          <td className="px-5 py-3 text-sm text-gray-600">{r.formato}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 italic">{r.variables}</td>
                          <td className="px-5 py-3 text-sm font-mono font-black text-gray-800 text-center">{r.cant_variables}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 text-center">{r.año_pub}</td>
                          <td className="px-5 py-3 text-sm font-black text-uai-red text-center">{r.año_act}</td>
                          <td className="px-5 py-3 text-sm">
                            {r.url_original
                              ? <a href={r.url_original} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline break-all">
                                  <ExternalLink size={12} className="shrink-0" />{r.url_original}
                                </a>
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-5 py-3 text-sm font-black text-gray-600 text-center">{r.idioma}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 leading-relaxed">{r.descripcion}</td>
                          <td className="px-5 py-3 text-sm text-gray-600 bg-gray-50/50">{r.propuesta}</td>
                          <td className="px-5 py-3 text-sm text-gray-500 italic">{r.observaciones}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      </main>

      <ApiManagerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} tokens={savedTokens} onRefresh={fetchAll} />

      {/* Modal confirmación exportación */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-uai-accent rounded-xl">
                  <Download size={20} className="text-uai-red" />
                </div>
                <div>
                  <h3 className="font-black text-gray-800">Descargar exportación</h3>
                  <p className="text-xs text-gray-400 mt-0.5">El archivo se descarga en ambos casos</p>
                </div>
              </div>
              <button onClick={() => setShowExportConfirm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-all">
                <X size={18} className="text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Nombre */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  Nombre de la colección
                  {exportPublica && <span className="text-uai-red">*</span>}
                </label>
                <input
                  type="text"
                  maxLength={100}
                  placeholder="Ej: Datasets de salud mental · Argentina"
                  className={`w-full p-3 border-2 rounded-xl text-sm font-medium outline-none transition-all ${exportPublica && !exportNombre.trim() ? 'border-red-300 bg-red-50 focus:border-red-500' : 'bg-gray-50 border-gray-200 focus:border-uai-red'}`}
                  value={exportNombre}
                  onChange={e => setExportNombre(e.target.value)}
                />
                <p className="text-[10px] text-gray-400">Sugerido a partir de tus keywords. Podés editarlo.</p>
              </div>

              {/* Descripción */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">
                  Descripción
                  {exportPublica ? <span className="text-uai-red">*</span> : <span className="text-gray-300">(opcional)</span>}
                </label>
                <textarea
                  rows={2}
                  maxLength={400}
                  placeholder="Ej: Recopilación de datasets de salud mental para el proyecto de investigación sobre depresión..."
                  className={`w-full p-3 border-2 rounded-xl text-sm font-medium outline-none resize-none transition-all ${exportPublica && !exportDescripcion.trim() ? 'border-red-300 bg-red-50 focus:border-red-500' : 'bg-gray-50 border-gray-200 focus:border-uai-red'}`}
                  value={exportDescripcion}
                  onChange={e => setExportDescripcion(e.target.value)}
                />
              </div>

              {/* Visibilidad */}
              <div className="space-y-2">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Visibilidad</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setExportPublica(false)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${!exportPublica ? 'border-uai-red bg-uai-accent' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <p className={`text-sm font-black ${!exportPublica ? 'text-uai-red' : 'text-gray-700'}`}>Privada</p>
                    <p className="text-xs text-gray-400 mt-0.5">Solo vos podés verla</p>
                  </button>
                  <button type="button" onClick={() => setExportPublica(true)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${exportPublica ? 'border-uai-red bg-uai-accent' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <p className={`text-sm font-black ${exportPublica ? 'text-uai-red' : 'text-gray-700'}`}>Pública</p>
                    <p className="text-xs text-gray-400 mt-0.5">Visible para toda la comunidad</p>
                  </button>
                </div>
                {exportPublica && (!exportNombre.trim() || !exportDescripcion.trim()) && (
                  <p className="text-xs text-red-500 font-bold">Las exportaciones públicas requieren nombre y descripción.</p>
                )}
              </div>

              {/* Botones */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => handleConfirmExport(true)}
                  disabled={savingExport || (exportPublica && (!exportNombre.trim() || !exportDescripcion.trim()))}
                  className="w-full flex items-center justify-center gap-2 bg-uai-red text-white py-3 rounded-xl font-black hover:bg-red-800 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {savingExport ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Guardar y descargar
                </button>
                <button
                  onClick={() => handleConfirmExport(false)}
                  disabled={savingExport}
                  className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-3 rounded-xl font-black hover:bg-gray-200 transition-all disabled:opacity-50"
                >
                  Solo descargar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal tabla completa */}
      {showTableModal && (
        <div className="fixed inset-0 z-[200] bg-black/60 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="bg-white w-full h-full max-w-[98vw] max-h-[96vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-black text-gray-800 flex items-center gap-2">
                <Database size={18} className="text-uai-red" />
                Resultados
                <span className="bg-uai-accent text-uai-red px-3 py-1 rounded-full text-xs font-black border border-uai-red/10 ml-1">
                  {filteredResults.length} registros
                </span>
                {filtrosActivos > 0 && filteredResults.length !== results.length && (
                  <span className="text-xs text-gray-400 font-medium ml-1">de {results.length} totales</span>
                )}
              </h3>
              <button onClick={() => setShowTableModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition-all" title="Cerrar">
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="overflow-auto flex-1">
              <table className="w-full text-left border-collapse min-w-[3600px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-gray-50 border-b-2 border-gray-200">
                    {[
                      ['Nro', 'w-14 text-center'],
                      ['Dataset', 'min-w-[380px]'],
                      ['Área', 'min-w-[180px]'],
                      ['Tipo', 'min-w-[180px]'],
                      ['Fuente', 'min-w-[130px] text-center'],
                      ['Institución', 'min-w-[260px]'],
                      ['País', 'min-w-[130px]'],
                      ['Registros', 'min-w-[110px] text-center'],
                      ['Formato', 'min-w-[130px]'],
                      ['Variables', 'min-w-[280px]'],
                      ['Cant. Var', 'min-w-[90px] text-center'],
                      ['Año Pub', 'min-w-[90px] text-center'],
                      ['Año Act', 'min-w-[90px] text-center'],
                      ['Link', 'min-w-[280px]'],
                      ['Idioma', 'min-w-[110px] text-center'],
                      ['Descripción', 'min-w-[480px]'],
                      ['Propuesta', 'min-w-[280px]'],
                      ['Observaciones', 'min-w-[260px]'],
                    ].map(([label, cls]) => (
                      <th key={label as string} className={`px-5 py-3 text-[10px] font-black text-gray-500 uppercase tracking-widest whitespace-nowrap ${cls}`}>
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 bg-white">
                  {filteredResults.map(r => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm font-black text-gray-400 text-center">{r.nro}</td>
                      <td className="px-5 py-3 text-sm font-black text-uai-red leading-snug">{r.titulo}</td>
                      <td className="px-5 py-3 text-sm font-bold text-gray-700">{r.area}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{r.tipo}</td>
                      <td className="px-5 py-3 text-center">
                        <span className="px-2 py-1 bg-uai-red text-white text-[10px] font-black rounded-lg uppercase tracking-wider">{r.fuente}</span>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-700">{r.institucion}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{r.pais}</td>
                      <td className="px-5 py-3 text-sm font-black font-mono text-gray-800 text-center">{r.registros}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{r.formato}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 italic">{r.variables}</td>
                      <td className="px-5 py-3 text-sm font-mono font-black text-gray-800 text-center">{r.cant_variables}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 text-center">{r.año_pub}</td>
                      <td className="px-5 py-3 text-sm font-black text-uai-red text-center">{r.año_act}</td>
                      <td className="px-5 py-3 text-sm">
                        {r.url_original
                          ? <a href={r.url_original} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold underline break-all">
                              <ExternalLink size={12} className="shrink-0" />{r.url_original}
                            </a>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3 text-sm font-black text-gray-600 text-center">{r.idioma}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 leading-relaxed">{r.descripcion}</td>
                      <td className="px-5 py-3 text-sm text-gray-600 bg-gray-50/50">{r.propuesta}</td>
                      <td className="px-5 py-3 text-sm text-gray-500 italic">{r.observaciones}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Modal APIs ── */
const ApiManagerModal: React.FC<{
  isOpen: boolean; onClose: () => void; tokens: SavedToken[]; onRefresh: () => void;
}> = ({ isOpen, onClose, tokens, onRefresh }) => {
  const [name, setName] = useState('');
  const [key, setKey]   = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  if (!isOpen) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      editId ? await api.put(`/tokens/${editId}`, { servicio: name, api_key: key })
             : await api.post('/tokens', { servicio: name, api_key: key });
      setName(''); setKey(''); setEditId(null); onRefresh();
    } catch { alert('Error al guardar'); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-uai-red text-white">
          <div>
            <h3 className="text-xl font-black uppercase">Mis Conexiones API</h3>
            <p className="text-xs font-bold opacity-70 mt-0.5">Zenodo · Kaggle · Hugging Face</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full"><X size={22} /></button>
        </div>
        <div className="p-6 overflow-y-auto space-y-6">
          <form onSubmit={submit} className="bg-gray-50 p-5 rounded-2xl border border-gray-200 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Nombre</label>
                <input type="text" placeholder="Ej: Mi Zenodo" className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={name} onChange={e => setName(e.target.value)} required />
              </div>
              <div>
                <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Token / API Key</label>
                <input type="password" placeholder="Pegá el token..." className="w-full p-3 bg-white border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={key} onChange={e => setKey(e.target.value)} required />
              </div>
            </div>
            <button type="submit" className="w-full bg-uai-red text-white py-3 rounded-xl font-black hover:bg-red-800 transition-all">
              {editId ? 'ACTUALIZAR' : '+ GUARDAR API'}
            </button>
          </form>
          <div className="space-y-3">
            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Guardadas ({tokens.length})</p>
            {tokens.length === 0
              ? <p className="text-center py-8 text-gray-300 italic text-sm">No tenés APIs guardadas.</p>
              : tokens.map(t => (
                <div key={t.id} className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-2xl hover:border-uai-red transition-all">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-uai-accent text-uai-red rounded-xl"><Key size={16} /></div>
                    <div>
                      <p className="font-black text-gray-800 text-sm uppercase">{t.servicio}</p>
                      <p className="text-xs text-gray-400 font-mono">••••••••••••••</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => { setName(t.servicio); setKey(t.api_key_cifrada); setEditId(t.id); }} className="p-2 text-gray-300 hover:text-uai-red hover:bg-gray-50 rounded-lg"><Edit size={15} /></button>
                    <button onClick={async () => { if (!confirm('¿Eliminar?')) return; try { await api.delete(`/tokens/${t.id}`); onRefresh(); } catch {} }} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchLaboratory;
