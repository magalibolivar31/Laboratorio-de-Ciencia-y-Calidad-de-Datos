import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { Settings as SettingsIcon, User, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import api from '../lib/api';

interface UserInfo { nombre: string; email: string; rol?: string }

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

  useEffect(() => {
    const saved = localStorage.getItem('user');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        setUser(u);
        setNombre(u.nombre || '');
      } catch {}
    }
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await api.put('/auth/profile', { nombre });
      const updated = { ...user, nombre: res.data.usuario.nombre };
      setUser(updated as UserInfo);
      localStorage.setItem('user', JSON.stringify(updated));
      setProfileMsg({ type: 'ok', text: 'Perfil actualizado correctamente.' });
    } catch (err: any) {
      setProfileMsg({ type: 'err', text: err.response?.data?.error || 'Error al actualizar.' });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwNueva !== pwConfirm) {
      setPwMsg({ type: 'err', text: 'Las contraseñas nuevas no coinciden.' });
      return;
    }
    if (pwNueva.length < 6) {
      setPwMsg({ type: 'err', text: 'La contraseña nueva debe tener al menos 6 caracteres.' });
      return;
    }
    setPwLoading(true);
    try {
      await api.put('/auth/password', { password_actual: pwActual, password_nueva: pwNueva });
      setPwMsg({ type: 'ok', text: 'Contraseña cambiada correctamente.' });
      setPwActual(''); setPwNueva(''); setPwConfirm('');
    } catch (err: any) {
      setPwMsg({ type: 'err', text: err.response?.data?.error || 'Error al cambiar contraseña.' });
    } finally {
      setPwLoading(false);
    }
  };

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

            {/* Perfil */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <User size={22} className="text-uai-red" /> Perfil del Investigador
              </h3>
              <form onSubmit={handleUpdateProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Nombre Completo</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red focus:ring-2 focus:ring-uai-red/10 outline-none"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      required
                    />
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
                {profileMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${profileMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {profileMsg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {profileMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="bg-uai-red text-white px-8 py-3 rounded-xl font-black hover:bg-red-800 transition-all disabled:opacity-50"
                >
                  {profileLoading ? 'Guardando...' : 'GUARDAR CAMBIOS'}
                </button>
              </form>
            </div>

            {/* Cambiar contraseña */}
            <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-gray-200 space-y-6">
              <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight flex items-center gap-2">
                <Lock size={22} className="text-uai-red" /> Cambiar Contraseña
              </h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Contraseña Actual</label>
                  <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red focus:ring-2 focus:ring-uai-red/10 outline-none" value={pwActual} onChange={(e) => setPwActual(e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Nueva Contraseña</label>
                    <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red focus:ring-2 focus:ring-uai-red/10 outline-none" value={pwNueva} onChange={(e) => setPwNueva(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-gray-400 uppercase ml-1">Confirmar Nueva</label>
                    <input type="password" className="w-full p-4 bg-gray-50 border border-gray-200 rounded-xl font-bold focus:border-uai-red focus:ring-2 focus:ring-uai-red/10 outline-none" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} required />
                  </div>
                </div>
                {pwMsg && (
                  <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-bold ${pwMsg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {pwMsg.type === 'ok' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                    {pwMsg.text}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={pwLoading}
                  className="bg-gray-900 text-white px-8 py-3 rounded-xl font-black hover:bg-black transition-all disabled:opacity-50"
                >
                  {pwLoading ? 'Cambiando...' : 'CAMBIAR CONTRASEÑA'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Settings;
