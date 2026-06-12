import React from 'react';
import { Mail, Lock, User, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';

const Register: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col md:flex-row-reverse">
        {/* Lado Derecho (ahora izquierdo por reverse): Branding */}
        <div className="md:w-1/2 bg-uai-red p-12 flex flex-col justify-center text-white">
          <h1 className="text-4xl font-display font-bold mb-6">Crea tu cuenta</h1>
          <p className="text-uai-accent text-lg">
            Únete a la comunidad de investigadores y científicos de datos del CAETI.
          </p>
          <div className="mt-12 opacity-20">
            <UserPlus size={200} />
          </div>
        </div>

        {/* Lado Izquierdo: Formulario */}
        <div className="md:w-1/2 p-12">
          <div className="mb-10">
            <h2 className="text-3xl font-display font-bold text-gray-800">Registro</h2>
            <p className="text-gray-500 mt-2">Completa tus datos para empezar</p>
          </div>

          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre Completo</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uai-red focus:border-uai-red transition-all"
                  placeholder="Juan Pérez"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Correo Electrónico</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail size={18} />
                </span>
                <input
                  type="email"
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uai-red focus:border-uai-red transition-all"
                  placeholder="ejemplo@uai.edu.ar"
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
                  className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-uai-red focus:border-uai-red transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-uai-red text-white py-3 rounded-lg font-bold text-lg hover:bg-red-900 transition-colors shadow-lg hover:shadow-uai-red/20"
            >
              Crear Cuenta
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link to="/login" className="text-uai-red font-bold hover:underline">
                Inicia sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
