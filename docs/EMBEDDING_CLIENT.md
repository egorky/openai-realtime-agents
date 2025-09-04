# Embeber la Interfaz del Cliente en otra Página Web

Este documento describe cómo puedes embeber la interfaz del cliente de chat con IA en una página web existente, por ejemplo, como un widget de chat en la esquina.

## 1. Método de Embebido: `<iframe>`

La forma estándar de embeber una aplicación web dentro de otra es utilizando un elemento HTML `<iframe>`.

**Ejemplo Básico:**
```html
<iframe id="aiChatWidget" src="https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>/client" width="370" height="600" style="border: none;"></iframe>
```
Reemplaza `https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>/client` con la URL real donde tu aplicación cliente está desplegada y accesible.

## 2. Configuración mediante Parámetros URL

Puedes controlar la apariencia y el comportamiento inicial de la interfaz del cliente embebida mediante parámetros en la URL del `src` del iframe:

*   **`displayMode=widget`**: Activa el modo widget, que optimiza la interfaz para un espacio más pequeño y muestra un header específico para widgets.
    *   Ejemplo: `https://.../client?displayMode=widget`

*   **`agentConfig=<scenario_key>`**: Preselecciona un escenario de conversación específico. El `<scenario_key>` debe coincidir con una de las claves definidas en `clientSdkScenarioMap` en `src/app/client/page.tsx` (ej. `customerServiceRetail`, `simpleHandoff`).
    *   Ejemplo: `https://.../client?agentConfig=customerServiceRetail`

**URL Completa para un Widget con Escenario Preseleccionado:**
```
https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>/client?displayMode=widget&agentConfig=customerServiceRetail
```

## 3. Estilizando el `<iframe>` (Desde la Página Contenedora)

Para que el iframe se comporte como un widget de chat (ej. un pop-up en la esquina inferior derecha), necesitarás aplicar estilos CSS al elemento `<iframe>` desde tu página contenedora.

**Ejemplo CSS:**
```css
#aiChatWidget {
  position: fixed;
  bottom: 20px;
  right: 20px;
  width: 370px; /* Ancho recomendado para el modo widget */
  height: 600px; /* Altura recomendada para el modo widget */
  border: 1px solid #ccc;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  overflow: hidden; /* Asegura que el contenido del iframe no se desborde visualmente */
  z-index: 9999; /* Para asegurar que esté por encima de otros contenidos */
}

/* Estilos adicionales para un botón de "toggle" que muestre/oculte el widget */
#toggleChatButton {
  position: fixed;
  bottom: 20px;
  right: 20px;
  /* Estilos para tu botón de toggle */
}
```
**Nota**: El posicionamiento y la visibilidad del widget (si se puede mostrar/ocultar con un botón) deben ser manejados por la página contenedora.

## 4. Consideraciones para Embebido Cross-Domain

Si la página contenedora y la aplicación cliente de chat están en **dominios diferentes** (ej. tu sitio web `www.empresa.com` y la app de chat en `chat.empresa-ia.com`):

*   **Accesibilidad de la App Cliente**: La URL de la aplicación cliente (`src` del iframe) debe ser públicamente accesible o accesible desde la red donde se visualiza la página contenedora.
*   **Cabeceras HTTP del Servidor de la App Cliente**: El servidor que aloja tu aplicación Next.js (la interfaz del cliente) no debe enviar cabeceras HTTP que prohíban el embebido en iframes desde otros dominios. Las cabeceras relevantes son:
    *   `X-Frame-Options`: No debe estar configurada como `DENY` o `SAMEORIGIN` (si los dominios son diferentes).
    *   `Content-Security-Policy`: La directiva `frame-ancestors` no debe restringir el dominio de tu página contenedora. Por ejemplo, `frame-ancestors 'self' https://www.empresa.com;` permitiría embeber solo en el mismo dominio o en `www.empresa.com`.
    *   **Nota**: Por defecto, Next.js no establece estas cabeceras de forma restrictiva. Sin embargo, tu plataforma de despliegue (Vercel, AWS, etc.) o configuraciones de servidor personalizadas podrían añadirlas. Verifica la configuración de tu entorno de despliegue.
    *   **HTTPS**: Es altamente recomendable (y a menudo requerido por los navegadores para APIs sensibles como micrófono y portapapeles) que tanto la página contenedora como la aplicación cliente embebida se sirvan a través de HTTPS.

## 5. Permisos del Iframe (`Permissions-Policy` / Atributo `allow`)

Para que la funcionalidad completa del widget de chat (incluyendo audio PTT y copia al portapapeles) funcione correctamente, especialmente en contextos cross-origin, es crucial configurar los permisos adecuados en el tag `<iframe>` usando el atributo `allow` (que implementa la `Permissions-Policy`).

**Permisos Recomendados:**

*   `microphone`: Necesario para la funcionalidad Push-to-Talk (PTT) si el usuario va a enviar audio.
*   `clipboard-write`: Necesario para que funcione el botón "Copiar Transcripción".
*   `autoplay`: Puede ser necesario para que el audio del agente de IA se reproduzca automáticamente sin interacción previa del usuario *dentro del iframe*. Las políticas de autoplay de los navegadores son estrictas.
*   `camera`: Solo si en el futuro se añade funcionalidad de video.
*   `fullscreen`: Si se quisiera implementar una maximización que haga que el *iframe mismo* ocupe toda la pantalla (en lugar de abrir una nueva pestaña).

**Ejemplo de Tag `<iframe>` con Políticas de Permisos:**
```html
<iframe
    id="aiChatWidget"
    src="https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>/client?displayMode=widget"
    width="370"
    height="600"
    style="border: none;"
    allow="microphone; clipboard-write; autoplay"
    title="Asistente de Chat IA">
</iframe>
```
**Nota sobre `sandbox`**: Si utilizas el atributo `sandbox` en tu iframe por razones de seguridad, asegúrate de incluir los valores necesarios para que la aplicación funcione, como mínimo: `allow-scripts`, `allow-same-origin` (si es aplicable y deseado), `allow-forms`, `allow-popups` (para el botón de maximizar que abre nueva pestaña), `allow-modals`. Un `sandbox` demasiado restrictivo puede romper la funcionalidad del SDK de OpenAI y otras APIs del navegador, llevando a errores como `Cannot read properties of undefined (reading 'bind')` si el SDK no puede inicializar correctamente sus shims o acceder a APIs globales esperadas. Para depuración, considera temporalmente eliminar el atributo `sandbox` o usar una política muy permisiva para ver si el error desaparece, y luego restríngelo progresivamente.

**Problemas Comunes de SDK en Iframes**: Errores como `Cannot read properties of undefined (reading 'bind')` que se originan en los "shims" del SDK de OpenAI suelen indicar que el SDK no puede detectar o usar correctamente las APIs del navegador necesarias (WebSocket, Fetch, AudioContext, etc.) dentro del entorno del iframe. Esto es a menudo debido a:
1.  Políticas de permisos (`allow` atributo) insuficientes.
2.  Un atributo `sandbox` demasiado restrictivo.
3.  Políticas de Seguridad de Contenido (CSP) tanto de la página contenedora como de la página del widget.
4.  Que la página del widget no se sirva sobre HTTPS (muchas APIs sensibles lo requieren).
Asegurar una configuración permisiva para estos puntos es crucial.

## 6. Funcionalidad "Maximizar" del Widget

Cuando la interfaz del cliente se carga en modo widget (`?displayMode=widget`), muestra un header simplificado que incluye un botón "Maximizar" (o un icono de pantalla completa).

*   Al hacer clic en este botón, la interfaz del cliente se abrirá en una **nueva pestaña del navegador**, utilizando la URL base `/client?displayMode=full` (y añadiendo `&agentConfig=<scenario_key>&conversationId=<conversation_id>` si un escenario y una conversación ya estaban activos en el widget).
*   Esto proporciona al usuario una vista a pantalla completa de la interfaz de chat si lo desea. La sesión del SDK de Realtime será nueva en la pestaña maximizada; no se transfiere la sesión activa.

## 7. Comunicación Avanzada Host <-> iframe (Conceptual)

Para funcionalidades más avanzadas, como:
*   Que el widget notifique a la página contenedora para cerrarse o cambiar de tamaño.
*   Que la página contenedora envíe datos de configuración al widget después de cargado.

Se puede utilizar `window.postMessage` API. Esto requiere implementar escuchas de mensajes (`window.addEventListener('message', ...)`) tanto en la página contenedora como dentro de la aplicación cliente.

**Ejemplo (Widget envía mensaje al host):**
```javascript
// Dentro del WidgetHeader.tsx o similar, si se quisiera un botón de cerrar controlado por el host
const handleRequestClose = () => {
  window.parent.postMessage({ type: 'aiChatWidgetCloseRequest' }, 'https://<URL_PAGINA_CONTENEDORA>');
};
```

**Ejemplo (Página contenedora escucha):**
```javascript
window.addEventListener('message', (event) => {
  // Siempre verificar event.origin por seguridad
  if (event.origin !== 'https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>') {
    return;
  }

  if (event.data && event.data.type === 'aiChatWidgetCloseRequest') {
    // Lógica para ocultar/eliminar el iframe del widget
    const iframe = document.getElementById('aiChatWidget');
    if (iframe) {
      iframe.style.display = 'none';
    }
  }
});
```
Esta comunicación avanzada no está completamente implementada en la versión actual del widget más allá del botón "Maximizar" que abre una nueva pestaña.

## 8. Ejemplo Completo de Página Contenedora (Simple)

```html
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Página con Widget de Chat IA</title>
    <style>
        body { font-family: sans-serif; margin: 0; padding: 0; }
        .content { padding: 20px; }
        #aiChatWidget {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 370px;
            height: 600px; /* Ajusta según el max-h del widget */
            border: 1px solid #ddd;
            border-radius: 10px;
            box-shadow: 0 5px 15px rgba(0,0,0,0.2);
            display: none; /* Inicialmente oculto, se muestra con el botón */
            z-index: 1000;
        }
        #toggleChatButton {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 10px 15px;
            background-color: #007bff;
            color: white;
            border: none;
            border-radius: 50%; /* Para un botón circular */
            cursor: pointer;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1001; /* Encima del widget si está oculto */
            width: 60px;
            height: 60px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <div class="content">
        <h1>Bienvenido a Nuestra Página</h1>
        <p>Contenido principal de la página...</p>
    </div>

    <button id="toggleChatButton" title="Abrir Chat">
        <!-- Icono de Chat SVG o FontAwesome, ejemplo simple con texto -->
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
    </button>

    <iframe
        id="aiChatWidget"
        src="https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>/client?displayMode=widget&agentConfig=customerServiceRetail"
        title="Asistente de Chat IA">
    </iframe>

    <script>
        const toggleButton = document.getElementById('toggleChatButton');
        const chatWidget = document.getElementById('aiChatWidget');
        let widgetOpen = false;

        toggleButton.addEventListener('click', () => {
            widgetOpen = !widgetOpen;
            if (widgetOpen) {
                chatWidget.style.display = 'block';
                // Opcional: ocultar el botón de toggle o cambiar su icono
                // toggleButton.style.display = 'none';
            } else {
                // Esta lógica sería para un botón de cerrar DENTRO del widget que envíe postMessage
                // o si el botón de toggle también sirve para cerrar.
                 chatWidget.style.display = 'none';
            }
        });

        // Escuchar mensajes del iframe (ej. para cerrar desde el widget)
        // window.addEventListener('message', (event) => {
        //   if (event.origin === 'https://<URL_DE_TU_APP_CLIENTE_DESPLEGADA>') {
        //     if (event.data && event.data.type === 'aiChatWidgetCloseRequest') {
        //       chatWidget.style.display = 'none';
        //       widgetOpen = false;
        //       // toggleButton.style.display = 'block'; // Mostrar botón de toggle de nuevo
        //     }
        //   }
        // });
    </script>
</body>
</html>
```

Reemplaza `<URL_DE_TU_APP_CLIENTE_DESPLEGADA>` con la URL real. Este ejemplo muestra un botón flotante que alterna la visibilidad del iframe del widget.
