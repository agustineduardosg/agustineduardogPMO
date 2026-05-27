# 🏥 Smart Project Manager - Bupa Chile PMO & Clínicas

¡Bienvenido al **Smart Project Manager**! Esta es una plataforma web enterprise diseñada a medida para el control y seguimiento centralizado de la cartera de proyectos de la Oficina de Gestión de Proyectos (PMO) y la calibración y puesta en marcha de equipamiento clínico biomédico en las sedes y clínicas de Bupa Chile.

La plataforma está optimizada para ofrecer un rendimiento de nivel de escritorio, interactividad fluida, alta concurrencia transaccional e integridad de datos multidispositivo.

---

## 📖 Documentación Detallada

Para comprender a fondo la arquitectura, el modelo de datos, los algoritmos de cálculo ponderado y la estrategia de despliegue en VPS, consulta el manual maestro:

👉 **[DOCUMENTACION.md](file:///c:/Users/agust/OneDrive/Desktop/Paginas/Aplicaciones/Agustineduardo%20Project%20V1/smart_project_manager/DOCUMENTACION.md)**

---

## 🚀 Características Clave

- 🏛️ **Arquitectura Next.js & Prisma:** Implementación fluida utilizando React Server Components, TypeScript y SQLite de alto rendimiento.
- ⚡ **Motor de Base de Datos Concurrente (WAL):** Configurado con Write-Ahead Logging y optimizaciones de caché para eliminar bloqueos de base de datos bajo múltiples coordinadores simultáneos.
- 📊 **Cálculo Ponderado PMBOK WBS:** Algoritmo matemático real (Bottom-Up) que calcula los avances consolidados de proyectos y fases ponderados por duración física, evitando duplicidades.
- 🔄 **Smart Polling Multidispositivo:** Sincronización activa en segundo plano cada 15s que se pausa inteligentemente si la pestaña del navegador está oculta, protegiendo los recursos de red del servidor.
- 💬 **Historial de Observaciones Clínicas:** Bitácora en forma de línea de tiempo con retrocompatibilidad JSON que parsea notas históricas heredadas sin peligro de pérdida de datos.
- 🗂️ **Visualizador Gantt Avanzado:** Acordeón recursivo con transiciones fluidas de Framer Motion, selector rápido de proyectos y edición de plazos con doble clic.

---

## 🛠️ Comenzando (Desarrollo Local)

### 1. Clonar el repositorio e instalar dependencias:
```bash
npm install
```

### 2. Configurar Variables de Entorno:
Crea un archivo `.env` en la raíz del proyecto y agrega:
```env
DATABASE_URL="file:./dev.db?connection_limit=1&socket_timeout=10000&busy_timeout=10000"
```

### 3. Levantar la base de datos y migrar esquema:
```bash
npx prisma generate
npx prisma db push
```

### 4. Ejecutar el servidor de desarrollo:
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver la aplicación ejecutándose.

---

## 📦 Despliegue en VPS (Easypanel)

La base de datos SQLite física (`prisma/dev.db`) se resguarda contra redespliegues utilizando un volumen permanente en Docker:
1. Crea un volumen persistente apuntando al path `/app/prisma`.
2. Asigna la variable de entorno `DATABASE_URL` correspondiente.
3. Despliega la aplicación con Nixpacks en producción.

*Para instrucciones detalladas paso a paso del VPS, consulta el archivo [DOCUMENTACION.md](file:///c:/Users/agust/OneDrive/Desktop/Paginas/Aplicaciones/Agustineduardo%20Project%20V1/smart_project_manager/DOCUMENTACION.md).*
