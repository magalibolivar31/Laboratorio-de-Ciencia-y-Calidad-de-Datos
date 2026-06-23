import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import {
  ShieldCheck, Activity, AlertTriangle, AlertCircle, Loader2, RefreshCw,
  Play, CheckCircle2, XCircle, Database, Columns3, Layers,
  BrainCircuit, BarChart3, FlaskConical, Scale,
  Tags, TrendingUp, Boxes, CalendarClock, Check, Minus, Ban, HelpCircle, Download, Fingerprint, UploadCloud
} from 'lucide-react';
import api from '../lib/api';
import InfoPopover from '../components/InfoPopover';

interface ColumnCompleteness { column: string; completenessPct: number }
interface QualityIssue { severity: 'critical' | 'warning' | 'low'; type: string; column: string | null; detail: string }
interface Dimension {
  id: string; label: string; isoCharacteristic: string;
  value: number; weight: number; contribution: number; rating: 'ok' | 'warning' | 'critical';
}
interface Fitness { useCase: string; fit: 'apto' | 'limitado' | 'no_apto'; reason: string }
interface MLReadiness { readinessScore: number; fitness: Fitness[]; signals: any }

interface QualityReport {
  methodology: { version: string; framework: string };
  qualityScore: number;
  dimensions: Dimension[];
  sample: { rowsTotal: number | null; rowsSampled: number | null; columns: number };
  metrics: {
    missingValuesPct: number; duplicateRowsPct: number; outliersPct: number;
    typeConsistencyPct: number; columnCompleteness: ColumnCompleteness[];
  };
  issues: QualityIssue[];
  alerts: string[];
  mlReadiness: MLReadiness;
  reproducibility?: {
    sampleSha256: string; configVersion: string; engineVersion: string;
    analyzedAt: string; rowsAnalyzed: number | null;
  };
}

interface SavedReport {
  id: number; dataset_ref: string; nombre: string | null;
  quality_score: number; rows_sampled: number | null; columnas: number | null; created_at: string;
}
interface SourceStat { source: string; n: number; mean: number; median: number; std: number; min: number; max: number }
interface CompareResult { perSource: SourceStat[]; test: any }
interface ValidateResult {
  target: string; task: string; metric: string; performance: number; performanceStd: number; interpretation: string;
  labelQuality?: number | null; suspectLabelsPct?: number | null; labelInterpretation?: string | null;
}
interface UserInfo { nombre: string; email: string; rol?: string }

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const scoreColor = (s: number) =>
  s >= 80 ? { text: 'text-green-600', bg: 'bg-green-50', ring: 'ring-green-200' }
  : s >= 50 ? { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-200' }
  : { text: 'text-red-600', bg: 'bg-red-50', ring: 'ring-red-200' };

const ratingColor: Record<string, string> = {
  ok: 'bg-green-500', warning: 'bg-amber-500', critical: 'bg-red-500',
};
const ratingChip: Record<string, string> = {
  ok: 'bg-green-100 text-green-700', warning: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700',
};
const issueSev: Record<string, { iconWrap: string; text: string; label: string; icon: React.ReactNode }> = {
  critical: { iconWrap: 'bg-red-100 text-red-600', text: 'text-red-600', label: 'Crítico', icon: <XCircle size={16} /> },
  warning: { iconWrap: 'bg-amber-100 text-amber-600', text: 'text-amber-600', label: 'Advertencia', icon: <AlertTriangle size={16} /> },
  low: { iconWrap: 'bg-blue-100 text-blue-600', text: 'text-blue-600', label: 'Menor', icon: <AlertCircle size={16} /> },
};
const fitLabel: Record<string, string> = { apto: 'Apto', limitado: 'Limitado', no_apto: 'No apto' };

// Mapea cada caso de uso (texto que viene de python) a su explicación y su ícono.
const fitInfoKey: Record<string, string> = {
  'Clasificacion': 'fitClasificacion',
  'Regresion': 'fitRegresion',
  'Clustering': 'fitClustering',
  'Series temporales': 'fitSeries',
};
const fitIcon: Record<string, React.ReactNode> = {
  'Clasificacion': <Tags size={16} />,
  'Regresion': <TrendingUp size={16} />,
  'Clustering': <Boxes size={16} />,
  'Series temporales': <CalendarClock size={16} />,
};
const fitPill: Record<string, { cls: string; icon: React.ReactNode }> = {
  apto: { cls: 'bg-green-100 text-green-700', icon: <Check size={11} strokeWidth={3} /> },
  limitado: { cls: 'bg-amber-100 text-amber-700', icon: <Minus size={11} strokeWidth={3} /> },
  no_apto: { cls: 'bg-gray-100 text-gray-400', icon: <Ban size={11} strokeWidth={3} /> },
};
const readinessColor = (s: number) => s >= 66 ? 'text-green-600' : s >= 33 ? 'text-amber-600' : 'text-red-600';

// Comparación entre fuentes: hoy es solo exploratoria (muestra sesgada, bajo volumen),
// así que se mantiene OCULTA en la UI. El backend y el código quedan intactos.
// Para reactivarla cuando haya un corpus de calidad variada: poner en true.
const SHOW_SOURCE_COMPARISON = false;

const QualityAnalysis: React.FC = () => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [history, setHistory] = useState<SavedReport[]>([]);
  const [compare, setCompare] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<QualityReport | null>(null);
  const [reportFile, setReportFile] = useState<string>('');
  const [reportName, setReportName] = useState<string>('');
  const [error, setError] = useState('');
  // validación predictiva
  const [target, setTarget] = useState('');
  const [validating, setValidating] = useState(false);
  const [validation, setValidation] = useState<ValidateResult | null>(null);
  const [validationError, setValidationError] = useState('');
  // análisis por URL / archivo subido (descarga/lectura real del dataset)
  const [url, setUrl] = useState('');
  const [urlNombre, setUrlNombre] = useState('');
  const [urlFuente, setUrlFuente] = useState('');
  const [analyzingUrl, setAnalyzingUrl] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [urlError, setUrlError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const showSuccess = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  useEffect(() => {
    const s = localStorage.getItem('user');
    if (s) { try { setUser(JSON.parse(s)); } catch {} }
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setError('');
    try {
      const [rHistory, rCompare] = await Promise.all([
        api.get('/quality/history').catch(() => ({ data: [] })),
        api.get('/quality/compare').catch(() => ({ data: null })),
      ]);
      setHistory(rHistory.data);
      setCompare(rCompare.data);
    } catch {
      setError('No se pudieron cargar los datos.');
    }
  };

  const analyzeUrl = async () => {
    if (!url.trim()) return;
    setAnalyzingUrl(true); setUrlError(''); setError(''); setReport(null); setValidation(null); setTarget(''); setValidationError('');
    try {
      const { data } = await api.post('/quality/analyze-url', { url: url.trim(), nombre: urlNombre.trim(), fuente: urlFuente.trim() });
      setReport(data.report);
      // el sample descargado queda en exports → permite también validación predictiva
      const sampleName = data.download?.path ? data.download.path.split(/[\\/]/).pop() : '';
      setReportFile(sampleName || '');
      setReportName(urlNombre.trim() || sampleName || url.trim());
      showSuccess('Dataset descargado y analizado ✓');
      fetchAll();
    } catch (e: any) {
      setUrlError(e?.response?.data?.details || e?.response?.data?.error || 'No se pudo descargar/analizar el dataset. Verificá que el enlace sea de descarga directa de un .csv o .xlsx.');
    } finally {
      setAnalyzingUrl(false);
    }
  };

  const uploadFile = async (file: File) => {
    setUploadingFile(true); setUrlError(''); setError(''); setReport(null); setValidation(null); setTarget(''); setValidationError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      if (urlNombre.trim()) fd.append('nombre', urlNombre.trim());
      if (urlFuente.trim()) fd.append('fuente', urlFuente.trim());
      const { data } = await api.post('/quality/upload-analyze', fd);
      setReport(data.report);
      setReportFile(data.filename || '');
      setReportName(urlNombre.trim() || file.name);
      showSuccess(`Archivo "${file.name}" subido y analizado ✓`);
      fetchAll();
    } catch (e: any) {
      const d = e?.response?.data;
      setUrlError(d?.details || d?.error || 'No se pudo analizar el archivo.');
    } finally {
      setUploadingFile(false);
    }
  };

  // completitud de la columna target elegida (para avisar antes de entrenar)
  const targetCompleteness = (col: string): number | null => {
    if (!report) return null;
    const c = report.metrics.columnCompleteness.find((x) => x.column === col);
    return c ? c.completenessPct : null;
  };

  const runValidation = async () => {
    if (!reportFile) { setValidationError('No hay un archivo analizado para validar. Volvé a analizar el dataset.'); return; }
    if (!target) { setValidationError('Elegí primero una columna target.'); return; }
    // chequeo proactivo: si la columna está vacía o casi, no tiene sentido entrenar
    const comp = targetCompleteness(target);
    if (comp != null && comp < 5) {
      setValidation(null);
      setValidationError(`La columna «${target}» está vacía (${comp}% de datos): no hay etiquetas para entrenar. Elegí otra columna.`);
      return;
    }
    setValidating(true); setValidation(null); setValidationError(''); setError('');
    try {
      const { data } = await api.post('/quality/validate', { filename: reportFile, target });
      setValidation(data);
    } catch (e: any) {
      const detail = e?.response?.data?.details || e?.response?.data?.error || '';
      setValidationError(
        `No se pudo entrenar con «${target}». ${detail ? 'Motivo: ' + detail : 'Probablemente la columna no tiene datos suficientes o no sirve como target.'} Probá con otra columna.`
      );
    } finally {
      setValidating(false);
    }
  };

  const sc = report ? scoreColor(report.qualityScore) : null;

  return (
    <div className="bg-gray-50 flex overflow-hidden" style={{ minHeight: '100vh' }}>
      <Sidebar />
      {/* Toast de éxito */}
      {successMsg && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl shadow-2xl font-black text-sm animate-[fadeIn_0.2s_ease-out]">
          <CheckCircle2 size={18} /> {successMsg}
        </div>
      )}

      <main className="flex-1 flex flex-col h-screen overflow-hidden">

        <header className="bg-white h-20 border-b border-gray-200 flex items-center justify-between px-10 shrink-0 shadow-sm">
          <h2 className="text-2xl font-display font-black text-gray-800 tracking-tight flex items-center gap-3">
            <ShieldCheck size={28} className="text-uai-red" /> Calidad de Datos
          </h2>
          <div className="flex items-center gap-4">
            <button onClick={fetchAll} className="p-2 text-gray-400 hover:text-uai-red hover:bg-gray-100 rounded-xl transition-all" title="Actualizar">
              <RefreshCw size={18} />
            </button>
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

        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-5">

          {error && (
            <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-xl font-medium flex items-center gap-2">
              <XCircle size={18} /> {error}
            </div>
          )}

          {/* ===== Explicación del header ===== */}
          <div className="bg-gradient-to-br from-uai-red to-red-800 rounded-2xl p-6 text-white flex items-start gap-4 shadow-lg shadow-uai-red/10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <ShieldCheck size={26} />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-display font-black leading-tight">Evaluá la calidad de tus datasets</h3>
              <p className="text-sm text-white/85 font-medium leading-relaxed mt-1">
                Esta sección analiza un dataset y calcula un <b>Quality Score (0–100)</b> formalizado según el estándar <b>ISO/IEC 25012</b> <InfoPopover metric="iso25012" size={13} light />,
                midiendo completitud, consistencia, exactitud y unicidad. Además evalúa su <b>aptitud para Machine Learning</b>,
                detecta problemas y alertas, y compara la calidad entre fuentes. Tocá los <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-white/20 align-middle"><HelpCircle size={11} strokeWidth={2.5} /></span> para entender cada métrica.
              </p>
            </div>
          </div>

          {/* ===== Resultado del análisis ===== */}
          {report && sc && (
            <div className="bg-white rounded-2xl border border-gray-200 p-7 space-y-7">
              {/* Score + metodología */}
              <div className="flex items-center gap-6">
                <div className={`w-28 h-28 rounded-3xl ${sc.bg} ring-4 ${sc.ring} flex flex-col items-center justify-center shrink-0`}>
                  <span className={`text-4xl font-black ${sc.text}`}>{report.qualityScore}</span>
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-1">Score <InfoPopover metric="qualityScore" size={11} /></span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Análisis de</p>
                  <p className="text-xl font-black text-gray-800 truncate">{reportName}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 font-bold flex-wrap">
                    <span className="flex items-center gap-1"><Database size={13} /> {report.sample.rowsSampled ?? '—'} filas{report.sample.rowsTotal && report.sample.rowsTotal !== report.sample.rowsSampled ? ` de ${report.sample.rowsTotal}` : ''}</span>
                    <span className="flex items-center gap-1"><Columns3 size={13} /> {report.sample.columns} columnas</span>
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-lg"><Scale size={12} /> {report.methodology?.framework} · v{report.methodology?.version} <InfoPopover metric="iso25012" size={12} /></span>
                  </div>
                  <p className="text-xs text-gray-500 font-medium mt-2">Qué se hace acá: el <b>Quality Score</b> (0–100) resume la calidad técnica del dataset. Verde = buena, ámbar = revisar, rojo = problemática. Abajo ves de dónde sale.</p>
                </div>
              </div>

              {/* Desglose por dimensión (ISO 25012) */}
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><Layers size={14} /> Desglose del score por dimensión (ISO/IEC 25012)</p>
                <p className="text-xs text-gray-500 font-medium mb-3">Qué se hace acá: el Quality Score de arriba sale de medir 4 aspectos del dataset. Cada barra muestra el valor de una dimensión (0–100) y, a la derecha, cuántos puntos aporta al score (valor × peso).</p>
                <div className="space-y-2.5">
                  {report.dimensions.map((d) => (
                    <div key={d.id} className="flex items-center gap-3">
                      <div className="w-36 shrink-0">
                        <p className="text-sm font-black text-gray-700 leading-tight flex items-center gap-1">{d.label} <InfoPopover metric={d.id as any} size={12} /></p>
                        <p className="text-[10px] text-gray-400 font-bold">{d.isoCharacteristic} · peso {d.weight}</p>
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden relative">
                        <div className={`h-full ${ratingColor[d.rating]} transition-all`} style={{ width: `${Math.min(100, d.value)}%` }} />
                        <span className="absolute inset-0 flex items-center px-2 text-xs font-black text-gray-700">{d.value}%</span>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 text-[10px] font-black rounded uppercase ${ratingChip[d.rating]}`}>{d.rating}</span>
                      <span className="w-20 text-right text-xs font-bold text-gray-500 shrink-0">+{d.contribution} pts</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-3 italic">Score = Σ (peso × valor de cada dimensión). Pesos y umbrales versionados en <code>quality_config.json</code>.</p>
              </div>

              {/* Aptitud para ML (fitness-for-use) */}
              {report.mlReadiness && (
                <div className="rounded-2xl border border-gray-200 overflow-hidden">
                  <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-indigo-50 to-white px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
                        <BrainCircuit size={20} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-black text-gray-800 flex items-center gap-1.5">Aptitud para Machine Learning <InfoPopover metric="mlReadiness" size={14} /></p>
                        <p className="text-xs text-gray-400 font-medium">Qué se hace acá: se revisa la estructura del dataset para decir si sirve para cada tipo de tarea de ML (apto / limitado / no apto).</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-3xl font-black leading-none ${readinessColor(report.mlReadiness.readinessScore)}`}>
                        {report.mlReadiness.readinessScore}<span className="text-base text-gray-300 font-black">/100</span>
                      </p>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">ML-readiness</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4">
                    {report.mlReadiness.fitness.map((f) => {
                      const pill = fitPill[f.fit];
                      return (
                        <div key={f.useCase} className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-sm transition-all flex flex-col">
                          <div className="flex items-center justify-between mb-2.5">
                            <span className="flex items-center gap-2 min-w-0">
                              <span className="text-indigo-500 shrink-0">{fitIcon[f.useCase]}</span>
                              <span className="text-sm font-black text-gray-700 truncate">{f.useCase}</span>
                            </span>
                            <InfoPopover metric={(fitInfoKey[f.useCase] || 'mlReadiness') as any} size={13} />
                          </div>
                          <span className={`inline-flex items-center gap-1 self-start px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wide ${pill.cls}`}>
                            {pill.icon} {fitLabel[f.fit]}
                          </span>
                          <p className="text-[11px] text-gray-500 leading-snug mt-2.5">{f.reason}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Validación predictiva (utilidad real para ML) */}
              <div className="bg-gray-50 rounded-2xl border border-gray-200 p-5">
                <p className="text-sm font-black text-gray-700 flex items-center gap-2 mb-1"><FlaskConical size={16} className="text-uai-red" /> Validación predictiva <InfoPopover metric="validation" size={13} /></p>
                <p className="text-xs text-gray-500 font-medium mb-3">Qué se hace acá: elegís la columna que querrías predecir (target) y el sistema <b>entrena un modelo real</b> con ella. Mide tres cosas: la <b>performance</b> (qué tan predecible es), la <b>calidad de las etiquetas</b> (si el target es confiable) y un <b>score combinado</b>. Es la utilidad real para ML, no solo la calidad técnica.</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <select value={target} onChange={(e) => { setTarget(e.target.value); setValidationError(''); }} className="px-3 py-2 bg-white border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none">
                    <option value="">Elegí columna target…</option>
                    {report.metrics.columnCompleteness.map((c) => (
                      <option key={c.column} value={c.column} disabled={c.completenessPct < 5}>
                        {c.column} — {c.completenessPct < 5 ? 'vacía ⛔' : `${c.completenessPct}% con datos`}
                      </option>
                    ))}
                  </select>
                  <button onClick={runValidation} disabled={!target || validating}
                    className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-black text-sm hover:bg-black transition-all disabled:opacity-40">
                    {validating ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} Entrenar baseline
                  </button>
                </div>

                {/* Aviso si la columna elegida tiene poca data (antes de entrenar) */}
                {target && !validationError && !validation && (() => {
                  const comp = targetCompleteness(target);
                  if (comp != null && comp < 60) {
                    return (
                      <div className="mt-3 flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium">
                        <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                        La columna «{target}» tiene solo {comp}% de datos. El resultado puede ser poco confiable.
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Error de validación (en el mismo bloque, no arriba de todo) */}
                {validationError && (
                  <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                    <XCircle size={16} className="mt-0.5 shrink-0" /> {validationError}
                  </div>
                )}
                {validation && (
                  <div className="mt-4 bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    {/* Performance */}
                    <div className="flex items-center gap-4">
                      <div className="text-center shrink-0">
                        <p className="text-2xl font-black text-gray-800">{(validation.performance * 100).toFixed(1)}%</p>
                        <p className="text-[10px] font-black text-gray-400 uppercase">{validation.metric}</p>
                      </div>
                      <div className="text-sm">
                        <p className="font-black text-gray-700 capitalize">{validation.task} · target «{validation.target}»</p>
                        <p className="text-gray-500 font-medium">{validation.interpretation}</p>
                      </div>
                    </div>

                    {/* Calidad de etiquetas + score combinado (solo clasificación) */}
                    {validation.labelQuality != null && (() => {
                      const lq = validation.labelQuality!;
                      const combined = Math.round((report.qualityScore + lq) / 2);
                      const bar = (v: number) => v >= 80 ? 'bg-green-500' : v >= 60 ? 'bg-amber-500' : 'bg-red-500';
                      return (
                        <div className="pt-3 border-t border-gray-100 space-y-3">
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 text-xs font-black text-gray-600">Calidad de etiquetas <InfoPopover metric="labelQuality" size={12} /></span>
                              <span className="text-sm font-black text-gray-800">{lq}/100</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${bar(lq)} rounded-full transition-all`} style={{ width: `${Math.min(100, lq)}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-500 mt-1">{validation.labelInterpretation}</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="flex items-center gap-1.5 text-xs font-black text-gray-600">Score combinado <InfoPopover metric="combinedScore" size={12} /></span>
                              <span className="text-sm font-black text-gray-800">{combined}/100</span>
                            </div>
                            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                              <div className={`h-full ${bar(combined)} rounded-full transition-all`} style={{ width: `${Math.min(100, combined)}%` }} />
                            </div>
                            <p className="text-[11px] text-gray-400 mt-1">Calidad de features ({report.qualityScore}) + calidad de etiquetas ({lq})</p>
                          </div>
                          {validation.suspectLabelsPct != null && validation.suspectLabelsPct >= 15 && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-medium">
                              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                              ~{validation.suspectLabelsPct}% de las etiquetas parecen mal asignadas. Revisá el target antes de entrenar.
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Problemas */}
              {report.issues.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertCircle size={14} /> Problemas detectados ({report.issues.length}) <InfoPopover metric="issues" size={13} /></p>
                  <p className="text-xs text-gray-500 font-medium mb-3">Qué se hace acá: se listan los defectos concretos del dataset (faltantes, duplicados, anomalías, tipos mezclados), por columna y ordenados por gravedad (crítico → menor).</p>
                  <div className="space-y-2">
                    {report.issues.map((iss, i) => {
                      const m = issueSev[iss.severity] || issueSev.warning;
                      return (
                        <div key={i} className="flex items-start gap-3 p-3.5 rounded-xl border border-gray-200 bg-white hover:shadow-sm transition-all">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.iconWrap}`}>{m.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {iss.column && <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-black">{iss.column}</span>}
                              <span className={`text-[10px] font-black uppercase tracking-wider ${m.text}`}>{m.label}</span>
                            </div>
                            <p className="text-sm text-gray-600 mt-0.5">{iss.detail}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Alertas */}
              {report.alerts.length > 0 && (
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-2"><AlertTriangle size={14} /> Alertas ({report.alerts.length}) <InfoPopover metric="alerts" size={13} /></p>
                  <p className="text-xs text-gray-500 font-medium mb-3">Qué se hace acá: avisos de contexto para interpretar bien el resultado (ej.: columnas vacías, análisis sobre una muestra, calidad general baja).</p>
                  <ul className="space-y-1.5">
                    {report.alerts.map((a, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-600 font-medium">
                        <AlertTriangle size={14} className="text-amber-500 mt-0.5 shrink-0" /> {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Reproducibilidad */}
              {report.reproducibility && (
                <div className="pt-4 border-t border-gray-100 flex items-center gap-2 text-[11px] text-gray-400 font-medium flex-wrap">
                  <Fingerprint size={13} className="shrink-0" />
                  <span>Reproducibilidad:</span>
                  <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500" title={report.reproducibility.sampleSha256}>
                    sha256 {report.reproducibility.sampleSha256.slice(0, 12)}…
                  </code>
                  <span>· config v{report.reproducibility.configVersion}</span>
                  <span>· {report.reproducibility.engineVersion}</span>
                  <span>· {new Date(report.reproducibility.analyzedAt).toLocaleString('es-AR')}</span>
                </div>
              )}
            </div>
          )}

          {/* ===== Comparación entre fuentes (oculta por flag, ver SHOW_SOURCE_COMPARISON) ===== */}
          {SHOW_SOURCE_COMPARISON && compare && compare.test?.applicable && compare.perSource.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <p className="font-black text-gray-800 flex items-center gap-2"><BarChart3 size={18} className="text-uai-red" /> Comparación de calidad entre fuentes <InfoPopover metric="comparison" size={13} /></p>
                <p className="text-xs text-gray-400 font-medium mt-1">Compara la calidad de tus datasets según el repositorio de origen. Responde: ¿qué fuente publica datasets de mejor calidad? (<b>n</b> = cantidad de datasets analizados por fuente).</p>
              </div>
              <div className="p-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">
                      <th className="pb-2">Fuente</th><th className="pb-2">n</th><th className="pb-2">Media</th><th className="pb-2">Mediana</th><th className="pb-2">Desvío</th><th className="pb-2">Rango</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compare.perSource.map((s) => {
                      const c = scoreColor(s.median);
                      return (
                        <tr key={s.source} className="border-t border-gray-100">
                          <td className="py-2 font-black text-gray-700">{s.source}</td>
                          <td className="py-2 text-gray-500">{s.n}</td>
                          <td className={`py-2 font-black ${c.text}`}>{s.mean}</td>
                          <td className="py-2 font-bold text-gray-700">{s.median}</td>
                          <td className="py-2 text-gray-500">±{s.std}</td>
                          <td className="py-2 text-gray-400">{s.min}–{s.max}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {compare.test?.applicable ? (
                  <div className={`mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium ${compare.test.significant ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-600'}`}>
                    {compare.test.significant ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <AlertCircle size={16} className="mt-0.5 shrink-0" />}
                    <span>
                      {compare.test.significant
                        ? <><b>Hay diferencia significativa</b> de calidad entre las fuentes</>
                        : <><b>No hay diferencia significativa</b> entre las fuentes</>}
                      {' '}(test de Kruskal-Wallis, p = {compare.test.pValue}).
                    </span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-start gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-blue-50 text-blue-700">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" />
                    <span>
                      <b>Todavía no se puede comparar estadísticamente.</b> Hace falta analizar <b>varios datasets distintos</b> por fuente, con calidades diferentes. Por ahora los puntajes son iguales (o hay muy pocos análisis), así que no hay diferencias para medir.
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ===== Analizar dataset real (subir archivo o por URL) ===== */}
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="p-5 border-b border-gray-100">
              <p className="font-black text-gray-800 flex items-center gap-2"><UploadCloud size={18} className="text-uai-red" /> Analizar un dataset real</p>
              <p className="text-xs text-gray-400 font-medium mt-1">Qué se hace acá: subís un archivo de tu compu o pegás un enlace de descarga directa. El sistema lee los <b>datos internos reales</b> (filas y columnas), no la planilla de metadatos.</p>
            </div>
            <div className="p-4 space-y-3">
              {/* Nombre + fuente (se aplican a ambas opciones) */}
              <div className="flex gap-2 flex-wrap">
                <input type="text" value={urlNombre} onChange={(e) => setUrlNombre(e.target.value)}
                  placeholder="Nombre (opcional)"
                  className="flex-1 min-w-[140px] px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none" />
                <input type="text" value={urlFuente} onChange={(e) => setUrlFuente(e.target.value)}
                  placeholder="Fuente (ej. Kaggle, UCI)"
                  className="flex-1 min-w-[140px] px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none" />
              </div>

              {/* Opción A: subir archivo (click o arrastrar) */}
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) uploadFile(f); }}
                className="flex flex-col items-center justify-center gap-1 py-6 px-4 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-uai-red hover:bg-uai-accent/20 transition-all text-center"
              >
                {uploadingFile ? <Loader2 size={24} className="animate-spin text-uai-red" /> : <UploadCloud size={24} className="text-gray-400" />}
                <span className="text-sm font-black text-gray-600">{uploadingFile ? 'Analizando archivo…' : 'Subí un archivo de tu computadora'}</span>
                <span className="text-[11px] text-gray-400 font-medium">Arrastralo acá o hacé clic · .csv o .xlsx · hasta 50 MB</span>
                <input type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadFile(f); e.target.value = ''; }} />
              </label>

              {/* Divisor */}
              <div className="flex items-center gap-3 text-[11px] font-black text-gray-300 uppercase tracking-widest">
                <span className="flex-1 h-px bg-gray-200" /> o por enlace <span className="flex-1 h-px bg-gray-200" />
              </div>

              {/* Opción B: URL */}
              <div className="flex gap-2 flex-wrap">
                <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…/archivo.csv"
                  className="flex-1 min-w-[200px] px-4 py-2.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-sm font-medium focus:border-uai-red outline-none" />
                <button onClick={analyzeUrl} disabled={!url.trim() || analyzingUrl}
                  className="flex items-center gap-2 bg-uai-red text-white px-5 py-2.5 rounded-xl font-black text-sm hover:bg-red-800 transition-all disabled:opacity-50 shrink-0">
                  {analyzingUrl ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                  {analyzingUrl ? 'Descargando…' : 'Descargar y analizar'}
                </button>
              </div>
              <div className="flex items-start gap-1.5 text-[11px] text-gray-400 font-medium leading-relaxed">
                <AlertCircle size={13} className="mt-0.5 shrink-0 text-amber-500" />
                <p>
                  El enlace debe ser de <b>descarga directa</b> del archivo (terminar en <b>.csv</b> o <b>.xlsx</b>).
                  La <b>página</b> del dataset no sirve. Si no encontrás el enlace directo, descargá el archivo y <b>subilo arriba</b>.
                </p>
              </div>

              {/* Error (en el mismo box) */}
              {urlError && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-red-50 text-red-700 text-sm font-medium">
                  <XCircle size={16} className="mt-0.5 shrink-0" /> {urlError}
                </div>
              )}
            </div>
          </div>

          {/* ===== Historial ===== */}
          {history.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
              <div className="p-5 border-b border-gray-100">
                <p className="font-black text-gray-800 flex items-center gap-2"><Activity size={18} className="text-uai-red" /> Análisis anteriores</p>
              </div>
              <div className="p-4 space-y-2">
                {history.map((h) => {
                  const c = scoreColor(h.quality_score);
                  return (
                    <div key={h.id} className="flex items-center justify-between gap-4 px-4 py-3 rounded-xl border border-gray-100">
                      <span className="flex items-center gap-3 min-w-0">
                        <span className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center font-black text-sm ${c.text} shrink-0`}>{h.quality_score}</span>
                        <span className="min-w-0">
                          <span className="font-bold text-gray-700 truncate block">{h.nombre || h.dataset_ref}</span>
                          <span className="text-xs text-gray-400 font-medium">{formatDate(h.created_at)} · {h.rows_sampled ?? '—'} filas · {h.columnas ?? '—'} cols</span>
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 text-xs text-gray-300 font-bold pl-1">
            <CheckCircle2 size={12} /> QualityAI · score formalizado ISO/IEC 25012 + aptitud ML + validación predictiva
          </div>

        </div>
      </main>
    </div>
  );
};

export default QualityAnalysis;
