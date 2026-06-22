#!/usr/bin/env python3
"""
dataset_download.py - Descarga un SAMPLE representativo de un dataset desde su URL.

Uso:
    python dataset_download.py <url> --out <ruta_destino> [--max-mb 25] [--max-rows 100000]

Pensado para datasets accesibles por descarga directa (CSV / Excel), típico de
Zenodo, HealthData.gov y muchos enlaces directos. No descarga el dataset completo:
corta por tamaño (MB) o por filas, lo que llegue primero. Así se puede evaluar
calidad sin bajar gigas.

Escribe el archivo descargado en --out y devuelve por STDOUT un JSON con metadatos
de la descarga. Los logs van a STDERR.
"""

import argparse
import io
import json
import os
import sys
from datetime import datetime, timezone

import requests

DEFAULT_MAX_MB = 25
DEFAULT_MAX_ROWS = 100000
CHUNK = 64 * 1024


def log(msg):
    print(f"[dataset_download.py] {msg}", file=sys.stderr)


def guess_ext(url, content_type):
    u = url.lower().split("?")[0]
    if u.endswith(".csv") or "csv" in (content_type or ""):
        return ".csv"
    if u.endswith(".xlsx") or "spreadsheetml" in (content_type or ""):
        return ".xlsx"
    if u.endswith(".xls"):
        return ".xls"
    if u.endswith(".tsv"):
        return ".tsv"
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("url")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max-mb", type=float, default=DEFAULT_MAX_MB)
    ap.add_argument("--max-rows", type=int, default=DEFAULT_MAX_ROWS)
    args = ap.parse_args()

    max_bytes = int(args.max_mb * 1024 * 1024)

    try:
        log(f"Descargando (máx {args.max_mb} MB / {args.max_rows} filas) de {args.url}")
        headers = {"User-Agent": "QualityAI-DatasetSampler/1.0"}
        resp = requests.get(args.url, stream=True, timeout=30, headers=headers)
        resp.raise_for_status()

        content_type = resp.headers.get("Content-Type", "").lower()
        if "text/html" in content_type:
            raise ValueError("La URL devuelve una página web (HTML), no un archivo de datos descargable.")

        ext = guess_ext(args.url, content_type)
        if ext is None:
            raise ValueError("No se reconoce el formato del archivo (se admiten .csv, .tsv, .xlsx, .xls).")

        out_path = args.out if args.out.lower().endswith(ext) else args.out + ext

        downloaded = 0
        truncated = False
        # Excel es binario: hay que bajarlo entero (hasta el cap) y leerlo después.
        if ext in (".xlsx", ".xls"):
            with open(out_path, "wb") as fh:
                for chunk in resp.iter_content(CHUNK):
                    fh.write(chunk)
                    downloaded += len(chunk)
                    if downloaded >= max_bytes:
                        truncated = True
                        break
            rows_sampled = None  # se cuenta en el análisis
        else:
            # CSV/TSV: cortamos por filas o por bytes, lo que llegue primero.
            buf = io.StringIO()
            rows_sampled = 0
            for line in resp.iter_lines(decode_unicode=True):
                if line is None:
                    continue
                buf.write(line + "\n")
                downloaded += len(line) + 1
                rows_sampled += 1
                if rows_sampled > args.max_rows or downloaded >= max_bytes:
                    truncated = True
                    break
            with open(out_path, "w", encoding="utf-8", newline="") as fh:
                fh.write(buf.getvalue())
            rows_sampled = max(rows_sampled - 1, 0)  # descontar header

        size = os.path.getsize(out_path)
        if size == 0:
            raise ValueError("El archivo descargado está vacío.")

        result = {
            "path": out_path,
            "url": args.url,
            "format": ext.lstrip("."),
            "bytesDownloaded": size,
            "rowsSampled": rows_sampled,
            "truncated": truncated,
            # Parametros de descarga -> reproducibilidad del sample
            "maxMb": args.max_mb,
            "maxRows": args.max_rows,
            "downloadedAt": datetime.now(timezone.utc).isoformat(),
        }
        print(json.dumps(result, ensure_ascii=False))
    except requests.exceptions.SSLError as exc:
        log(f"ERROR SSL: {exc}")
        print(json.dumps({"error": "El sitio tiene un problema de certificado de seguridad (SSL) y no se puede descargar de forma automática. Descargá el archivo a tu compu y subilo con el botón de arriba."}, ensure_ascii=False))
        sys.exit(1)
    except requests.exceptions.ConnectionError as exc:
        log(f"ERROR conexión: {exc}")
        print(json.dumps({"error": "No se pudo conectar al sitio. Revisá que el enlace funcione, o descargá el archivo y subilo."}, ensure_ascii=False))
        sys.exit(1)
    except requests.exceptions.RequestException as exc:
        log(f"ERROR de red: {exc}")
        print(json.dumps({"error": f"No se pudo descargar el archivo. Probá descargándolo y subiéndolo. ({str(exc)[:120]})"}, ensure_ascii=False))
        sys.exit(1)
    except Exception as exc:
        log(f"ERROR: {exc}")
        print(json.dumps({"error": str(exc)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
