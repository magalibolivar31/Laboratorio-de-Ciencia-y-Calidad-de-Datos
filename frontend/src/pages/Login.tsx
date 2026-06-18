import React, { useState } from 'react';
import { Mail, Lock, LogIn, AlertCircle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.usuario));
      navigate('/laboratory');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al iniciar sesión. Verifica tus credenciales.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] w-full flex items-center justify-center bg-gray-50 px-6 py-12">
      <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row border border-gray-100">
        {/* Lado Izquierdo: Branding / Imagen */}
        <div className="md:w-1/2 bg-uai-red p-12 flex flex-col justify-center text-white relative overflow-hidden">
          <div className="relative z-10">
            <h1 className="text-5xl font-black tracking-tighter mb-6 leading-none uppercase">Laboratorio de Calidad y Ciencia de Datos</h1>
            <div className="w-20 h-2 bg-uai-accent mb-8 rounded-full"></div>
            <p className="text-uai-accent/80 text-xl font-medium italic">
              Plataforma institucional para la investigación avanzada y gestión de datasets científicos.
            </p>
          </div>
          <div className="absolute -bottom-20 -left-20 opacity-10">
            <LogIn size={400} />
          </div>
        </div>

        {/* Lado Derecho: Formulario */}
        <div className="md:w-1/2 p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-display font-bold text-gray-800">Bienvenido</h2>
            <p className="text-gray-500 mt-2">Inicia sesión para acceder al repositorio</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 flex items-center gap-3">
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uai-red focus:border-uai-red transition-all"
                  placeholder="ejemplo@uai.edu.ar"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Lock size={18} />
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uai-red focus:border-uai-red transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full bg-uai-red text-white py-3 rounded-lg font-bold text-lg hover:bg-red-900 transition-colors shadow-lg hover:shadow-uai-red/20 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <p className="text-gray-600">
              ¿No tienes cuenta?{' '}
              <Link to="/register" className="text-uai-red font-bold hover:underline">
                Regístrate aquí
              </Link>
            </p>
            <p>
              <Link to="/forgot-password" className="text-sm text-gray-400 hover:text-uai-red font-medium transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
