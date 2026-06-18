import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { BookOpen, Plus, Trash2, Edit, Tag, Layers, Upload, X, CheckCircle, AlertCircle, ArrowRight, Search, ChevronDown, FolderOpen, Check } from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Keyword { id: number; palabra: string; categoria: string }
interface Diccionario { id: number; nombre: string; descripcion?: string; keywords: { keyword: Keyword }[] }
interface UserInfo { nombre: string; email: string; rol?: string }

const CATEGORIAS = ['General', 'Salud', 'Educación', 'Economía', 'Tecnología', 'Medio Ambiente'];

const CAT_COLORS: Record<string, string> = {
  Salud:          'bg-rose-100 text-rose-700 border-rose-200',
  Educación:      'bg-blue-100 text-blue-700 border-blue-200',
  Economía:       'bg-amber-100 text-amber-700 border-amber-200',
  Tecnología:     'bg-violet-100 text-violet-700 border-violet-200',
  'Medio Ambiente': 'bg-emerald-100 text-emerald-700 border-emerald-200',
  General:        'bg-gray-100 text-gray-600 border-gray-200',
};

const catColor = (cat: string) => CAT_COLORS[cat] || CAT_COLORS.General;

const Msg: React.FC<{ msg: { type: 'ok' | 'err'; text: string } | null }> = ({ msg }) =>
  msg ? (
    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.type === 'ok' ? <CheckCircle size={14} /> : <AlertCircle size={14} />} {msg.text}
    </div>
  ) : null;

const Keywords: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tab, setTab] = useState<'keywords' | 'diccionarios' | 'categorias'>('keywords');
  const [keywords, setKeywords] = useState<Keyword[]>([]);
  const [diccionarios, setDiccionarios] = useState<Diccionario[]>([]);
  const [categorias, setCategorias] = useState<string[]>(CATEGORIAS);
  const [loading, setLoading] = useState(true);
  const [filtroCat, setFiltroCat] = useState('');

  // keyword form
  const [palabra, setPalabra] = useState('');
  const [categoria, setCategoria] = useState('General');
  const [editKw, setEditKw] = useState<Keyword | null>(null);
  const [kwMsg, setKwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkText, setBulkText] = useState('');
  const [bulkCat, setBulkCat] = useState('General');
  const [bulkMsg, setBulkMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // diccionario form
  const [showDicForm, setShowDicForm] = useState(false);
  const [editDic, setEditDic] = useState<Diccionario | null>(null);
  const [dicNombre, setDicNombre] = useState('');
  const [dicDesc, setDicDesc] = useState('');
  const [dicMsg, setDicMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [addingToDic, setAddingToDic] = useState<number | null>(null);
  const [kwParaDic, setKwParaDic] = useState('');

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    loadAll();
  }, []);

  const loadAll = async () => {
    setLoading(true);
    try { const r = await api.get('/keywords'); setKeywords(r.data); } catch {}
    try { const r = await api.get('/diccionarios'); setDiccionarios(r.data); } catch {}
    setLoading(false);
  };

  // ── Keywords ───────────────────────────────────────────
  const saveKw = async (e: React.FormEvent) => {
    e.preventDefault();
    setKwMsg(null);
    try {
      if (editKw) {
        await api.put(`/keywords/${editKw.id}`, { palabra, categoria });
        setKwMsg({ type: 'ok', text: 'Keyword actualizada.' });
      } else {
        await api.post('/keywords', { palabra, categoria });
        setKwMsg({ type: 'ok', text: `"${palabra}" agregada.` });
      }
      setPalabra(''); setCategoria('General'); setEditKw(null);
      loadAll();
    } catch (err: any) {
      setKwMsg({ type: 'err', text: err.response?.data?.error || 'Error al guardar.' });
    }
  };

  const deleteKw = async (id: number) => {
    if (!confirm('¿Eliminar esta keyword?')) return;
    try { await api.delete(`/keywords/${id}`); loadAll(); } catch {}
  };

  const bulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setBulkMsg(null);
    const palabras = bulkText.split(/[\n,]/).map(p => p.trim()).filter(Boolean);
    if (!palabras.length) { setBulkMsg({ type: 'err', text: 'Ingresá al menos una keyword.' }); return; }
    try {
      const r = await api.post('/keywords/bulk', { palabras, categoria: bulkCat });
      setBulkMsg({ type: 'ok', text: `${r.data.count} keywords importadas correctamente.` });
      setBulkText('');
      loadAll();
    } catch (err: any) {
      setBulkMsg({ type: 'err', text: err.response?.data?.error || 'Error al importar.' });
    }
  };

  // ── Diccionarios ────────────────────────────────────────
  const saveDic = async (e: React.FormEvent) => {
    e.preventDefault();
    setDicMsg(null);
    try {
      if (editDic) {
        await api.put(`/diccionarios/${editDic.id}`, { nombre: dicNombre, descripcion: dicDesc });
        setDicMsg({ type: 'ok', text: 'Diccionario actualizado.' });
      } else {
        await api.post('/diccionarios', { nombre: dicNombre, descripcion: dicDesc });
        setDicMsg({ type: 'ok', text: `Diccionario "${dicNombre}" creado.` });
      }
      setDicNombre(''); setDicDesc(''); setEditDic(null); setShowDicForm(false);
      loadAll();
    } catch (err: any) {
      setDicMsg({ type: 'err', text: err.response?.data?.error || 'Error al guardar.' });
    }
  };

  const deleteDic = async (id: number) => {
    if (!confirm('¿Eliminar este diccionario y todas sus keywords asignadas?')) return;
    try { await api.delete(`/diccionarios/${id}`); loadAll(); } catch {}
  };

  const addKwToDic = async (dicId: number) => {
    if (!kwParaDic) return;
    try {
      await api.post(`/diccionarios/${dicId}/keywords`, { keyword_id: kwParaDic });
      setKwParaDic(''); setAddingToDic(null);
      loadAll();
    } catch {}
  };

  const removeKwFromDic = async (dicId: number, kwId: number) => {
    try { await api.delete(`/diccionarios/${dicId}/keywords/${kwId}`); loadAll(); } catch {}
  };

  const kwFiltradas = filtroCat ? keywords.filter(k => k.categoria === filtroCat) : keywords;

  // ── Categorías state ───────────────────────────────────
  const [nuevaCat, setNuevaCat]       = useState('');
  const [catMsg, setCatMsg]           = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal, setRenameVal]     = useState('');

  const handleCreateCat = (e: React.FormEvent) => {
    e.preventDefault();
    setCatMsg(null);
    const nombre = nuevaCat.trim();
    if (!nombre) return;
    if (categorias.find(c => c.toLowerCase() === nombre.toLowerCase())) {
      setCatMsg({ type: 'err', text: 'Esa categoría ya existe.' }); return;
    }
    setCategorias(prev => [...new Set([...prev, nombre])]);
    setNuevaCat('');
    setCatMsg({ type: 'ok', text: `Categoría "${nombre}" creada. Ahora podés usarla al agregar keywords.` });
  };

  const handleRenameCat = async (from: string) => {
    const to = renameVal.trim();
    if (!to || to === from) { setRenamingCat(null); return; }
    try {
      await api.patch('/keywords/categorias/rename', { from, to });
      setCatMsg({ type: 'ok', text: `"${from}" renombrada a "${to}".` });
      setRenamingCat(null); setRenameVal('');
      loadAll();
    } catch (err: any) {
      setCatMsg({ type: 'err', text: err.response?.data?.error || 'Error al renombrar.' });
    }
  };

  const handleDeleteCat = async (nombre: string) => {
    if (!confirm(`¿Eliminar la categoría "${nombre}"?\n\nTodas sus keywords pasarán a "General".`)) return;
    try {
      const res = await api.delete(`/keywords/categorias/${encodeURIComponent(nombre)}`);
      setCatMsg({ type: 'ok', text: res.data.mensaje });
      loadAll();
    } catch (err: any) {
      setCatMsg({ type: 'err', text: err.response?.data?.error || 'Error al eliminar.' });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header */}
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <BookOpen size={28} className="text-uai-red" /> Diccionario de Keywords
          </h2>
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
              <p className="text-base font-black text-gray-800">{user?.nombre || 'Usuario'}</p>
              <p className="text-xs text-uai-red font-black uppercase tracking-widest">{user?.rol === 'ADMINISTRADOR' ? 'Administrador' : 'Investigador'}</p>
            </div>
            <div className="w-12 h-12 bg-uai-red rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg">
              {user?.nombre?.substring(0, 2).toUpperCase() || '??'}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">

          {/* Guía de flujo */}
          <div className="bg-white border-b border-gray-100 px-10 py-4">
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <span className="flex items-center gap-2 font-bold text-uai-red">
                <span className="w-6 h-6 bg-uai-red text-white rounded-full flex items-center justify-center text-xs font-black">1</span>
                Creá keywords
              </span>
              <ArrowRight size={14} className="text-gray-300" />
              <span className="flex items-center gap-2 font-bold text-gray-500">
                <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                Agrupalas en un diccionario
              </span>
              <ArrowRight size={14} className="text-gray-300" />
              <span className="flex items-center gap-2 font-bold text-gray-500">
                <span className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                Usá el diccionario en el Laboratorio
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-10 pt-6 pb-0 flex gap-2">
            <button
              onClick={() => setTab('keywords')}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-sm border-b-4 transition-all ${tab === 'keywords' ? 'bg-white text-uai-red border-uai-red shadow-sm' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}
            >
              <Tag size={16} /> Keywords
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black ${tab === 'keywords' ? 'bg-uai-red text-white' : 'bg-gray-300 text-gray-600'}`}>{keywords.length}</span>
            </button>
            <button
              onClick={() => setTab('diccionarios')}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-sm border-b-4 transition-all ${tab === 'diccionarios' ? 'bg-white text-uai-red border-uai-red shadow-sm' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}
            >
              <Layers size={16} /> Diccionarios
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black ${tab === 'diccionarios' ? 'bg-uai-red text-white' : 'bg-gray-300 text-gray-600'}`}>{diccionarios.length}</span>
            </button>
            <button
              onClick={() => { setTab('categorias'); setCatMsg(null); }}
              className={`flex items-center gap-2 px-6 py-3 rounded-t-2xl font-black text-sm border-b-4 transition-all ${tab === 'categorias' ? 'bg-white text-uai-red border-uai-red shadow-sm' : 'bg-gray-100 text-gray-500 border-transparent hover:bg-gray-200'}`}
            >
              <FolderOpen size={16} /> Categorías
              <span className={`ml-1 text-xs px-2 py-0.5 rounded-full font-black ${tab === 'categorias' ? 'bg-uai-red text-white' : 'bg-gray-300 text-gray-600'}`}>{categorias.length}</span>
            </button>
          </div>

          <div className="px-10 pb-10 bg-white min-h-full border-t border-gray-100 pt-8 space-y-8">

            {/* ══════════ TAB: KEYWORDS ══════════ */}
            {tab === 'keywords' && (
              <div className="space-y-6">

                {/* Form agregar keyword */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Tag size={14} className="text-uai-red" /> {editKw ? `Editando: "${editKw.palabra}"` : 'Agregar keyword'}
                  </h3>
                  <form onSubmit={saveKw}>
                    <div className="flex gap-3 items-end flex-wrap">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Palabra o frase</label>
                        <input
                          type="text"
                          placeholder="Ej: Diabetes tipo 2"
                          className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none transition-all"
                          value={palabra}
                          onChange={e => setPalabra(e.target.value)}
                          required
                          autoFocus={!!editKw}
                        />
                      </div>
                      <div className="w-48">
                        <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Categoría</label>
                        <select
                          className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none"
                          value={categoria}
                          onChange={e => setCategoria(e.target.value)}
                        >
                          {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                        </select>
                      </div>
                      <button type="submit" className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all whitespace-nowrap">
                        {editKw ? 'ACTUALIZAR' : '+ AGREGAR'}
                      </button>
                      {editKw && (
                        <button type="button" onClick={() => { setEditKw(null); setPalabra(''); setCategoria('General'); setKwMsg(null); }} className="p-3 bg-gray-200 rounded-xl font-black text-gray-500 hover:bg-gray-300">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                    <div className="mt-3"><Msg msg={kwMsg} /></div>
                  </form>

                  {/* Bulk import */}
                  <div className="mt-4 border-t border-gray-200 pt-4">
                    <button
                      onClick={() => setShowBulk(!showBulk)}
                      className="flex items-center gap-2 text-sm font-black text-gray-400 hover:text-uai-red transition-all"
                    >
                      <Upload size={14} /> Importar varias a la vez
                      <ChevronDown size={14} className={`transition-transform ${showBulk ? 'rotate-180' : ''}`} />
                    </button>
                    {showBulk && (
                      <form onSubmit={bulkImport} className="mt-4 space-y-3">
                        <textarea
                          rows={3}
                          className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none resize-none text-sm"
                          placeholder="Pegá las keywords separadas por coma o en cada línea:&#10;diabetes, hipertensión, obesidad&#10;covid-19, cardiopatía"
                          value={bulkText}
                          onChange={e => setBulkText(e.target.value)}
                        />
                        <div className="flex gap-3 items-center">
                          <select className="p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={bulkCat} onChange={e => setBulkCat(e.target.value)}>
                            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <button type="submit" className="bg-gray-800 text-white px-6 py-3 rounded-xl font-black hover:bg-black transition-all text-sm">IMPORTAR</button>
                        </div>
                        <Msg msg={bulkMsg} />
                      </form>
                    )}
                  </div>
                </div>

                {/* Lista de keywords */}
                <div>
                  {/* Filtro por categoría */}
                  <div className="flex items-center gap-2 flex-wrap mb-4">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Filtrar:</span>
                    <button
                      onClick={() => setFiltroCat('')}
                      className={`px-4 py-1.5 rounded-full text-xs font-black transition-all border ${filtroCat === '' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                    >
                      Todas ({keywords.length})
                    </button>
                    {CATEGORIAS.filter(c => keywords.some(k => k.categoria === c)).map(c => (
                      <button
                        key={c}
                        onClick={() => setFiltroCat(filtroCat === c ? '' : c)}
                        className={`px-4 py-1.5 rounded-full text-xs font-black transition-all border ${filtroCat === c ? `${catColor(c)} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'}`}
                      >
                        {c} ({keywords.filter(k => k.categoria === c).length})
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="py-16 text-center text-gray-300 font-bold uppercase tracking-widest">Cargando...</div>
                  ) : kwFiltradas.length === 0 ? (
                    <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                      <Tag size={36} className="mx-auto text-gray-200 mb-3" />
                      <p className="text-gray-400 font-bold">Aún no tenés keywords</p>
                      <p className="text-gray-300 text-sm mt-1">Usá el formulario de arriba para agregar la primera</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {kwFiltradas.map(kw => (
                        <div
                          key={kw.id}
                          className={`group flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-bold transition-all hover:shadow-md ${catColor(kw.categoria)}`}
                        >
                          <span>{kw.palabra}</span>
                          <span className="text-[10px] opacity-60 font-black uppercase">{kw.categoria}</span>
                          <div className="flex gap-1 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => { setEditKw(kw); setPalabra(kw.palabra); setCategoria(kw.categoria); setKwMsg(null); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                              className="p-0.5 hover:scale-110 transition-transform"
                              title="Editar"
                            >
                              <Edit size={12} />
                            </button>
                            <button onClick={() => deleteKw(kw.id)} className="p-0.5 hover:scale-110 transition-transform" title="Eliminar">
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ══════════ TAB: DICCIONARIOS ══════════ */}
            {tab === 'diccionarios' && (
              <div className="space-y-6">

                {/* Explicación + botón nuevo */}
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-500 max-w-xl">
                    Un <strong className="text-gray-700">diccionario</strong> es un grupo temático de keywords. Al seleccionarlo en el Laboratorio, todas sus palabras se usan juntas en la búsqueda.
                  </p>
                  <button
                    onClick={() => { setShowDicForm(!showDicForm); setEditDic(null); setDicNombre(''); setDicDesc(''); setDicMsg(null); }}
                    className="flex items-center gap-2 bg-uai-red text-white px-6 py-3 rounded-xl font-black hover:bg-red-800 transition-all shrink-0 ml-4"
                  >
                    <Plus size={18} /> NUEVO DICCIONARIO
                  </button>
                </div>

                {/* Form nuevo/editar diccionario */}
                {showDicForm && (
                  <div className="bg-gray-50 rounded-2xl p-6 border-2 border-uai-red/20 space-y-4">
                    <h3 className="text-sm font-black text-uai-red uppercase tracking-widest">{editDic ? 'Editar diccionario' : 'Nuevo diccionario'}</h3>
                    <form onSubmit={saveDic} className="space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Nombre del grupo</label>
                          <input
                            type="text"
                            placeholder="Ej: Enfermedades crónicas"
                            className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none"
                            value={dicNombre}
                            onChange={e => setDicNombre(e.target.value)}
                            required
                          />
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1 block mb-1">Descripción (opcional)</label>
                          <input
                            type="text"
                            placeholder="Ej: Para investigación en salud crónica"
                            className="w-full p-3 bg-white border-2 border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none"
                            value={dicDesc}
                            onChange={e => setDicDesc(e.target.value)}
                          />
                        </div>
                      </div>
                      <Msg msg={dicMsg} />
                      <div className="flex gap-3">
                        <button type="submit" className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all">
                          {editDic ? 'GUARDAR CAMBIOS' : 'CREAR'}
                        </button>
                        <button type="button" onClick={() => { setShowDicForm(false); setEditDic(null); }} className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-black text-gray-500 hover:bg-gray-50">
                          CANCELAR
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Lista de diccionarios */}
                {loading ? (
                  <div className="py-16 text-center text-gray-300 font-bold uppercase tracking-widest">Cargando...</div>
                ) : diccionarios.length === 0 ? (
                  <div className="py-16 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                    <Layers size={36} className="mx-auto text-gray-200 mb-3" />
                    <p className="text-gray-400 font-bold">Aún no creaste ningún diccionario</p>
                    <p className="text-gray-300 text-sm mt-1">Creá uno y asignale las keywords que ya tenés</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {diccionarios.map(dic => (
                      <div key={dic.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-all overflow-hidden">

                        {/* Card header */}
                        <div className="p-5 flex items-start justify-between border-b border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Layers size={16} className="text-uai-red shrink-0" />
                              <h4 className="text-lg font-black text-gray-800 truncate">{dic.nombre}</h4>
                            </div>
                            {dic.descripcion && <p className="text-xs text-gray-400 italic ml-6">{dic.descripcion}</p>}
                            <p className="text-xs text-gray-400 ml-6 mt-1">{dic.keywords.length} keyword{dic.keywords.length !== 1 ? 's' : ''}</p>
                          </div>
                          <div className="flex gap-1 shrink-0 ml-3">
                            <button
                              onClick={() => { setEditDic(dic); setDicNombre(dic.nombre); setDicDesc(dic.descripcion || ''); setShowDicForm(true); setDicMsg(null); }}
                              className="p-2 text-gray-300 hover:text-uai-red hover:bg-gray-50 rounded-lg transition-all"
                              title="Editar"
                            >
                              <Edit size={16} />
                            </button>
                            <button onClick={() => deleteDic(dic.id)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>

                        {/* Keywords del diccionario */}
                        <div className="p-5 space-y-3">
                          {dic.keywords.length === 0 ? (
                            <p className="text-xs text-gray-300 italic">Sin keywords asignadas todavía</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {dic.keywords.map(gk => (
                                <span
                                  key={gk.keyword.id}
                                  className={`group/chip flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${catColor(gk.keyword.categoria)}`}
                                >
                                  {gk.keyword.palabra}
                                  <button
                                    onClick={() => removeKwFromDic(dic.id, gk.keyword.id)}
                                    className="opacity-0 group-hover/chip:opacity-100 transition-opacity hover:scale-110"
                                    title="Quitar del diccionario"
                                  >
                                    <X size={10} />
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Agregar keyword al diccionario */}
                          {addingToDic === dic.id ? (
                            <div className="flex gap-2 pt-1">
                              <select
                                className="flex-1 p-2 text-sm bg-gray-50 border-2 border-uai-red/30 rounded-xl font-bold focus:border-uai-red outline-none"
                                value={kwParaDic}
                                onChange={e => setKwParaDic(e.target.value)}
                                autoFocus
                              >
                                <option value="">— Elegir keyword —</option>
                                {keywords
                                  .filter(k => !dic.keywords.find(gk => gk.keyword.id === k.id))
                                  .map(k => (
                                    <option key={k.id} value={String(k.id)}>
                                      {k.palabra} · {k.categoria}
                                    </option>
                                  ))
                                }
                              </select>
                              <button onClick={() => addKwToDic(dic.id)} className="px-4 py-2 bg-uai-red text-white rounded-xl font-black text-sm hover:bg-red-800 transition-all">OK</button>
                              <button onClick={() => { setAddingToDic(null); setKwParaDic(''); }} className="px-3 py-2 bg-gray-100 rounded-xl font-black text-gray-500 hover:bg-gray-200"><X size={14} /></button>
                            </div>
                          ) : (
                            <button
                              onClick={() => { setAddingToDic(dic.id); setKwParaDic(''); }}
                              disabled={keywords.filter(k => !dic.keywords.find(gk => gk.keyword.id === k.id)).length === 0}
                              className="flex items-center gap-1 text-xs font-black text-gray-400 hover:text-uai-red transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Plus size={13} /> Agregar keyword
                            </button>
                          )}
                        </div>

                        {/* Footer: usar en laboratorio */}
                        <div className="px-5 py-3 bg-gray-50 border-t border-gray-100">
                          <button
                            onClick={() => navigate('/laboratory')}
                            className="flex items-center gap-2 text-xs font-black text-uai-red hover:underline"
                          >
                            <Search size={12} /> Usar este diccionario en el Laboratorio
                            <ArrowRight size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {keywords.length === 0 && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3 text-sm text-amber-700 font-medium">
                    <AlertCircle size={18} className="shrink-0" />
                    Primero creá keywords en la pestaña <strong>"Keywords"</strong>, después vas a poder asignarlas a un diccionario.
                  </div>
                )}
              </div>
            )}

            {/* ══════════ TAB: CATEGORÍAS ══════════ */}
            {tab === 'categorias' && (
              <div className="space-y-6">

                {/* Crear nueva categoría */}
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-3">
                  <h3 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <FolderOpen size={14} className="text-uai-red" /> Nueva categoría
                  </h3>
                  <form onSubmit={handleCreateCat} className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Ej: Ciencias del Clima"
                      className="flex-1 p-3 bg-white border-2 border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none transition-all"
                      value={nuevaCat}
                      onChange={e => setNuevaCat(e.target.value)}
                      required
                    />
                    <button type="submit" className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all">
                      + CREAR
                    </button>
                  </form>
                  <Msg msg={catMsg} />
                </div>

                {/* Lista de categorías */}
                <div className="space-y-3">
                  {categorias.length === 0 ? (
                    <div className="py-16 text-center text-gray-300 font-bold uppercase tracking-widest">Sin categorías aún</div>
                  ) : (
                    categorias.map(cat => {
                      const count = keywords.filter(k => k.categoria === cat).length;
                      const esPredefinida = ['General', 'Salud', 'Educación', 'Economía', 'Tecnología', 'Medio Ambiente'].includes(cat);
                      const isRenaming = renamingCat === cat;

                      return (
                        <div key={cat} className={`bg-white rounded-2xl border p-5 flex items-center justify-between gap-4 transition-all ${isRenaming ? 'border-uai-red/40 shadow-sm' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <div className={`w-3 h-3 rounded-full shrink-0 ${catColor(cat).split(' ')[0].replace('bg-', 'bg-').replace('100', '400')}`} />
                            {isRenaming ? (
                              <input
                                type="text"
                                autoFocus
                                className="flex-1 p-2 bg-gray-50 border-2 border-uai-red/40 rounded-xl font-bold focus:border-uai-red outline-none text-sm"
                                value={renameVal}
                                onChange={e => setRenameVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameCat(cat); if (e.key === 'Escape') { setRenamingCat(null); setRenameVal(''); } }}
                              />
                            ) : (
                              <div>
                                <span className="font-black text-gray-800">{cat}</span>
                                {esPredefinida && <span className="ml-2 text-[10px] text-gray-400 font-bold uppercase">predefinida</span>}
                              </div>
                            )}
                            <span className={`px-2 py-0.5 rounded-full text-xs font-black border ${catColor(cat)}`}>
                              {count} keyword{count !== 1 ? 's' : ''}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isRenaming ? (
                              <>
                                <button onClick={() => handleRenameCat(cat)} className="flex items-center gap-1 px-4 py-2 bg-uai-red text-white rounded-xl font-black text-sm hover:bg-red-800 transition-all">
                                  <Check size={14} /> GUARDAR
                                </button>
                                <button onClick={() => { setRenamingCat(null); setRenameVal(''); }} className="p-2 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-all">
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => { setRenamingCat(cat); setRenameVal(cat); setCatMsg(null); }}
                                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-500 rounded-xl font-black text-sm hover:border-uai-red hover:text-uai-red transition-all"
                                >
                                  <Edit size={14} /> RENOMBRAR
                                </button>
                                <button
                                  onClick={() => handleDeleteCat(cat)}
                                  disabled={cat === 'General'}
                                  className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 text-gray-400 rounded-xl font-black text-sm hover:border-red-300 hover:text-red-500 hover:bg-red-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                  title={cat === 'General' ? 'No se puede eliminar la categoría General' : ''}
                                >
                                  <Trash2 size={14} /> ELIMINAR
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <p className="text-xs text-gray-400 italic">
                  Al eliminar una categoría, sus keywords pasan automáticamente a <strong>General</strong>.
                </p>
              </div>
            )}

          </div>
        </div>
      </main>
    </div>
  );
};

export default Keywords;
