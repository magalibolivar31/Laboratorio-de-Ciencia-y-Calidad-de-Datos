import { Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

// Sube desde __dirname hasta encontrar el directorio raiz que contiene python/.
// Mismo patron que dataset.controller (funciona en dev y en Docker).
const findRoot = (start: string): string => {
  let dir = start;
  for (let i = 0; i < 6; i++) {
    if (fs.existsSync(path.join(dir, 'python', 'etl.py'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return start;
};

/**
 * POST /api/quality/analyze
 * body: { filename, nombre?, fuente?, maxRows? }
 *
 * Analiza un archivo que ya vive en /exports (p.ej. un repositorio exportado
 * por la busqueda) ejecutando python/quality.py, guarda el reporte y lo devuelve.
 */
export const analyzeQuality = async (req: any, res: Response) => {
  const { filename, nombre, fuente, maxRows } = req.body;

  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Debes indicar el nombre del archivo a analizar (filename).' });
  }

  // Anti path-traversal: solo el nombre de archivo, nunca rutas.
  const safeName = path.basename(filename);
  const rootDir = findRoot(__dirname);
  const filePath = path.join(rootDir, 'exports', safeName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `No se encontro el archivo '${safeName}' en exports.` });
  }

  const pythonPath = process.env.PYTHON_PATH || 'python';
  const scriptPath = path.join(rootDir, 'python', 'quality.py');
  const args = [scriptPath, filePath];
  if (maxRows && Number.isInteger(maxRows)) args.push('--max-rows', String(maxRows));

  const env = { ...process.env, PYTHONIOENCODING: 'utf-8' };
  const py = spawn(pythonPath, args, { env });

  let stdout = '';
  let stderr = '';
  py.stdout.on('data', (d) => { stdout += d.toString(); });
  py.stderr.on('data', (d) => { stderr += d.toString(); });

  py.on('error', (err) => {
    if (!res.headersSent) {
      logAudit(req.usuarioId || null, 'ERROR_QUALITY', 'QualityReport', undefined, err.message);
      res.status(500).json({ error: 'No se pudo iniciar el motor de QualityAI.', details: err.message });
    }
  });

  py.on('close', async (code) => {
    if (res.headersSent) return;

    let report: any;
    try {
      report = JSON.parse(stdout.trim());
    } catch {
      await logAudit(req.usuarioId || null, 'ERROR_QUALITY', 'QualityReport', undefined, stderr || stdout);
      return res.status(500).json({
        error: 'QualityAI no devolvio un resultado valido.',
        details: stderr || 'Salida no parseable.',
        code,
      });
    }

    if (code !== 0 || report.error) {
      await logAudit(req.usuarioId || null, 'ERROR_QUALITY', 'QualityReport', undefined, report.error || stderr);
      return res.status(500).json({ error: 'El analisis de calidad fallo.', details: report.error || stderr });
    }

    try {
      const saved = await prisma.qualityReport.create({
        data: {
          usuario_id: req.usuarioId || null,
          dataset_ref: safeName,
          nombre: nombre || safeName,
          fuente: fuente || null,
          quality_score: report.qualityScore ?? 0,
          rows_total: report.sample?.rowsTotal ?? null,
          rows_sampled: report.sample?.rowsSampled ?? null,
          columnas: report.sample?.columns ?? null,
          // El JSON `metrics` guarda tambien dimensiones, metodologia y ML-readiness
          // (asi no hace falta migrar columnas nuevas).
          metrics: {
            ...(report.metrics ?? {}),
            dimensions: report.dimensions ?? [],
            methodology: report.methodology ?? null,
            mlReadiness: report.mlReadiness ?? null,
            reproducibility: report.reproducibility ?? null,
          },
          issues: report.issues ?? [],
          alerts: report.alerts ?? [],
          status: 'done',
        },
      });

      await logAudit(
        req.usuarioId || null, 'QUALITY', 'QualityReport', String(saved.id),
        `${safeName} | score ${report.qualityScore}`
      );

      return res.json({ mensaje: 'Analisis de calidad completado', id: saved.id, report });
    } catch (dbErr: any) {
      console.error('[QUALITY DB ERROR]', dbErr);
      // Aun si falla el guardado, devolvemos el reporte calculado.
      return res.json({ mensaje: 'Analisis completado (no se pudo persistir)', report, warning: dbErr.message });
    }
  });
};

/**
 * GET /api/quality/report/:id  -> un reporte por id.
 */
export const getQualityReport = async (req: any, res: Response) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Id invalido.' });

  const report = await prisma.qualityReport.findUnique({ where: { id } });
  if (!report) return res.status(404).json({ error: 'Reporte no encontrado.' });
  return res.json(report);
};

/**
 * GET /api/quality/history  -> reportes del usuario autenticado (mas recientes primero).
 */
export const getQualityHistory = async (req: any, res: Response) => {
  const where = req.usuarioId ? { usuario_id: req.usuarioId } : {};
  const reports = await prisma.qualityReport.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  return res.json(reports);
};

// Ejecuta un script de python y resuelve con el JSON de stdout.
const runPython = (script: string, args: string[], stdin?: string): Promise<any> =>
  new Promise((resolve, reject) => {
    const rootDir = findRoot(__dirname);
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const py = spawn(pythonPath, [path.join(rootDir, 'python', script), ...args], {
      env: { ...process.env, PYTHONIOENCODING: 'utf-8' },
    });
    let out = '', err = '';
    py.stdout.on('data', (d) => { out += d.toString(); });
    py.stderr.on('data', (d) => { err += d.toString(); });
    py.on('error', reject);
    py.on('close', () => {
      try {
        const parsed = JSON.parse(out.trim());
        if (parsed.error) return reject(new Error(parsed.error));
        resolve(parsed);
      } catch {
        reject(new Error(err || 'Salida de python no parseable.'));
      }
    });
    if (stdin !== undefined) { py.stdin.write(stdin); py.stdin.end(); }
  });

/**
 * GET /api/quality/compare
 * Compara la calidad entre fuentes con estadistica (Kruskal-Wallis).
 */
export const compareQuality = async (_req: any, res: Response) => {
  try {
    const reports = await prisma.qualityReport.findMany({
      where: { fuente: { not: null } },
      select: { fuente: true, quality_score: true },
    });

    // agrupar scores por fuente
    const groups: Record<string, number[]> = {};
    for (const r of reports) {
      const f = r.fuente as string;
      (groups[f] ||= []).push(r.quality_score);
    }

    if (Object.keys(groups).length === 0) {
      return res.json({ perSource: [], test: { applicable: false, reason: 'Aun no hay analisis con fuente registrada.' } });
    }

    const result = await runPython('quality_compare.py', [], JSON.stringify(groups));
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo comparar fuentes.', details: e.message });
  }
};

/**
 * POST /api/quality/analyze-url  { url, nombre, fuente }
 * Pipeline real: descarga un sample del dataset desde su URL, lo analiza con
 * QualityAI (datos internos reales) y guarda el reporte con la fuente real.
 */
export const analyzeQualityUrl = async (req: any, res: Response) => {
  const { url, nombre, fuente } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'Debes indicar la URL del dataset.' });
  }

  const rootDir = findRoot(__dirname);
  const exportsPath = path.join(rootDir, 'exports');
  if (!fs.existsSync(exportsPath)) fs.mkdirSync(exportsPath, { recursive: true });
  const outBase = path.join(exportsPath, `SAMPLE_${Date.now()}`);

  try {
    // 1) descargar sample
    const dl = await runPython('dataset_download.py', [url, '--out', outBase]);
    // 2) analizar el archivo descargado
    const report = await runPython('quality.py', [dl.path]);

    // 3) persistir
    const saved = await prisma.qualityReport.create({
      data: {
        usuario_id: req.usuarioId || null,
        dataset_ref: url,
        nombre: nombre || path.basename(dl.path),
        fuente: fuente || null,
        quality_score: report.qualityScore ?? 0,
        rows_total: report.sample?.rowsTotal ?? null,
        rows_sampled: report.sample?.rowsSampled ?? null,
        columnas: report.sample?.columns ?? null,
        metrics: {
          ...(report.metrics ?? {}),
          dimensions: report.dimensions ?? [],
          methodology: report.methodology ?? null,
          mlReadiness: report.mlReadiness ?? null,
          reproducibility: report.reproducibility ?? null,
          download: dl,
        },
        issues: report.issues ?? [],
        alerts: report.alerts ?? [],
        status: 'done',
      },
    });

    await logAudit(req.usuarioId || null, 'QUALITY_URL', 'QualityReport', String(saved.id), `${url} | score ${report.qualityScore}`);
    return res.json({ mensaje: 'Dataset descargado y analizado', id: saved.id, report, download: dl });
  } catch (e: any) {
    await logAudit(req.usuarioId || null, 'ERROR_QUALITY_URL', 'QualityReport', undefined, e.message);
    return res.status(500).json({ error: 'No se pudo descargar/analizar el dataset.', details: e.message });
  }
};

/**
 * POST /api/quality/upload-analyze  (multipart: file + nombre? + fuente?)
 * Recibe un archivo subido por el usuario (.csv/.xlsx), ya guardado en /exports
 * por multer, lo analiza con QualityAI y guarda el reporte.
 */
export const uploadAndAnalyze = async (req: any, res: Response) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No se subió ningún archivo (.csv o .xlsx).' });
  }
  const filePath = req.file.path;
  const safeName = req.file.filename;
  const { nombre, fuente } = req.body;

  try {
    const report = await runPython('quality.py', [filePath]);
    const saved = await prisma.qualityReport.create({
      data: {
        usuario_id: req.usuarioId || null,
        dataset_ref: safeName,
        nombre: nombre || req.file.originalname,
        fuente: fuente || 'Archivo subido',
        quality_score: report.qualityScore ?? 0,
        rows_total: report.sample?.rowsTotal ?? null,
        rows_sampled: report.sample?.rowsSampled ?? null,
        columnas: report.sample?.columns ?? null,
        metrics: {
          ...(report.metrics ?? {}),
          dimensions: report.dimensions ?? [],
          methodology: report.methodology ?? null,
          mlReadiness: report.mlReadiness ?? null,
          reproducibility: report.reproducibility ?? null,
        },
        issues: report.issues ?? [],
        alerts: report.alerts ?? [],
        status: 'done',
      },
    });
    await logAudit(req.usuarioId || null, 'QUALITY_UPLOAD', 'QualityReport', String(saved.id), `${req.file.originalname} | score ${report.qualityScore}`);
    return res.json({ mensaje: 'Archivo analizado', id: saved.id, report, filename: safeName });
  } catch (e: any) {
    return res.status(500).json({ error: 'No se pudo analizar el archivo.', details: e.message });
  }
};

/**
 * POST /api/quality/validate  { filename, target }
 * Validacion predictiva: entrena un baseline y mide rendimiento real (utilidad ML).
 */
export const validateQuality = async (req: any, res: Response) => {
  const { filename, target } = req.body;
  if (!filename || !target) {
    return res.status(400).json({ error: 'Se requieren filename y target.' });
  }
  const safeName = path.basename(filename);
  const rootDir = findRoot(__dirname);
  const filePath = path.join(rootDir, 'exports', safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: `No se encontro '${safeName}' en exports.` });
  }
  try {
    const result = await runPython('quality_validate.py', [filePath, '--target', String(target)]);
    await logAudit(req.usuarioId || null, 'QUALITY_VALIDATE', 'QualityReport', undefined, `${safeName} | ${target} | ${result.performance}`);
    return res.json(result);
  } catch (e: any) {
    return res.status(500).json({ error: 'La validacion predictiva fallo.', details: e.message });
  }
};
