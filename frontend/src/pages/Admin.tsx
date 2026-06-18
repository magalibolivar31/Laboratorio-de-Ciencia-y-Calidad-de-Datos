import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { ShieldCheck, Users, Database, FileText, ToggleLeft, ToggleRight, Edit, Plus, X, Loader2, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';

interface Usuario { id: number; nombre: string; email: string; rol: string; activo: boolean; created_at: string }
interface Fuente { id: number; nombre: string; tipo: string; url_base?: string; descripcion?: string; activa: boolean; created_at: string }
interface AuditEntry { id: number; accion: string; entidad: string; entidad_id?: string; detalle?: string; created_at: string; usuario?: { nombre: string; email: string } | null }

type Tab = 'usuarios' | 'fuentes' | 'auditoria';

const Admin: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('usuarios');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [auditoria, setAuditoria] = useState<AuditEntry[]>([]);

  // Fuente form
  const [showFuenteForm, setShowFuenteForm] = useState(false);
  const [editFuente, setEditFuente] = useState<Fuente | null>(null);
  const [fNombre, setFNombre] = useState('');
  const [fTipo, setFTipo] = useState('API');
  const [fUrl, setFUrl] = useState('');
  const [fDesc, setFDesc] = useState('');

  useEffect(() => {
    const userRaw = localStorage.getItem('user');
    const rol = userRaw ? JSON.parse(userRaw)?.rol : null;
    if (rol !== 'ADMINISTRADOR') { navigate('/dashboard'); return; }
    loadTab('usuarios');
  }, []);

  const loadTab = async (tab: Tab) => {
    setActiveTab(tab);
    setLoading(true);
    setError('');
    try {
      if (tab === 'usuarios') {
        const r = await api.get('/admin/usuarios');
        setUsuarios(r.data);
      } else if (tab === 'fuentes') {
        const r = await api.get('/fuentes');
        setFuentes(r.data);
      } else {
        const r = await api.get('/admin/auditoria');
        setAuditoria(r.data);
      }
    } catch {
      setError('Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRol = async (u: Usuario) => {
    const nuevoRol = u.rol === 'ADMINISTRADOR' ? 'INVESTIGADOR' : 'ADMINISTRADOR';
    if (!confirm(`¿Cambiar rol de ${u.nombre} a ${nuevoRol}?`)) return;
    try {
      await api.put(`/admin/usuarios/${u.id}/rol`, { rol: nuevoRol });
      loadTab('usuarios');
    } catch { alert('Error al cambiar rol'); }
  };

  const handleToggleActivo = async (u: Usuario) => {
    if (!confirm(`¿${u.activo ? 'Desactivar' : 'Activar'} a ${u.nombre}?`)) return;
    try {
      await api.patch(`/admin/usuarios/${u.id}/toggle`);
      loadTab('usuarios');
    } catch { alert('Error'); }
  };

  const handleToggleFuente = async (f: Fuente) => {
    try {
      await api.patch(`/fuentes/${f.id}/toggle`);
      loadTab('fuentes');
    } catch { alert('Error al cambiar estado'); }
  };

  const handleSaveFuente = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editFuente) {
        await api.put(`/fuentes/${editFuente.id}`, { nombre: fNombre, tipo: fTipo, url_base: fUrl, descripcion: fDesc });
      } else {
        await api.post('/fuentes', { nombre: fNombre, tipo: fTipo, url_base: fUrl, descripcion: fDesc });
      }
      setShowFuenteForm(false); setEditFuente(null);
      setFNombre(''); setFTipo('API'); setFUrl(''); setFDesc('');
      loadTab('fuentes');
    } catch { alert('Error al guardar fuente'); }
  };

  const openEditFuente = (f: Fuente) => {
    setEditFuente(f); setFNombre(f.nombre); setFTipo(f.tipo);
    setFUrl(f.url_base || ''); setFDesc(f.descripcion || '');
    setShowFuenteForm(true);
  };

  const tabs = [
    { id: 'usuarios' as Tab, label: 'Usuarios', icon: <Users size={18} /> },
    { id: 'fuentes' as Tab, label: 'Fuentes de Datos', icon: <Database size={18} /> },
    { id: 'auditoria' as Tab, label: 'Auditoría', icon: <FileText size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b border-gray-200 flex items-center px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <ShieldCheck size={28} className="text-uai-red" /> Panel de Administración
          </h2>
        </header>

        <div className="flex-1 overflow-y-auto p-10">
          {/* Tabs */}
          <div className="flex gap-2 mb-8 bg-white rounded-2xl p-2 shadow-sm border border-gray-200 w-fit">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => loadTab(t.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm transition-all ${activeTab === t.id ? 'bg-uai-red text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-uai-red" size={40} /></div>
          ) : error ? (
            <div className="flex items-center gap-3 p-6 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl font-medium">
              <AlertCircle size={20} /> {error}
            </div>
          ) : (
            <>
              {/* === USUARIOS === */}
              {activeTab === 'usuarios' && (
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 border-b-2 border-gray-200 uppercase font-black text-gray-600 text-xs">
                        <th className="p-5">Usuario</th>
                        <th className="p-5">Email</th>
                        <th className="p-5">Rol</th>
                        <th className="p-5">Estado</th>
                        <th className="p-5">Registrado</th>
                        <th className="p-5 text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {usuarios.map(u => (
                        <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                          <td className="p-5 font-bold text-gray-800">{u.nombre}</td>
                          <td className="p-5 text-gray-600 text-sm">{u.email}</td>
                          <td className="p-5">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.rol === 'ADMINISTRADOR' ? 'bg-uai-red text-white' : 'bg-uai-accent text-uai-red'}`}>
                              {u.rol}
                            </span>
                          </td>
                          <td className="p-5">
                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${u.activo ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                              {u.activo ? 'ACTIVO' : 'INACTIVO'}
                            </span>
                          </td>
                          <td className="p-5 text-gray-400 text-sm">{new Date(u.created_at).toLocaleDateString('es-AR')}</td>
                          <td className="p-5">
                            <div className="flex items-center justify-center gap-2">
                              <button onClick={() => handleToggleRol(u)} className="px-3 py-2 text-xs bg-gray-100 hover:bg-uai-accent text-gray-600 hover:text-uai-red rounded-xl font-black transition-all flex items-center gap-1">
                                <Edit size={14} /> ROL
                              </button>
                              <button onClick={() => handleToggleActivo(u)} className={`px-3 py-2 text-xs rounded-xl font-black transition-all flex items-center gap-1 ${u.activo ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}>
                                {u.activo ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                {u.activo ? 'DESACTIVAR' : 'ACTIVAR'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* === FUENTES === */}
              {activeTab === 'fuentes' && (
                <div className="space-y-6">
                  <div className="flex justify-end">
                    <button onClick={() => { setShowFuenteForm(!showFuenteForm); setEditFuente(null); setFNombre(''); setFTipo('API'); setFUrl(''); setFDesc(''); }}
                      className="flex items-center gap-2 bg-uai-red text-white px-6 py-3 rounded-xl font-black hover:bg-red-800 transition-all">
                      <Plus size={18} /> NUEVA FUENTE
                    </button>
                  </div>

                  {showFuenteForm && (
                    <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black text-gray-800 uppercase">{editFuente ? 'Editar Fuente' : 'Nueva Fuente'}</h3>
                        <button onClick={() => setShowFuenteForm(false)} className="p-2 text-gray-400 hover:text-gray-600"><X size={20} /></button>
                      </div>
                      <form onSubmit={handleSaveFuente} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1">Nombre</label>
                          <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none mt-1" value={fNombre} onChange={e => setFNombre(e.target.value)} required />
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1">Tipo</label>
                          <select className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none mt-1" value={fTipo} onChange={e => setFTipo(e.target.value)}>
                            <option>API</option><option>WEB</option><option>FTP</option><option>MANUAL</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1">URL Base</label>
                          <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none mt-1" value={fUrl} onChange={e => setFUrl(e.target.value)} placeholder="https://..." />
                        </div>
                        <div>
                          <label className="text-xs font-black text-gray-400 uppercase ml-1">Descripción</label>
                          <input type="text" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none mt-1" value={fDesc} onChange={e => setFDesc(e.target.value)} />
                        </div>
                        <div className="md:col-span-2">
                          <button type="submit" className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all">
                            {editFuente ? 'ACTUALIZAR' : 'GUARDAR'}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}

                  <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200 uppercase font-black text-gray-600 text-xs">
                          <th className="p-5">Fuente</th>
                          <th className="p-5">Tipo</th>
                          <th className="p-5">URL Base</th>
                          <th className="p-5">Estado</th>
                          <th className="p-5 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {fuentes.map(f => (
                          <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-5">
                              <p className="font-black text-gray-800">{f.nombre}</p>
                              {f.descripcion && <p className="text-xs text-gray-400 italic">{f.descripcion}</p>}
                            </td>
                            <td className="p-5"><span className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-black rounded-lg uppercase">{f.tipo}</span></td>
                            <td className="p-5 text-sm text-gray-500 font-mono truncate max-w-xs">{f.url_base || '—'}</td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${f.activa ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                {f.activa ? 'ACTIVA' : 'INACTIVA'}
                              </span>
                            </td>
                            <td className="p-5">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => openEditFuente(f)} className="p-2 text-gray-400 hover:text-uai-red hover:bg-uai-accent rounded-lg transition-all"><Edit size={16} /></button>
                                <button onClick={() => handleToggleFuente(f)} className={`px-3 py-2 text-xs rounded-xl font-black transition-all flex items-center gap-1 ${f.activa ? 'bg-red-50 hover:bg-red-100 text-red-600' : 'bg-green-50 hover:bg-green-100 text-green-700'}`}>
                                  {f.activa ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                                  {f.activa ? 'DESACTIVAR' : 'ACTIVAR'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* === AUDITORÍA === */}
              {activeTab === 'auditoria' && (
                <div className="bg-white rounded-[2rem] shadow-xl border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                      <thead>
                        <tr className="bg-gray-100 border-b-2 border-gray-200 uppercase font-black text-gray-600 text-xs">
                          <th className="p-5">Fecha</th>
                          <th className="p-5">Usuario</th>
                          <th className="p-5">Acción</th>
                          <th className="p-5">Entidad</th>
                          <th className="p-5">Detalle</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {auditoria.map(entry => (
                          <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-5 text-gray-400 text-sm whitespace-nowrap">
                              {new Date(entry.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="p-5">
                              {entry.usuario ? (
                                <div>
                                  <p className="font-bold text-gray-800 text-sm">{entry.usuario.nombre}</p>
                                  <p className="text-xs text-gray-400">{entry.usuario.email}</p>
                                </div>
                              ) : <span className="text-gray-300 text-sm">Sistema</span>}
                            </td>
                            <td className="p-5">
                              <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase ${
                                entry.accion.includes('ERROR') ? 'bg-red-100 text-red-700' :
                                entry.accion.includes('LOGIN') || entry.accion.includes('REGISTRO') ? 'bg-blue-100 text-blue-700' :
                                entry.accion.includes('ELIMINAR') || entry.accion.includes('DESACTIVAR') ? 'bg-orange-100 text-orange-700' :
                                'bg-green-100 text-green-700'
                              }`}>{entry.accion}</span>
                            </td>
                            <td className="p-5 text-sm text-gray-600 font-medium">{entry.entidad}{entry.entidad_id ? ` #${entry.entidad_id}` : ''}</td>
                            <td className="p-5 text-sm text-gray-500 italic max-w-xs truncate">{entry.detalle || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default Admin;
