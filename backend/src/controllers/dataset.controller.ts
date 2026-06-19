import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';
import prisma from '../lib/prisma';
import { logAudit } from '../lib/audit.helper';

export const searchDatasets = async (req: any, res: Response) => {
  const { keywords, apiKey } = req.body;

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Debes proporcionar al menos una palabra clave.' });
  }

  try {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    // Sube desde __dirname hasta encontrar el directorio que contiene python/etl.py.
    // Funciona tanto en dev (src/controllers/) como en prod Docker (dist/controllers/).
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
    const rootDir = findRoot(__dirname);
    const scriptPath = path.join(rootDir, 'python/etl.py');
    const exportsPath = path.join(rootDir, 'exports');

    if (!fs.existsSync(exportsPath)) {
      fs.mkdirSync(exportsPath, { recursive: true });
    }

    // Mapeo de nombre de fuente → variable de entorno que usa etl.py
    const FUENTE_ENV: Record<string, string> = {
      'Zenodo': 'ZENODO_TOKEN',
      'Kaggle': 'KAGGLE_KEY',
      'Hugging Face': 'HUGGINGFACE_TOKEN',
    };

    const env: any = { ...process.env, PYTHONIOENCODING: 'utf-8' };

    // Sobrescribir con las keys guardadas en la BD (tienen prioridad sobre .env)
    try {
      const fuentes = await prisma.fuenteDatos.findMany({ where: { activa: true } });
      for (const f of fuentes) {
        const envVar = FUENTE_ENV[f.nombre];
        if (envVar && (f as any).api_key) env[envVar] = (f as any).api_key;
      }
    } catch {}

    // Tokens personales ACTIVOS del usuario (máxima prioridad)
    if (req.usuarioId) {
      try {
        const userTokens = await prisma.token.findMany({
          where: { usuario_id: req.usuarioId, activa: true }
        });
        for (const t of userTokens) {
          const envVar = FUENTE_ENV[t.servicio];
          if (envVar && t.api_key_cifrada) env[envVar] = t.api_key_cifrada;
          if ((t.servicio === 'Kaggle') && t.usuario_api) env['KAGGLE_USERNAME'] = t.usuario_api;
        }
      } catch {}
    }

    // apiKey legacy (del modal de búsqueda) — se ignora porque los tokens de Settings tienen prioridad
    if (apiKey && !req.usuarioId) {
      env.ZENODO_TOKEN = apiKey;
      env.KAGGLE_KEY = apiKey;
      env.HUGGINGFACE_TOKEN = apiKey;
    }

    const service = req.body.service || 'ADMIN_DEFAULT';

    const pyProcess = spawn(pythonPath, [scriptPath, ...keywords], {
      cwd: exportsPath,
      env: env
    });

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => { output += data.toString(); });
    pyProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pyProcess.on('error', (err) => {
      if (!res.headersSent) {
        logAudit(req.usuarioId || null, 'ERROR_BUSQUEDA', 'Dataset', undefined, err.message);
        res.status(500).json({ error: 'No se pudo iniciar el motor de Python.', details: err.message });
      }
    });

    pyProcess.on('close', async (code) => {
      if (res.headersSent) return;

      if (code !== 0) {
        await logAudit(req.usuarioId || null, 'ERROR_BUSQUEDA', 'Dataset', undefined, errorOutput);
        return res.status(500).json({
          error: 'El motor de búsqueda falló.',
          details: errorOutput || 'El proceso de Python terminó con un error desconocido.',
          code: code
        });
      }

      const match = output.match(/Guardado: (REPOSITORIO_.*\.xlsx)/);
      const filename = match ? match[1].trim() : null;
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      let realData: any[] = [];
      if (filename) {
        try {
          const filePath = path.join(exportsPath, filename);
          const workbook = XLSX.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          realData = XLSX.utils.sheet_to_json(worksheet);
          realData = realData.map((row: any, index: number) => ({
            id: index,
            nro: row["Nro"] || index + 1,
            titulo: row["Nombre del dataset"] || "Sin título",
            area: row["Área médica"] || "N/A",
            tipo: row["Tipo de datos"] || "N/A",
            fuente: row["Fuente"] || "Desconocida",
            institucion: row["Autor / Institución"] || "N/A",
            pais: row["País"] || "N/A",
            registros: row["Cant. registros"] || "N/A",
            formato: row["Tipo de formato"] || "N/A",
            variables: row["Variables principales"] || "N/A",
            cant_variables: row["Cant. variables"] || "N/A",
            año_pub: row["Año publicación"] || "N/A",
            año_act: row["Año actualización"] || "N/A",
            url_original: row["Link"] || null,
            idioma: row["Idioma"] || "N/A",
            descripcion: row["Breve descripción"] || "Sin descripción",
            propuesta: row["Propuesta / Objetivo"] || "N/A",
            observaciones: row["Observaciones"] || "N/A",
            responsable: row["Integrante responsable"] || "N/A"
          }));
        } catch (readError) {
          console.error('[EXCEL READ ERROR]', readError);
        }
      }

      // Guardar búsqueda en historial (la exportación se guarda solo si el usuario confirma)
      let busquedaId: number | null = null;
      if (req.usuarioId) {
        try {
          const busqueda = await prisma.historialBusqueda.create({
            data: {
              usuario_id: req.usuarioId,
              keywords: keywords.join(', '),
              fuente: service,
              resultados: realData.length
            }
          });
          busquedaId = busqueda.id;
          await logAudit(req.usuarioId, 'BUSQUEDA', 'Dataset', undefined, `${keywords.join(', ')} | ${service} | ${realData.length} resultados`);
        } catch (histErr) {
          console.error('[HISTORIAL ERROR]', histErr);
        }
      }

      res.json({
        mensaje: 'Búsqueda completada',
        archivo: filename,
        url: filename ? `${backendUrl}/exports/${encodeURIComponent(filename)}` : null,
        busqueda_id: busquedaId,
        resultados: realData
      });
    });

  } catch (error: any) {
    console.error('[BACKEND ERROR]', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error interno al procesar la búsqueda.', details: error.message });
    }
  }
};
