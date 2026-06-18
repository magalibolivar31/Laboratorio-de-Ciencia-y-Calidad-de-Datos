import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  Settings as SettingsIcon, User, Lock, CheckCircle, AlertCircle,
  Key, Edit, Trash2, Plus, X, Loader2, ToggleLeft, ToggleRight, Wifi, WifiOff
} from 'lucide-react';
import api from '../lib/api';

interface UserInfo { nombre: string; email: string; rol?: string }

interface Fuente {
  id: number; nombre: string; tipo: string;
  descripcion?: string; url_base?: string; activa: boolean;
}

interface Token {
  id: number; servicio: string; api_key_cifrada: string | null;
  usuario_api?: string | null; activa: boolean; fuente_id?: number | null;
  fuente?: Fuente | null;
}

const FUENTE_NECESITA_USUARIO: Record<string, boolean> = {
  'Kaggle': true,
};

const Settings: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [nombre, setNombre] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [pwActual, setPwActual] = useState('');
  const [pwNueva, setPwNueva] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  const [fuentes, setFuentes] = useState<Fuente[]>([]);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [loadingConn, setLoadingConn] = useState(true);

  const [editando, setEditando] = useState<{ fuente: Fuente; token: Token | null } | null>(null);
  const [formKey, setFormKey] = useState('');
  const [formUsuario, setFormUsuario] = useState('');
  const [savingConn, setSavingConn] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) { try { const u = JSON.parse(saved); setUser(u); setNombre(u.nombre || ''); } catch {} }
    fetchConexiones();
  }, []);

  const fetchConexiones = async () => {
    setLoadingConn(true);
    try {
      const [rF, rT] = await Promise.all([api.get('/fuentes'), api.get('/tokens')]);
      setFuentes(rF.data.filter((f: Fuente) => f.activa));
      setTokens(rT.data);
    } catch {} finally { setLoadingConn(false); }
  };

  const tokenPorFuente = (fuente: Fuente): Token | null =>
    tokens.find(t => t.servicio === fuente.nombre || t.fuente_id === fuente.id) || null;

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault(); setProfileLoading(true); setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', { nombre });
      const updated = { ...user, nombre: res.data.usuario.nombre };
      setUser(updated as UserInfo);
      localStorage.setItem('user', JSON.stringify(updated));
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado correctamente.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.response?.data?.error || 'Error al actualizar.' });
    } finally { setProfileLoading(false); }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); setPwMsg(null);
    if (pwNueva !== pwConfirm) { setPwMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden.' }); return; }
    if (pwNueva.length < 6) { setPwMsg({ type: 'err', text: 'La contraseña nueva debe tener al menos 6 caracteres.' }); return; }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { password_actual: pwActual, password_nueva: pwNueva });
      setPwMsg({ type: 'ok', text: 'Contraseña cambiada correctamente.' });
      setPwActual(''); setPwNueva(''); setPwConfirm('');
    } catch (err: any) {
      setPwMsg({ type: 'err', text: err.response?.data?.error || 'Error al cambiar contraseña.' });
    } finally { setPwLoading(false); }
  };

  const abrirEdicion = (fuente: Fuente) => {
    const t = tokenPorFuente(fuente);
    setEditando({ fuente, token: t });
    setFormKey('');
    setFormUsuario(t?.usuario_api || '');
  };

  const handleSaveConexion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    if (!formKey.trim() && !editando.token) return;
    setSavingConn(true);
    try {
      const payload: any = {
        servicio: editando.fuente.nombre,
        fuente_id: editando.fuente.id,
        usuario_api: formUsuario.trim() || null,
      };
      if (formKey.trim()) payload.api_key = formKey.trim();

      if (editando.token) {
        await api.put(`/tokens/${editando.token.id}`, payload);
      } else {
        if (!formKey.trim()) return;
        await api.post('/tokens', payload);
      }
      setEditando(null); setFormKey(''); setFormUsuario('');
      await fetchConexiones();
    } catch {} finally { setSavingConn(false); }
  };

  const handleToggle = async (token: Token) => {
    setTogglingId(token.id);
    try {
      await api.patch(`/tokens/${token.id}/toggle`);
      await fetchConexiones();
    } catch {} finally { setTogglingId(null); }
  };

  const handleDelete = async (token: Token) => {
    if (!confirm(`¿Eliminar la conexión con ${token.servicio}? Volverás a usar las credenciales de la plataforma.`)) return;
    setDeletingId(token.id);
    try {
      await api.delete(`/tokens/${token.id}`);
      await fetchConexiones();
    } catch {} finally { setDeletingId(null); }
  };

  const MsgBanner: React.FC<{ msg: { type: 'ok' | 'err'; text: string } }> = ({ msg }) => (
    <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
      {msg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
      {msg.text}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <SettingsIcon size={28} className="text-uai-red" /> Configuración
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

        <div className="flex-1 overflow-y-auto p-10">
          <div className="max-w-3xl space-y-8">

            {/* ── Perfil ── */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <User size={22} className="text-uai-red" /> Perfil del Investigador
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                    <input type="text" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={nombre} onChange={e => setNombre(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Correo Institucional</label>
                    <input type="email" className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed" value={user?.email || ''} readOnly />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Rol</label>
                    <input type="text" className="w-full p-4 bg-gray-100 border border-gray-200 rounded-xl font-bold text-gray-500 cursor-not-allowed" value={user?.rol || 'INVESTIGADOR'} readOnly />
                  </div>
                </div>
                {profileMsg && <MsgBanner msg={profileMsg} />}
                <button type="submit" disabled={profileLoading} className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all disabled:opacity-50">
                  {profileLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                </button>
              </form>
            </div>

            {/* ── Contraseña ── */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <Lock size={22} className="text-uai-red" /> Cambiar Contraseña
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Contraseña Actual</label>
                  <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={pwActual} onChange={e => setPwActual(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Nueva Contraseña</label>
                    <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={pwNueva} onChange={e => setPwNueva(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Confirmar Nueva</label>
                    <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red outline-none" value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} required />
                  </div>
                </div>
                {pwMsg && <MsgBanner msg={pwMsg} />}
                <button type="submit" disabled={pwLoading} className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black hover:bg-black transition-all disabled:opacity-50">
                  {pwLoading ? 'Cambiando...' : 'CAMBIAR CONTRASEÑA'}
                </button>
              </form>
            </div>

            {/* ── Mis Conexiones API ── */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <div>
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                  <Key size={22} className="text-uai-red" /> Mis Conexiones API
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Configurá credenciales personales para usar tus propios límites y permisos. Por defecto se usan las credenciales de la plataforma.
                </p>
              </div>

              {loadingConn ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="animate-spin text-uai-red" size={32} />
                </div>
              ) : (
                <div className="space-y-3">
                  {fuentes.length === 0 && (
                    <p className="text-center py-8 text-gray-400 italic">No hay fuentes activas disponibles.</p>
                  )}
                  {fuentes.map(fuente => {
                    const token = tokenPorFuente(fuente);
                    const configurada = !!token;
                    const activa = token?.activa ?? false;
                    const toggling = token ? togglingId === token.id : false;
                    const deleting = token ? deletingId === token.id : false;

                    return (
                      <div key={fuente.id} className={`rounded-2xl border-2 p-5 transition-all ${configurada && activa ? 'border-green-200 bg-green-50/30' : configurada ? 'border-gray-200 bg-white' : 'border-gray-100 bg-white'}`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-4 flex-1 min-w-0">
                            {/* Icono estado */}
                            <div className={`p-2.5 rounded-xl shrink-0 ${configurada && activa ? 'bg-green-100' : configurada ? 'bg-gray-100' : 'bg-gray-50'}`}>
                              {configurada && activa
                                ? <Wifi size={18} className="text-green-600" />
                                : configurada
                                  ? <WifiOff size={18} className="text-gray-400" />
                                  : <Key size={18} className="text-gray-300" />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-black text-gray-800">{fuente.nombre}</p>
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-lg uppercase">{fuente.tipo}</span>
                                {configurada && activa && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-black rounded-full">Usando mis credenciales</span>
                                )}
                                {configurada && !activa && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-black rounded-full">Usando credenciales de la plataforma</span>
                                )}
                                {!configurada && (
                                  <span className="px-2 py-0.5 bg-blue-50 text-blue-500 text-[10px] font-black rounded-full">Credenciales de la plataforma</span>
                                )}
                              </div>
                              {fuente.descripcion && <p className="text-xs text-gray-400 mt-0.5 italic">{fuente.descripcion}</p>}
                              {token?.usuario_api && (
                                <p className="text-xs text-gray-500 mt-1 font-mono">Usuario: {token.usuario_api}</p>
                              )}
                            </div>
                          </div>

                          {/* Acciones */}
                          <div className="flex items-center gap-2 shrink-0">
                            {configurada && (
                              <>
                                <button
                                  onClick={() => handleToggle(token!)}
                                  disabled={toggling}
                                  title={activa ? 'Cambiar a credenciales de la plataforma' : 'Usar mis credenciales'}
                                  className={`p-2 rounded-xl transition-all disabled:opacity-50 ${activa ? 'text-green-600 hover:bg-green-100' : 'text-gray-400 hover:bg-gray-100'}`}
                                >
                                  {toggling
                                    ? <Loader2 size={18} className="animate-spin" />
                                    : activa ? <ToggleRight size={20} /> : <ToggleLeft size={20} />
                                  }
                                </button>
                                <button
                                  onClick={() => abrirEdicion(fuente)}
                                  className="p-2 text-gray-400 hover:text-uai-red hover:bg-uai-accent rounded-xl transition-all"
                                  title="Editar credencial"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(token!)}
                                  disabled={deleting}
                                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50"
                                  title="Eliminar credencial"
                                >
                                  {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                                </button>
                              </>
                            )}
                            {!configurada && (
                              <button
                                onClick={() => abrirEdicion(fuente)}
                                className="flex items-center gap-1.5 px-4 py-2 bg-uai-red text-white rounded-xl font-black text-xs hover:bg-red-800 transition-all"
                              >
                                <Plus size={13} /> Configurar
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Form inline de edición */}
                        {editando?.fuente.id === fuente.id && (
                          <form onSubmit={handleSaveConexion} className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                            <div className="grid grid-cols-1 gap-3">
                              <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  API Key / Token {!editando.token && <span className="text-uai-red">*</span>}
                                </label>
                                <input
                                  type="password"
                                  autoComplete="new-password"
                                  placeholder={editando.token ? 'Dejá vacío para mantener la key actual' : 'Pegá tu API Key aquí...'}
                                  className="w-full mt-1 p-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none"
                                  value={formKey}
                                  onChange={e => setFormKey(e.target.value)}
                                  required={!editando.token}
                                />
                              </div>
                              {FUENTE_NECESITA_USUARIO[fuente.nombre] && (
                                <div>
                                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Usuario <span className="text-uai-red">*</span></label>
                                  <input
                                    type="text"
                                    placeholder={`Tu usuario de ${fuente.nombre}`}
                                    className="w-full mt-1 p-3 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none"
                                    value={formUsuario}
                                    onChange={e => setFormUsuario(e.target.value)}
                                    required
                                  />
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="submit"
                                disabled={savingConn}
                                className="flex items-center gap-2 bg-uai-red text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-red-800 transition-all disabled:opacity-50"
                              >
                                {savingConn ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                                {editando.token ? 'Actualizar' : 'Guardar'}
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditando(null); setFormKey(''); setFormUsuario(''); }}
                                className="flex items-center gap-2 bg-gray-100 text-gray-600 px-5 py-2.5 rounded-xl font-black text-sm hover:bg-gray-200 transition-all"
                              >
                                <X size={14} /> Cancelar
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
