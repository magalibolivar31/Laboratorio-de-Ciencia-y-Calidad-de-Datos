import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import api from '../lib/api';

const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) {
      setMsg({ type: 'err', text: 'Las contraseñas no coinciden.' }); return;
    }
    if (password.length < 6) {
      setMsg({ type: 'err', text: 'La contraseña debe tener al menos 6 caracteres.' }); return;
    }
    setLoading(true); setMsg(null);
    try {
      const res = await api.post('/auth/reset-password', { token, password });
      setMsg({ type: 'ok', text: res.data.mensaje });
    } catch (err: any) {
      setMsg({ type: 'err', text: err.response?.data?.error || 'Error al restablecer la contraseña.' });
    } finally { setLoading(false); }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-6">
      <div className="text-center space-y-4">
        <AlertCircle size={48} className="text-red-400 mx-auto" />
        <p className="font-black text-gray-700 text-lg">Enlace inválido</p>
        <p className="text-gray-400 text-sm">El enlace de recuperación no es válido.</p>
        <button onClick={() => navigate('/forgot-password')} className="bg-uai-red text-white px-6 py-3 rounded-xl font-black hover:bg-red-800 transition-all text-sm">
          SOLICITAR NUEVO ENLACE
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-uai-red p-10 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-white" />
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight">Nueva contraseña</h1>
          <p className="text-white/70 text-sm mt-2 font-medium">
            Laboratorio de Calidad y Ciencia de Datos
          </p>
        </div>

        <div className="p-10 space-y-6">
          {msg?.type === 'ok' ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <div>
                <p className="font-black text-gray-800 text-lg">¡Contraseña restablecida!</p>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">{msg.text}</p>
              </div>
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-uai-red text-white py-3 rounded-xl font-black hover:bg-red-800 transition-all"
              >
                IR AL LOGIN
              </button>
            </div>
          ) : (
            <>
              <p className="text-gray-500 text-sm leading-relaxed">
                Ingresá tu nueva contraseña. Debe tener al menos <strong>6 caracteres</strong>.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Nueva contraseña</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-xl font-medium focus:border-uai-red outline-none transition-all"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-gray-400 uppercase tracking-widest">Confirmar contraseña</label>
                  <input
                    type="password"
                    placeholder="Repetí la contraseña"
                    className={`w-full p-4 bg-gray-50 border-2 rounded-xl font-medium outline-none transition-all ${confirm && confirm !== password ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-uai-red'}`}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    required
                  />
                  {confirm && confirm !== password && (
                    <p className="text-xs text-red-500 font-bold ml-1">Las contraseñas no coinciden</p>
                  )}
                </div>

                {msg?.type === 'err' && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm font-bold">
                    <AlertCircle size={16} /> {msg.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || (!!confirm && confirm !== password)}
                  className="w-full bg-uai-red text-white py-4 rounded-xl font-black text-sm hover:bg-red-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={18} className="animate-spin" /> : <Lock size={18} />}
                  RESTABLECER CONTRASEÑA
                </button>
              </form>

              <button
                onClick={() => navigate('/login')}
                className="w-full flex items-center justify-center gap-2 text-gray-500 hover:text-uai-red font-bold text-sm transition-all"
              >
                <ArrowLeft size={16} /> Volver al login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
