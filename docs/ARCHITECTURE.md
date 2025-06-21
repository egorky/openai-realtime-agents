# Arquitectura del Proyecto: Chat con IA en Tiempo Real

## 1. Resumen General

Este proyecto implementa una solución de chat en tiempo real donde los usuarios finales (clientes) pueden conversar con un agente de IA a través de su navegador. Una interfaz de supervisor permite monitorear conversaciones y gestionar las configuraciones de los agentes de IA. La comunicación en tiempo real (audio y eventos) se maneja mediante el SDK de OpenAI para Agentes en Tiempo Real.

## 2. Componentes Principales

La aplicación se estructura en torno a los siguientes componentes clave:

### 2.1. Interfaz de Cliente (`src/app/client/page.tsx`)
*   **Propósito**: Permite a los usuarios finales interactuar con un agente de IA.
*   **Características**:
    *   Página de selección de escenario antes de iniciar el chat.
    *   Interfaz de transcripción para mostrar el historial de la conversación (mensajes de usuario y IA).
    *   Entrada de texto para enviar mensajes a la IA.
    *   Controles de conexión (Conectar/Desconectar).
    *   Opciones de Push-to-Talk (PTT) y control de reproducción de audio.
    *   Integración con `useRealtimeSession` para la comunicación con el SDK.
*   **Tecnologías**: Next.js (App Router), React, TypeScript, TailwindCSS.

### 2.2. Interfaz de Supervisor (`src/app/supervisor/page.tsx` y `src/app/supervisor/settings/page.tsx`)
*   **Propósito**: Permite a los supervisores monitorear conversaciones, gestionar la configuración de los agentes y escenarios de IA.
*   **Características Principales (`page.tsx` - Dashboard)**:
    *   Visualización de logs de eventos de todas las sesiones.
    *   Filtrado de logs por ID de conversación.
    *   Selección del escenario y agente de IA para "conectar" (monitorear/probar).
    *   Controles de conexión para la sesión de monitoreo del supervisor.
    *   Control de reproducción de audio para escuchar al agente.
    *   Enlace a la página de configuración.
*   **Características de Configuración (`settings/page.tsx`)**:
    *   Gestión CRUD (Crear, Leer, Actualizar, Eliminar) de escenarios.
        *   Cada escenario define: Nombre para mostrar, Nombre de la compañía (para guardrails), y una lista de agentes.
        *   Cada agente define: Nombre, instrucciones (prompt), modelo de IA, voz TTS, y herramientas (funciones).
    *   Edición del metaprompt global para los agentes.
    *   Los cambios se guardan en `localStorage` para persistencia simple entre sesiones del navegador y para reflejarse en el dashboard principal del supervisor.
*   **Tecnologías**: Next.js (App Router), React, TypeScript, TailwindCSS.

### 2.3. API de Sesión (`src/app/api/session/route.ts`)
*   **Propósito**: Generar tokens efímeros (ephemeral keys) necesarios para que el SDK de OpenAI Realtime se conecte a los servidores de OpenAI.
*   **Funcionamiento**: Es un endpoint de API simple que crea y devuelve una clave de sesión efímera. No requiere autenticación robusta en esta implementación de ejemplo, pero en un entorno de producción, esto debería estar protegido.
*   **Tecnologías**: Next.js API Routes.

### 2.4. Configuración de Agentes (`src/app/agentConfigs/`)
*   **Propósito**: Define las configuraciones base para diferentes escenarios y agentes de IA.
*   **Estructura**:
    *   `index.ts`: Exporta un mapa (`allAgentSets` o `supervisorSdkScenarioMap` / `clientSdkScenarioMap` como puntos de partida) de los escenarios disponibles y una clave de escenario por defecto.
    *   Subdirectorios por escenario (ej. `customerServiceRetail/`, `chatSupervisor/`): Contienen las definiciones detalladas de los agentes (`RealtimeAgent`) para ese escenario, incluyendo sus instrucciones, modelos, voces, herramientas y posibles handoffs.
    *   `types.ts`: Exporta tipos relevantes del SDK de OpenAI (ej. `RealtimeAgent`, `FunctionTool`).
    *   `guardrails.ts`: Define funciones para crear guardrails de salida (ej. moderación).
*   **Uso**: Estas configuraciones sirven como punto de partida para la UI del cliente y como estado inicial para la edición en la UI del supervisor.

### 2.5. SDK de OpenAI para Agentes en Tiempo Real (`@openai/agents/realtime`)
*   **Propósito**: Librería principal que maneja la comunicación bidireccional en tiempo real (WebSockets) con los servidores de OpenAI.
*   **Funcionalidades Clave Usadas**:
    *   Establecimiento y gestión de la sesión.
    *   Streaming de audio del usuario al servidor.
    *   Recepción de audio de la IA del servidor.
    *   Envío y recepción de eventos de conversación (mensajes de texto, inicio/fin de habla, handoffs, etc.).
    *   Definición de agentes, sus prompts, modelos, voces y herramientas.
*   **Integración**: A través del hook custom `useRealtimeSession`.

### 2.6. Hooks Personalizados (`src/app/hooks/`)
*   **`useRealtimeSession.ts`**: Encapsula la lógica de interacción con el SDK de OpenAI Realtime. Maneja la conexión, desconexión, envío de mensajes/eventos, y callbacks para cambios de estado y eventos del SDK. Es utilizado tanto por la interfaz del cliente como la del supervisor.
*   **Otros hooks**: Como `useAudioDownload`, `useHandleSessionHistory` (si se usa para persistir o mostrar historial).

### 2.7. Contextos de React (`src/app/contexts/`)
*   **`TranscriptContext.tsx`**: Gestiona el estado de la transcripción de la conversación (mensajes, migas de pan). Usado principalmente por el cliente, pero el supervisor puede usar `addTranscriptBreadcrumb`.
*   **`EventContext.tsx`**: Gestiona el log de todos los eventos (cliente y servidor) que ocurren durante las sesiones. Usado por el supervisor para mostrar la actividad y por ambas interfaces para registrar eventos.

## 3. Flujo de Datos y Comunicación

### 3.1. Inicio de Sesión del Cliente
1.  Cliente accede a `/client`.
2.  Se le presenta la página de selección de escenario (si no hay `agentConfig` en URL).
3.  Cliente selecciona un escenario y procede.
4.  `ClientApp` solicita un token efímero a `/api/session`.
5.  Con el token y la configuración del escenario seleccionado, `useRealtimeSession` establece una conexión vía WebSocket con OpenAI.
6.  El usuario interactúa (voz o texto). El audio/texto se envía a OpenAI.
7.  OpenAI procesa la entrada con el agente configurado (modelo, prompt, herramientas).
8.  La respuesta de la IA (audio y/o eventos de transcripción) se devuelve al cliente.
9.  La transcripción se actualiza. El audio de la IA se reproduce.

### 3.2. Interfaz del Supervisor
1.  Supervisor accede a `/supervisor`.
2.  `SupervisorApp` carga las configuraciones de escenarios (posiblemente modificadas desde `/supervisor/settings` vía `localStorage`) y el metaprompt global.
3.  El supervisor puede ver los logs de eventos de todas las conversaciones en tiempo real a través de `EventContext`.
4.  Puede filtrar los logs por ID de conversación.
5.  Puede seleccionar un escenario y agente para "conectar".
    *   Al conectar, `SupervisorApp` solicita un token efímero y establece una sesión de monitoreo con la configuración seleccionada. Esto permite probar cómo se comporta un agente, escuchar su `greeting` y audio.
6.  Supervisor navega a `/supervisor/settings` para:
    *   Editar el metaprompt global.
    *   Crear, leer, actualizar o eliminar escenarios y sus agentes (modelos, voces, prompts, herramientas).
    *   Los cambios se guardan en `localStorage` y se reflejan en `SupervisorApp` al recargar o volver a la página principal del supervisor.

## 4. Estado y Persistencia (Simplificada)

*   **Estado de la Aplicación**: Principalmente gestionado por React (`useState`, `useReducer`, `useContext`).
*   **Transcripción y Eventos**: Gestionados por `TranscriptContext` y `EventContext`. Son volatiles por sesión de navegador.
*   **Configuraciones de Escenarios del Supervisor**:
    *   Las configuraciones base están en `src/app/agentConfigs/`.
    *   La interfaz del supervisor (`/supervisor/settings`) permite modificar estas configuraciones.
    *   Los cambios realizados se guardan en `localStorage` para que persistan entre recargas de página y se compartan entre el dashboard del supervisor y la página de configuración. Esta es una persistencia simple del lado del cliente. En un sistema de producción, esto se gestionaría mediante un backend y base de datos.
*   **Preferencias de UI**: Algunas preferencias (ej. PTT activado, reproducción de audio) se guardan en `localStorage`.

## 5. Tecnologías Clave
*   **Next.js 14+ (App Router)**: Framework React para la estructura de la aplicación, enrutamiento, y renderizado.
*   **React 18+**: Librería para construir la interfaz de usuario.
*   **TypeScript**: Para tipado estático y mejora de la calidad del código.
*   **TailwindCSS**: Framework CSS para estilizado rápido de la UI.
*   **OpenAI Assistants Realtime SDK (`@openai/agents/realtime`)**: Para la funcionalidad principal de chat en tiempo real.
*   **UUID**: Para generar identificadores únicos.

## 6. Posibles Mejoras Futuras
*   **Backend para Persistencia**: Implementar un backend con base de datos para guardar de forma persistente las configuraciones de escenarios, usuarios, historial de conversaciones, etc.
*   **Autenticación y Autorización**: Añadir un sistema robusto para proteger las interfaces, especialmente la del supervisor y la API de sesión.
*   **Contexto Global para Estado del Supervisor**: Usar un Contexto de React más robusto para gestionar el estado de `editableScenarios` y `editableMetaprompt` entre las páginas del supervisor, eliminando la dependencia de `localStorage` para la sincronización inmediata.
*   **Edición de Herramientas Avanzada**: Mejorar la UI para la definición de herramientas (JSON Schema) en lugar de un `textarea` simple.
*   **Manejo de Errores Mejorado**: UI más informativa para errores de conexión, API, etc.
*   **Testing**: Implementar tests unitarios, de integración y E2E.
*   **Despliegue**: Configuración para despliegue en plataformas como Vercel, AWS, etc.
