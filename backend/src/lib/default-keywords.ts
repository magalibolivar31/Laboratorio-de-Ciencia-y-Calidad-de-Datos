import prisma from './prisma';

export const DEFAULT_DICCIONARIOS: Record<string, { categoria: string; palabras: string[] }> = {
  'Salud': {
    categoria: 'Salud',
    palabras: [
      'diabetes mellitus', 'hipertensión arterial', 'obesidad', 'cáncer de mama', 'enfermedades cardiovasculares',
      'salud mental', 'vacunación', 'epidemiología', 'mortalidad infantil', 'ensayo clínico',
      'farmacología', 'genómica', 'oncología', 'neurología', 'cardiología',
      'pediatría', 'geriatría', 'cirugía', 'rehabilitación', 'telemedicina',
      'biomarcadores', 'células madre', 'terapia génica', 'enfermedades infecciosas', 'salud pública',
      'política de salud', 'salud materna', 'VIH SIDA', 'tuberculosis', 'Alzheimer',
      'demencia', 'artritis', 'asma', 'depresión clínica', 'ansiedad',
      'nutrición clínica', 'fisioterapia', 'cuidados paliativos', 'historia clínica electrónica', 'inmunología',
      'diabetes', 'hypertension', 'obesity', 'cancer', 'cardiovascular disease',
      'mental health', 'vaccination', 'epidemiology', 'mortality', 'clinical trial',
      'pharmacology', 'genomics', 'oncology', 'neurology', 'cardiology',
      'pediatrics', 'geriatrics', 'surgery', 'rehabilitation', 'telemedicine',
      'biomarkers', 'stem cells', 'gene therapy', 'infectious disease', 'public health',
      'maternal health', 'HIV AIDS', 'dementia', 'asthma', 'depression',
      'anxiety', 'nutrition', 'physical therapy', 'palliative care', 'immunology',
      'virology', 'pathology', 'chronic disease', 'COVID-19', 'pandemic',
    ]
  },
  'Educación': {
    categoria: 'Educación',
    palabras: [
      'educación virtual', 'currículo', 'pedagogía', 'alfabetización', 'educación superior',
      'educación primaria', 'resultados de aprendizaje', 'evaluación educativa', 'formación docente', 'tecnología educativa',
      'aprendizaje mixto', 'educación a distancia', 'deserción escolar', 'rendimiento académico', 'pensamiento crítico',
      'resolución de problemas', 'desarrollo cognitivo', 'educación infantil', 'educación especial', 'educación inclusiva',
      'política educativa', 'tasa de alfabetización', 'educación bilingüe', 'motivación estudiantil', 'metacognición',
      'constructivismo', 'psicología educativa', 'formación vocacional', 'educación de adultos', 'aprendizaje permanente',
      'equidad educativa', 'tutoría', 'aprendizaje entre pares', 'gamificación educativa', 'brecha digital educativa',
      'e-learning', 'curriculum', 'pedagogy', 'literacy', 'STEM education',
      'higher education', 'primary education', 'learning outcomes', 'assessment', 'teacher training',
      'blended learning', 'distance education', 'school dropout', 'academic performance', 'critical thinking',
      'problem solving', 'cognitive development', 'early childhood education', 'special education', 'inclusive education',
      'educational policy', 'bilingual education', 'student motivation', 'metacognition', 'constructivism',
      'educational psychology', 'vocational training', 'adult education', 'lifelong learning', 'educational equity',
      'tutoring', 'peer learning', 'gamification', 'educational technology', 'digital divide',
    ]
  },
  'Ciencias Sociales': {
    categoria: 'Ciencias Sociales',
    palabras: [
      'sociología', 'antropología', 'ciencia política', 'desigualdad social', 'pobreza',
      'migración', 'urbanización', 'globalización', 'democracia', 'derechos humanos',
      'estudios de género', 'feminismo', 'discriminación racial', 'movilidad social', 'desarrollo comunitario',
      'investigación cualitativa', 'etnografía', 'capital social', 'sociedad civil', 'gobernanza',
      'corrupción', 'política social', 'estado de bienestar', 'cohesión social', 'identidad cultural',
      'multiculturalismo', 'estructura familiar', 'exclusión social', 'movimientos sociales', 'activismo',
      'políticas públicas', 'calidad de vida', 'medios de comunicación', 'participación ciudadana', 'vulnerabilidad social',
      'sociology', 'anthropology', 'political science', 'social inequality', 'poverty',
      'migration', 'urbanization', 'globalization', 'democracy', 'human rights',
      'gender studies', 'feminism', 'racial discrimination', 'social mobility', 'community development',
      'qualitative research', 'ethnography', 'social capital', 'civil society', 'governance',
      'corruption', 'social policy', 'welfare state', 'social cohesion', 'cultural identity',
      'multiculturalism', 'family structure', 'social exclusion', 'social movements', 'activism',
      'public policy', 'quality of life', 'media studies', 'citizen participation', 'social vulnerability',
    ]
  },
  'Tecnología': {
    categoria: 'Tecnología',
    palabras: [
      'inteligencia artificial', 'aprendizaje automático', 'aprendizaje profundo', 'redes neuronales', 'procesamiento del lenguaje natural',
      'visión por computadora', 'cadena de bloques', 'internet de las cosas', 'computación en la nube', 'ciberseguridad',
      'ciencia de datos', 'big data', 'algoritmos', 'ingeniería de software', 'robótica',
      'automatización', 'realidad aumentada', 'realidad virtual', 'computación cuántica', 'ciudades inteligentes',
      'transformación digital', 'código abierto', 'minería de datos', 'análisis predictivo', 'privacidad digital',
      'biometría', 'vehículos autónomos', 'impresión 3D', 'nanotecnología', 'tecnologías renovables',
      'fintech', 'healthtech', 'edtech', 'computación distribuida', 'redes 5G',
      'artificial intelligence', 'machine learning', 'deep learning', 'neural networks', 'natural language processing',
      'computer vision', 'blockchain', 'Internet of Things', 'cloud computing', 'cybersecurity',
      'data science', 'algorithms', 'software engineering', 'robotics', 'automation',
      'augmented reality', 'virtual reality', 'quantum computing', 'smart cities', 'digital transformation',
      'open source', 'data mining', 'predictive analytics', 'digital privacy', 'biometrics',
      'autonomous vehicles', '3D printing', 'nanotechnology', 'renewable energy technology', 'DevOps',
      'microservices', 'edge computing', 'distributed systems', '5G networks', 'digital twin',
    ]
  },
  'Economía': {
    categoria: 'Economía',
    palabras: [
      'producto interno bruto', 'inflación', 'desempleo', 'política fiscal', 'política monetaria',
      'tasas de interés', 'tipo de cambio', 'balanza comercial', 'crecimiento económico', 'recesión',
      'desarrollo económico', 'desigualdad de ingresos', 'reducción de pobreza', 'microeconomía', 'macroeconomía',
      'economía conductual', 'comercio internacional', 'inversión extranjera directa', 'mercados financieros', 'bolsa de valores',
      'banco central', 'sistema tributario', 'gasto público', 'productividad laboral', 'cadena de suministro',
      'emprendimiento', 'innovación económica', 'economía sostenible', 'economía circular', 'economía digital',
      'microfinanzas', 'mercado de trabajo', 'salario mínimo', 'deuda pública', 'subsidios',
      'GDP', 'inflation', 'unemployment', 'fiscal policy', 'monetary policy',
      'interest rates', 'exchange rates', 'trade balance', 'economic growth', 'recession',
      'economic development', 'income inequality', 'poverty reduction', 'microeconomics', 'macroeconomics',
      'behavioral economics', 'international trade', 'foreign direct investment', 'financial markets', 'stock market',
      'central bank', 'taxation', 'public spending', 'labor productivity', 'supply chain',
      'entrepreneurship', 'green economy', 'circular economy', 'digital economy', 'microfinance',
      'labor market', 'minimum wage', 'public debt', 'subsidies', 'economic indicators',
    ]
  }
};

export async function seedDefaultKeywordsForUser(usuarioId: number): Promise<void> {
  for (const [dicNombre, { categoria, palabras }] of Object.entries(DEFAULT_DICCIONARIOS)) {
    const kwIds: number[] = [];

    for (const palabra of palabras) {
      const existing = await prisma.keyword.findFirst({
        where: { usuario_id: usuarioId, palabra: { equals: palabra, mode: 'insensitive' } }
      });
      if (existing) {
        kwIds.push(existing.id);
      } else {
        const kw = await prisma.keyword.create({
          data: { usuario_id: usuarioId, palabra, categoria }
        });
        kwIds.push(kw.id);
      }
    }

    let dic = await prisma.grupoDiccionario.findFirst({
      where: { usuario_id: usuarioId, nombre: dicNombre }
    });
    if (!dic) {
      dic = await prisma.grupoDiccionario.create({
        data: {
          usuario_id: usuarioId,
          nombre: dicNombre,
          descripcion: `Diccionario temático de ${dicNombre.toLowerCase()} — keywords en español e inglés`
        }
      });
    }

    for (const kwId of kwIds) {
      const exists = await prisma.grupoDiccionarioKeyword.findUnique({
        where: { grupo_id_keyword_id: { grupo_id: dic.id, keyword_id: kwId } }
      });
      if (!exists) {
        await prisma.grupoDiccionarioKeyword.create({
          data: { grupo_id: dic.id, keyword_id: kwId }
        });
      }
    }
  }
}
