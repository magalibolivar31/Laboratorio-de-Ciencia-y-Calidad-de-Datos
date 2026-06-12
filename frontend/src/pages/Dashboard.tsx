import React, { useState } from 'react';
import { Search, Filter, Database, Download, ExternalLink, User, LogOut, ChevronRight, FileSpreadsheet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('Todos');
  const navigate = useNavigate();

  // Categorías de investigación
  const categorias = ['Todos', 'Salud', 'Educación', 'Ciencias Sociales', 'Tecnología', 'Economía'];

  // Datos de ejemplo actualizados con Educación
  const mockResults = [
    {
      id: 1,
      titulo: "Base de Datos de Cardiología UAI 2024",
      descripcion: "Conjunto de datos clínicos anonimizados de pacientes con patologías cardiovasculares crónicas.",
      fuente: "Zenodo",
      area: "Salud",
      formato: "CSV, XLSX",
      fecha: "2024-05-12"
    },
    {
      id: 2,
      titulo: "Rendimiento Académico Nivel Secundario - CABA",
      descripcion: "Estadísticas sobre deserción escolar y promedios por zona geográfica durante el período 2020-2023.",
      fuente: "Educación.gob.ar",
      area: "Educación",
      formato: "XLSX, JSON",
      fecha: "2024-06-05"
    },
    {
      id: 3,
      titulo: "Impacto de la IA en el Aprendizaje Universitario",
      descripcion: "Encuestas y resultados de pruebas piloto sobre el uso de herramientas de IA generativa en el aula.",
      fuente: "Hugging Face",
      area: "Educación",
      formato: "CSV",
      fecha: "2024-04-10"
    }
  ];

  const filteredResults = activeCategory === 'Todos' 
    ? mockResults 
    : mockResults.filter(r => r.area === activeCategory);

  const handleLogout = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Menú Lateral */}
      <aside className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-200 flex items-center gap-3">
          <div className="bg-uai-red p-2 rounded-lg text-white">
            <Database size={24} />
          </div>
          <span className="font-display font-bold text-gray-800 leading-tight">LABORATORIO DATOS</span>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <p className="text-xs font-bold text-gray-400 uppercase px-3 mb-2">Principal</p>
          <a href="#" className="flex items-center gap-3 px-3 py-2 bg-uai-accent text-uai-red rounded-lg font-medium">
            <Search size={18} /> Buscador
          </a>
          <a href="#" className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <FileSpreadsheet size={18} /> Mis Exportaciones
          </a>
          <p className="text-xs font-bold text-gray-400 uppercase px-3 mb-2 mt-6">Administración</p>
          <button 
            onClick={() => navigate('/settings')}
            className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors w-full text-left font-medium"
          >
            <SettingsIcon size={18} /> Configuración
          </button>
        </nav>

        <div className="p-4 border-t border-gray-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 w-full text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
          >
            <LogOut size={18} /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content - Contenido Principal */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header Superior */}
        <header className="bg-white h-16 border-b border-gray-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-xl font-display font-bold text-gray-800">Buscador de Datasets Científicos</h2>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-bold text-gray-800">Flor Gomez</p>
              <p className="text-xs text-gray-500">Investigadora UAI</p>
            </div>
            <div className="w-10 h-10 bg-uai-red rounded-full flex items-center justify-center text-white font-bold">
              FG
            </div>
          </div>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-8">
          {/* Barra de Búsqueda y Filtros */}
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  placeholder="Buscar datasets de salud, educación, tecnología..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-gray-300 rounded-xl shadow-sm focus:ring-2 focus:ring-uai-red focus:border-uai-red outline-none transition-all text-lg"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button className="bg-uai-red text-white px-8 rounded-xl font-bold hover:bg-red-900 shadow-lg shadow-uai-red/20 transition-all">
                Buscar
              </button>
            </div>

            {/* Chips de Categorías */}
            <div className="flex flex-wrap gap-2">
              {categorias.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    activeCategory === cat 
                      ? 'bg-uai-red text-white shadow-md' 
                      : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Listado de Resultados */}
            <div className="space-y-4 pt-4">
              <h3 className="font-display font-bold text-gray-700 flex items-center gap-2">
                {activeCategory === 'Todos' ? 'Todos los resultados' : `Resultados de ${activeCategory}`} <ChevronRight size={16} />
              </h3>

              {filteredResults.map((result) => (
                <div key={result.id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-uai-red/30 transition-all group">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 bg-uai-accent text-uai-red text-xs font-bold rounded uppercase tracking-wider">
                          {result.area}
                        </span>
                        <span className="text-xs text-gray-400 font-medium">{result.fecha}</span>
                      </div>
                      <h4 className="text-xl font-display font-bold text-gray-800 group-hover:text-uai-red transition-colors">
                        {result.titulo}
                      </h4>
                      <p className="text-gray-600 leading-relaxed max-w-3xl">
                        {result.descripcion}
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button className="flex items-center gap-2 px-4 py-2 bg-gray-50 text-gray-700 rounded-lg font-bold border border-gray-200 hover:bg-gray-100 transition-all">
                        <Download size={16} /> Exportar Excel
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 text-uai-red font-bold hover:underline">
                        Ver Fuente <ExternalLink size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-6 text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-bold text-gray-700">Fuente:</span> {result.fuente}
                    </div>
                    <div className="flex items-center gap-2 text-gray-500">
                      <span className="font-bold text-gray-700">Formatos:</span> {result.formato}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
