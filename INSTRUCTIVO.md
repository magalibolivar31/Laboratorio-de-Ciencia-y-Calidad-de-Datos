# Instructivo de Uso — Laboratorio de Calidad y Ciencia de Datos
**UAI · CAETI** | Universidad Abierta Interamericana  
Centro de Altos Estudios en Tecnología Informática

---

## Índice

1. [Acceso a la plataforma](#1-acceso-a-la-plataforma)
2. [Pantalla de inicio](#2-pantalla-de-inicio)
3. [Registro de usuario](#3-registro-de-usuario)
4. [Recuperar contraseña](#4-recuperar-contraseña)
5. [Búsqueda de datasets](#5-búsqueda-de-datasets)
6. [Diccionario de Keywords](#6-diccionario-de-keywords)
7. [Historial de búsquedas](#7-historial-de-búsquedas)
8. [Mis Exportaciones](#8-mis-exportaciones)
9. [Biblioteca pública de exportaciones](#9-biblioteca-pública-de-exportaciones)
10. [Mis Conexiones API](#10-mis-conexiones-api)
11. [Configuración de perfil](#11-configuración-de-perfil)
12. [Panel de Administración](#12-panel-de-administración)

---

## 1. Acceso a la plataforma

Ingresá a la plataforma desde tu navegador. Verás la pantalla de inicio institucional del Laboratorio.

Para entrar, hacé clic en **INGRESAR AL LABORATORIO** y completá tu email y contraseña en el formulario de login.

> Si es la primera vez, necesitás registrarte primero (ver sección 3).

---

## 2. Pantalla de inicio

La pantalla de inicio muestra la identidad institucional del laboratorio: nombre, institución y las principales capacidades de la plataforma.

Desde acá podés:
- Hacer clic en **INGRESAR AL LABORATORIO** para ir al login

---

## 3. Registro de usuario

En la pantalla de login, hacé clic en **Regístrate aquí**.

Completá:
- **Nombre completo**
- **Email institucional** (ej: `nombre@uai.edu.ar`)
- **Contraseña** (mínimo 6 caracteres)

Al registrarte, el sistema crea automáticamente un conjunto de **diccionarios de keywords por defecto** organizados por temáticas (salud, IA, datos, etc.) para que puedas empezar a buscar de inmediato.

> Los nuevos usuarios tienen el rol **Investigador**. Solo un Administrador puede cambiar roles.

---

## 4. Recuperar contraseña

Si olvidaste tu contraseña:

1. En la pantalla de login, hacé clic en **¿Olvidaste tu contraseña?**
2. Ingresá tu email institucional y hacé clic en **ENVIAR ENLACE DE RECUPERACIÓN**
3. Revisá tu casilla de correo — vas a recibir un email con un botón **RESTABLECER CONTRASEÑA**
4. Hacé clic en el enlace (válido por **1 hora**)
5. Ingresá y confirmá tu nueva contraseña
6. Listo — ya podés iniciar sesión con la nueva contraseña

> Si el enlace expiró, repetí el proceso desde el paso 1.

---

## 5. Búsqueda de datasets

La búsqueda es el módulo central de la plataforma. Accedé desde **Búsqueda** en el menú lateral.

### 5.1 Configurar la búsqueda

El formulario tiene tres campos principales:

| Campo | Descripción |
|---|---|
| **Fuente** | Seleccioná de dónde buscar: todas las fuentes o una específica (Zenodo, Kaggle, Hugging Face, UCI, HealthData.gov) |
| **Diccionario** | Opcionalmente, elegí un diccionario guardado para autocompletar las keywords |
| **Keywords** | Palabras clave separadas por coma. Ej: `diabetes, Argentina, clinical data` |

### 5.2 Lanzar la búsqueda

Hacé clic en **BUSCAR**. El sistema consulta simultáneamente las fuentes seleccionadas (puede tardar hasta 20 segundos).

Durante la búsqueda verás un indicador con las fuentes que se están consultando:
> *Zenodo · Kaggle · Hugging Face · UCI · HealthData.gov*

### 5.3 Reutilizar búsquedas anteriores

Bajo el formulario aparece un acceso a **Búsquedas recientes** con tus últimas consultas. Hacé clic en cualquiera para reutilizar sus keywords y fuente automáticamente.

### 5.4 Filtrar resultados

Una vez que cargan los resultados, el panel de **Filtros** se abre automáticamente. Podés filtrar por:

- **Idioma**: Español, Inglés, Portugués, Francés
- **Formato**: CSV, XLSX, JSON, XML, TXT, Parquet
- **Año de publicación**: rango desde/hasta
- **Año de actualización**: rango desde/hasta
- **Cantidad de registros**: < 1.000 / 1K–10K / 10K–100K / > 100K

Los filtros se aplican instantáneamente del lado del cliente. Para limpiarlos todos, hacé clic en **Limpiar**.

### 5.5 Ver la tabla de resultados

Los resultados aparecen en una tabla con las siguientes columnas:

`Nro · Dataset · Área · Tipo · Fuente · Institución · País · Registros · Formato · Variables · Cant. Variables · Año Pub · Año Act · Link · Idioma · Descripción · Propuesta · Observaciones`

Para ver la tabla más grande, hacé clic en el **ícono de expandir** (⤢) en el encabezado de Resultados. Se abre un popup a pantalla completa con scroll horizontal.

### 5.6 Exportar resultados

Una vez que hay resultados cargados, hacé clic en **EXCEL**.

Se abre un diálogo con las siguientes opciones:

**Nombre de la colección** *(sugerido automáticamente desde tus keywords, editable)*
> Ej: si buscaste `diabetes, salud`, sugiere `Diabetes · Salud`

**Descripción**
- Opcional para exportaciones privadas
- **Obligatoria** para exportaciones públicas

**Visibilidad**
- **Privada**: solo vos podés verla en Mis Exportaciones
- **Pública**: queda disponible en la biblioteca compartida para todos los usuarios

Botones:
- **Guardar y descargar**: guarda en tu historial y descarga el Excel
- **Solo descargar**: descarga el archivo sin guardar en el historial

### 5.7 Gestionar conexiones API personales

En el selector de **Fuente**, hacé clic en **Gestionar APIs** para abrir el panel de conexiones personales (ver sección 10).

---

## 6. Diccionario de Keywords

Accedé desde **Diccionario Keywords** en el menú lateral.

Este módulo permite crear y administrar colecciones de palabras clave organizadas por tema, que luego podés usar directamente en las búsquedas.

### Funcionalidades

**Crear un diccionario**
1. Hacé clic en **NUEVO DICCIONARIO**
2. Asignale un nombre y descripción
3. Guardá

**Agregar keywords a un diccionario**
1. Abrí el diccionario
2. Escribí la keyword y la categoría
3. Hacé clic en **Agregar**

**Usar un diccionario en una búsqueda**
En la pantalla de Búsqueda, desplegá el selector **Diccionario** y elegí el que querés usar. Las keywords se cargan automáticamente en el campo de búsqueda.

**Diccionarios por defecto**
Al registrarte, el sistema crea automáticamente diccionarios temáticos sobre:
- Salud y medicina
- Inteligencia artificial
- Calidad de datos
- Epidemiología
- Neurología, oncología, cardiología, entre otras especialidades

Podés editarlos, agregar palabras o eliminarlos según tus necesidades.

---

## 7. Historial de búsquedas

Accedé desde **Historial** en el menú lateral.

Muestra todas tus búsquedas anteriores con:
- Keywords utilizadas
- Fuente consultada
- Cantidad de resultados obtenidos
- Fecha y hora

Desde cada registro podés **repetir la búsqueda** con un clic o **eliminarla** del historial.

---

## 8. Mis Exportaciones

Accedé desde **Mis Exportaciones** en el menú lateral.

Muestra todas las exportaciones que decidiste guardar, organizadas en tres pestañas:

### Pestaña: Mis exportaciones

Tus propias exportaciones, tanto privadas como públicas.

Cada card muestra:
- Nombre de la colección
- Badge de visibilidad: **Privada** 🔒 o **Pública** 🌐
- Descripción (si la ingresaste)
- Keywords utilizadas
- Fuente consultada
- Cantidad de datasets
- Tamaño del archivo
- Fecha de generación

**Acciones disponibles por exportación:**

| Acción | Descripción |
|---|---|
| **DESCARGAR** | Descarga el archivo Excel |
| **Hacer pública / Hacer privada** | Cambia la visibilidad sin eliminar |
| **REPETIR** | Carga las keywords y fuente en el buscador para repetir la consulta |

### Pestaña: Exportaciones públicas

Exportaciones publicadas por todos los usuarios del laboratorio. Podés ver quién la generó, sus keywords y descargar el archivo.

### Pestaña: Todas

Combinación de tus exportaciones y las públicas de otros usuarios (sin duplicados).

### Buscador

En todas las pestañas podés buscar por **nombre, keywords, descripción o autor** usando el campo de búsqueda.

---

## 9. Biblioteca pública de exportaciones

Las exportaciones marcadas como **Pública** por cualquier usuario forman la **biblioteca compartida** del laboratorio.

Cualquier investigador con acceso a la plataforma puede:
- Explorar las exportaciones disponibles
- Ver los metadatos: nombre, descripción, autor, fecha, keywords, fuente y cantidad de datasets
- Descargar el archivo Excel directamente
- Usar la búsqueda para filtrar por tema, autor o keywords

Esto permite reutilizar trabajos previos y evitar la generación repetitiva de consultas similares.

> Para publicar una exportación, al momento de descargar elegí **Pública** en el selector de visibilidad. Completá nombre y descripción (ambos obligatorios para exportaciones públicas).

---

## 10. Mis Conexiones API

Accedé desde el botón **Gestionar APIs** en la pantalla de Búsqueda.

Por defecto, las búsquedas utilizan las credenciales globales configuradas por el administrador de la plataforma. Este módulo te permite configurar tus **propias credenciales personales** para aprovechar tus límites de uso y permisos específicos.

### Por cada fuente disponible podés:

- **Configurar** tu API Key o Token personal
- **Activar o desactivar** el uso de tus credenciales (sin borrarlas)
  - 🟢 **Mis credenciales** → usa tu key personal en las búsquedas
  - ⚪ **Credenciales de la plataforma** → usa las credenciales globales aunque tengas una key guardada
- **Editar** para actualizar tu key
- **Eliminar** la conexión

### Kaggle

Para Kaggle necesitás dos datos:
- **Usuario**: tu nombre de usuario de Kaggle
- **API Key**: tu key de la API de Kaggle

Ambos los encontrás en `https://www.kaggle.com/settings` → sección **API** → **Create New Token**.

### Seguridad

Las keys nunca se muestran una vez guardadas (aparecen como `••••••••`). Son privadas y solo vos podés acceder a ellas.

---

## 11. Configuración de perfil

Accedé desde **Configuración** en el menú lateral.

### Perfil del Investigador

Podés actualizar tu **nombre completo**. El email y el rol son de solo lectura.

### Cambiar contraseña

Para cambiar tu contraseña necesitás ingresar:
1. Contraseña actual
2. Nueva contraseña (mínimo 6 caracteres)
3. Confirmación de la nueva contraseña

---

## 12. Panel de Administración

> Solo disponible para usuarios con rol **Administrador**.

Accedé desde **Panel Admin** en el menú lateral (visible solo para administradores).

### Pestaña: Usuarios

Muestra todos los usuarios registrados con nombre, email, rol, estado y fecha de registro.

**Acciones:**
- **ROL**: alterna entre `INVESTIGADOR` y `ADMINISTRADOR`
- **ACTIVAR / DESACTIVAR**: habilita o deshabilita el acceso del usuario a la plataforma

### Pestaña: Fuentes de Datos

Gestión de las fuentes disponibles para todos los usuarios.

**Crear nueva fuente**
Hacé clic en **NUEVA FUENTE** y completá:
- Nombre
- Tipo (API, WEB, FTP, MANUAL)
- URL Base
- Descripción
- API Key / Token *(opcional — credencial global de la plataforma para esa fuente)*

**Editar fuente existente**
Hacé clic en el ícono de editar (✏️). Si la fuente ya tiene una API Key guardada, el campo mostrará el aviso correspondiente:
- Dejá el campo vacío → la key actual no cambia
- Ingresá una nueva key → reemplaza la existente

**Activar / Desactivar fuente**
Controla si la fuente aparece disponible para los usuarios en sus búsquedas y en el panel de Mis Conexiones API.

### Pestaña: Auditoría

Registro completo de todas las acciones realizadas en el sistema:
- Logins y registros
- Búsquedas realizadas
- Exportaciones generadas
- Cambios de rol y configuración
- Errores del motor de búsqueda

Cada entrada muestra: fecha, usuario, tipo de acción, entidad afectada y detalle.

---

## Notas técnicas para administradores

### Variables de entorno requeridas (`.env`)

```env
# Base de datos
DATABASE_URL="postgresql://user:password@localhost:5432/tfi_laboratorio"

# Seguridad
JWT_SECRET="clave_secreta_larga"

# API Keys globales (opcionales, se pueden configurar desde el panel admin)
ZENODO_TOKEN="tu_token_de_zenodo"
KAGGLE_KEY="tu_api_key_de_kaggle"
HUGGINGFACE_TOKEN="tu_token_de_huggingface"

# Email para recuperación de contraseña
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT="587"
EMAIL_USER="laboratorio@gmail.com"
EMAIL_PASS="xxxx xxxx xxxx xxxx"  # App Password de Gmail

# URL del frontend (para links en emails)
FRONTEND_URL="https://tu-dominio.com"

# Python
PYTHON_PATH="python"
```

### Prioridad de credenciales en búsquedas

Cuando un usuario realiza una búsqueda, el sistema aplica las credenciales en este orden:

1. **Credencial personal activa** del usuario (configurada en Mis Conexiones API)
2. **API Key global** de la fuente (configurada en el Panel Admin)
3. **Variable de entorno** del servidor (`.env`)

---

*Laboratorio de Calidad y Ciencia de Datos — CAETI, UAI*  
*Av. Montes de Oca 745, CABA*
