# Edición de Escenarios por Línea de Comandos (CLI)

Este documento describe cómo se podrían gestionar las configuraciones de escenarios del supervisor mediante archivos locales y scripts, como una alternativa o complemento a la edición mediante la interfaz de usuario. Esta aproximación permite un control de versiones más robusto y la posibilidad de generar configuraciones complejas mediante programación.

## Formato de Archivo para Escenarios

Se recomienda usar archivos JSON para definir los escenarios. Cada archivo podría representar un conjunto de escenarios o un único escenario. La estructura debería reflejar el objeto `supervisorSdkScenarioMap` usado internamente.

**Ejemplo de estructura para un archivo `scenarios.json`:**

```json
{
  "customerServiceRetail": {
    "displayName": "Customer Service (Retail)",
    "companyName": "Snowy Peak Boards",
    "scenario": [
      {
        "name": "authentication",
        "instructions": "You are an authentication agent...",
        "model": "gpt-4o-mini-realtime-preview",
        "voice": "alloy",
        "tools": [
          {
            "type": "function",
            "function": {
              "name": "authenticate_user_information",
              "description": "Verifies user information.",
              "parameters": {
                "type": "object",
                "properties": {
                  "phone_number": {"type": "string"},
                  "last_4_digits": {"type": "string"},
                  "last_4_digits_type": {"type": "string", "enum": ["credit_card", "ssn"]},
                  "date_of_birth": {"type": "string", "pattern": "^\\\\d{4}-\\\\d{2}-\\\\d{2}$"}
                },
                "required": ["phone_number", "date_of_birth", "last_4_digits", "last_4_digits_type"]
              }
            }
          }
        ]
      },
      {
        "name": "salesAgent",
        "instructions": "You are a sales agent...",
        "model": "gpt-4o-mini-realtime-preview",
        "voice": "nova",
        "tools": []
      }
    ]
  },
  "simpleHandoff": {
    "displayName": "Simple Handoff (Haiku)",
    "companyName": "Haiku Services Inc.",
    "scenario": [
      {
        "name": "greeter",
        "instructions": "Greet the user and ask if they want a haiku.",
        "model": "gpt-4o-mini-realtime-preview",
        "voice": "echo",
        "tools": [],
        "handoffs": ["haikuWriter"]
      },
      {
        "name": "haikuWriter",
        "instructions": "Write a haiku on a given topic.",
        "model": "gpt-4o-mini-realtime-preview",
        "voice": "fable",
        "tools": []
      }
    ]
  }
}
```

**Campos Clave por Agente (`RealtimeAgent`):**

*   `name` (string, requerido): Identificador único del agente dentro del escenario.
*   `instructions` (string, opcional): Prompt principal o instrucciones para el agente.
*   `model` (string, opcional): Modelo de OpenAI a usar (ej. "gpt-4o-mini-realtime-preview"). Si no se especifica, el SDK usa un valor por defecto.
*   `voice` (string, opcional): Voz de TTS de OpenAI (ej. "alloy", "echo", "fable", "onyx", "nova", "shimmer").
*   `tools` (array, opcional): Lista de `FunctionTool` disponibles para el agente.
    *   Cada herramienta debe tener `type: "function"` y un objeto `function` con `name`, `description` (opcional), y `parameters` (JSON Schema).
*   `greeting` (string, opcional): Saludo inicial que el agente dirá al inicio de la sesión o al hacer handoff a este agente.
*   `handoffs` (array de strings, opcional): Lista de nombres de otros agentes a los que este agente puede transferir la conversación. (Nota: En la implementación actual del SDK, los `handoffs` se configuran con instancias de `RealtimeAgent`, lo que es más complejo de representar directamente en JSON puro si se quiere mantener la modularidad. Una alternativa es usar nombres y resolverlos en tiempo de carga).
*   `handoffDescription` (string, opcional): Descripción del agente para cuando otros agentes consideran hacer handoff a este.

## Proceso de Actualización (Conceptual)

Un script (ej. Node.js o Python) podría:

1.  **Leer** uno o más archivos JSON de configuración de escenarios.
2.  **Validar** la estructura de los datos leídos contra el schema esperado para `RealtimeAgent` y `FunctionTool`.
3.  **Generar/Actualizar Código Fuente**:
    *   El script podría modificar directamente los archivos TypeScript donde se definen `supervisorSdkScenarioMap` (en `src/app/supervisor/page.tsx` o donde se inicialice) y `clientSdkScenarioMap` (en `src/app/client/page.tsx`).
    *   Alternativamente, podría generar un archivo TypeScript (ej. `src/app/agentConfigs/generatedScenarios.ts`) que exporte los mapas de escenarios, y los archivos principales importarían desde este archivo generado. Esto es generalmente un enfoque más limpio.

**Ejemplo (Pseudo-código para generar un archivo):**

```typescript
// En un script generador (fuera de la app Next.js, ejecutado en tiempo de desarrollo)

const fs = require('fs');
const path = require('path');

const scenariosData = JSON.parse(fs.readFileSync('path/to/your/scenarios.json', 'utf-8'));

let outputContent = "// Auto-generado por script de escenarios\n";
outputContent += "import type { RealtimeAgent } from '@openai/agents/realtime';\n\n";

// Para supervisorSdkScenarioMap
outputContent += "export const generatedSupervisorSdkScenarioMap = {\n";
for (const key in scenariosData) {
  const scenarioConfig = scenariosData[key];
  outputContent += `  "${key}": {
    displayName: "${scenarioConfig.displayName}",
    companyName: "${scenarioConfig.companyName}",
    scenario: ${JSON.stringify(scenarioConfig.scenario, null, 2).replace(/\n/g, '\n    ')},
  },\n`;
}
outputContent += "};\n\n";

// Similarmente para clientSdkScenarioMap si se gestiona desde el mismo JSON
// (filtrando o usando una sección diferente del JSON)

fs.writeFileSync(path.join(__dirname, '../src/app/agentConfigs/generatedScenarios.ts'), outputContent);

console.log('Archivo de escenarios generado!');
```

Luego, en `src/app/supervisor/page.tsx`:
```typescript
import { generatedSupervisorSdkScenarioMap } from '@/app/agentConfigs/generatedScenarios';
// ...
const supervisorSdkScenarioMap = generatedSupervisorSdkScenarioMap;
// ...
```

## Consideraciones

*   **Validación de Esquema**: Es crucial validar los archivos JSON contra un esquema definido para evitar errores en tiempo de ejecución. Se pueden usar librerías como Ajv.
*   **Manejo de Handoffs**: Si se representan los `handoffs` por nombre en JSON, el script o la lógica de carga en la aplicación necesitaría resolver estos nombres a las instancias de agentes correctas dentro de cada escenario. La estructura actual del SDK donde `RealtimeAgent` toma instancias de otros agentes en su constructor para `handoffs` hace que la representación JSON directa sea un poco más compleja si se quiere evitar la duplicación de definiciones de agentes.
*   **Metaprompt Global**: El metaprompt global podría gestionarse como un archivo de texto simple (`.txt` o `.md`) y leerse por el script para incluirlo en la configuración, o directamente en la aplicación.

Este enfoque CLI/basado en archivos permite una gestión más sistemática y versionable de las configuraciones de los agentes, especialmente útil a medida que la complejidad y el número de escenarios crecen.
La UI de edición en la página `/supervisor/settings` podría entonces opcionalmente leer/escribir a `localStorage` como un _override_ temporal para pruebas rápidas, pero los archivos JSON serían la "fuente de verdad".
