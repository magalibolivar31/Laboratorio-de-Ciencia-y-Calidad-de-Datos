import { Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import * as XLSX from 'xlsx';

export const searchDatasets = async (req: Request, res: Response) => {
  const { keywords, apiKey } = req.body;

  console.log('[DEBUG] Petición de búsqueda recibida:', { keywords, apiKey: apiKey ? '***' : 'none' });

  if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
    return res.status(400).json({ error: 'Debes proporcionar al menos una palabra clave.' });
  }

  try {
    const pythonPath = process.env.PYTHON_PATH || 'python';
    const scriptPath = path.resolve(__dirname, '../../../python/etl.py');
    const exportsPath = path.resolve(__dirname, '../../../exports');

    // Configurar variables de entorno (API Keys)
    // Prioridad: API Key manual (si viene en apiKey) > .env
    const env: any = { ...process.env };
    
    if (apiKey) {
      // Si viene una clave manual (de la bóveda o temporal), la usamos para todos los servicios
      env.ZENODO_TOKEN = apiKey;
      env.KAGGLE_KEY = apiKey;
      env.HUGGINGFACE_TOKEN = apiKey;
    }

    // Lógica de filtrado de fuentes según la opción del combo
    let activeKeywords = [...keywords];
    const service = req.body.service; // Enviado desde el frontend

    // Si no es búsqueda integral, podríamos filtrar o pasar un flag al script
    // Por ahora, el script python usa todas las fuentes, pero el backend
    // asegura que las keys estén disponibles.

    console.log(`[PYTHON] Intentando ejecutar: ${pythonPath} ${scriptPath}`);

    const pyProcess = spawn(pythonPath, [scriptPath, ...keywords], {
      cwd: exportsPath,
      env: env
    });

    let output = '';
    let errorOutput = '';

    pyProcess.stdout.on('data', (data) => {
      output += data.toString();
      console.log(`[PYTHON STDOUT] ${data}`);
    });

    pyProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.error(`[PYTHON STDERR] ${data}`);
    });

    pyProcess.on('error', (err) => {
      console.error('[PYTHON SPAWN ERROR]', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'No se pudo iniciar el motor de Python.', details: err.message });
      }
    });

    pyProcess.on('close', (code) => {
      console.log(`[PYTHON] Proceso finalizado con código ${code}`);
      
      if (res.headersSent) return;

      if (code !== 0) {
        return res.status(500).json({ error: 'El motor de búsqueda falló.', details: errorOutput });
      }

      const match = output.match(/Guardado: (REPOSITORIO_.*\.xlsx)/);
      const filename = match ? match[1] : null;
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';

      let realData: any[] = [];
      if (filename) {
        try {
          const filePath = path.join(exportsPath, filename);
          const workbook = XLSX.readFile(filePath);
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          realData = XLSX.utils.sheet_to_json(worksheet);
          
          // Mapear los datos para que el frontend los entienda
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

      res.json({
        mensaje: 'Búsqueda completada',
        archivo: filename,
        url: filename ? `${backendUrl}/exports/${filename}` : null,
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
