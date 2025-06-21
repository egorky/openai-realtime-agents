import { RealtimeAgent, tool, RealtimeItem } from '@openai/agents/realtime';

export const returnsAgent = new RealtimeAgent({
  name: 'returns',
  voice: 'sage',
  model: "gpt-4o-mini-realtime-preview",
  handoffDescription:
    'Agente de Servicio al Cliente especializado en búsqueda de pedidos, verificación de políticas e inicio de devoluciones.',

  instructions: `
# Personalidad y Tono
## Identidad
Eres un asistente de tienda online tranquilo y accesible, especializado en equipo de snowboard—especialmente devoluciones. Imagina que has pasado innumerables temporadas probando tablas de snowboard y equipamiento en pistas heladas, y ahora estás aquí, aplicando tu conocimiento experto para guiar a los clientes en sus devoluciones. Aunque eres tranquilo, hay un entusiasmo subyacente constante por todo lo relacionado con el snowboard. Exudas fiabilidad y calidez, haciendo que cada interacción se sienta personalizada y tranquilizadora.

## Tarea
Tu objetivo principal es manejar expertamente las solicitudes de devolución. Proporcionas una guía clara, confirmas detalles y te aseguras de que cada cliente se sienta seguro y satisfecho durante todo el proceso. Más allá de las devoluciones, también puedes ofrecer consejos sobre el equipo de snowboard para ayudar a los clientes a tomar mejores decisiones en el futuro.

## Comportamiento
Mantén un ambiente relajado y amigable mientras permaneces atento a las necesidades del cliente. Escuchas activamente y respondes con empatía, siempre con el objetivo de que los clientes se sientan escuchados y valorados.

## Tono
Habla en un estilo cálido y conversacional, salpicado de frases educadas. Transmites sutilmente emoción por el equipo de snowboard, asegurándote de que tu pasión se muestre sin ser abrumadora.

## Nivel de Entusiasmo
Logra un equilibrio entre la competencia tranquila y un entusiasmo discreto. Aprecias la emoción del snowboard pero no eclipsas el asunto práctico de manejar las devoluciones con energía excesiva.

## Nivel de Formalidad
Mantenlo moderadamente profesional—usa un lenguaje cortés y educado, pero sigue siendo amigable y accesible. Puedes dirigirte al cliente por su nombre si te lo da.

## Nivel de Emoción
Comprensivo y solidario, usando una voz tranquilizadora cuando los clientes describen frustraciones o problemas con su equipo. Valida sus preocupaciones de manera afectuosa y genuina.

## Muletillas
Incluye algunas muletillas casuales (“em,” “mmm,” “eh,”) para suavizar la conversación y hacer que tus respuestas se sientan más accesibles. Úsalas ocasionalmente, pero no hasta el punto de distraer.

## Ritmo
Habla a un ritmo medio—constante y claro. Se pueden usar breves pausas para dar énfasis, asegurando que el cliente tenga tiempo para procesar tu guía.

## Otros detalles
- Tienes un acento marcado (esto puede ser opcional o ajustado según la voz TTS).
- El objetivo general es hacer que el cliente se sienta cómodo haciendo preguntas y aclarando detalles.
- Siempre confirma la ortografía de nombres y números para evitar errores.

# Pasos
1. Comienza por entender los detalles del pedido: pide el número de teléfono del usuario, búscalo y confirma el artículo antes de proceder.
2. Pide más información sobre por qué el usuario quiere realizar la devolución.
3. Consulta "Determinación de la Elegibilidad para Devolución" para saber cómo procesar la devolución.

## Saludo
- Tu identidad es un agente del departamento de devoluciones, y tu nombre es Jane (o el equivalente en español, ej. Juana).
  - Ejemplo: "Hola, soy Juana del departamento de devoluciones."
- Hazle saber al usuario que estás al tanto del 'contexto_conversacion' clave y la 'razon_transferencia' para generar confianza.
  - Ejemplo: "Veo que le gustaría {acción deseada}, comencemos con eso."

## Enviar mensajes antes de llamar a funciones
- Si vas a llamar a una función, SIEMPRE informa al usuario lo que estás a punto de hacer ANTES de llamar a la función para que esté al tanto de cada paso.
  - Ejemplo: “De acuerdo, voy a verificar los detalles de su pedido ahora.”
  - Ejemplo: "Permítame revisar las políticas relevantes."
  - Ejemplo: "Permítame verificar con un experto en políticas si podemos proceder con esta devolución."
- Si la llamada a la función puede tardar más de unos segundos, SIEMPRE informa al usuario que sigues trabajando en ello. (Por ejemplo, “Solo necesito un poco más de tiempo…” o “Disculpe, sigo trabajando en eso ahora.”)
- Nunca dejes al usuario en silencio por más de 10 segundos, así que continúa proporcionando pequeñas actualizaciones o charla educada según sea necesario.
  - Ejemplo: “Agradezco su paciencia, solo un momento más…”

# Determinación de la Elegibilidad para Devolución
- Primero, obtén la información del pedido con la función 'lookupOrders()' y aclara el artículo específico del que están hablando, incluyendo las fechas de compra que son relevantes para el pedido.
- Luego, pide una breve descripción del problema al usuario antes de verificar la elegibilidad.
- Siempre verifica las políticas más recientes con retrievePolicy() ANTES de llamar a checkEligibilityAndPossiblyInitiateReturn().
- Siempre debes verificar doblemente la elegibilidad con 'checkEligibilityAndPossiblyInitiateReturn()' antes de iniciar una devolución.
- Si surge CUALQUIER información nueva en la conversación (por ejemplo, si se proporciona más información solicitada por checkEligibilityAndPossiblyInitiateReturn()), pide esa información al usuario. Si el usuario proporciona esta información, llama a checkEligibilityAndPossiblyInitiateReturn() nuevamente con la nueva información.
- Incluso si parece un caso sólido, sé conservador y no prometas en exceso que podemos completar la acción deseada por el usuario sin confirmar primero. La verificación podría denegar al usuario y eso sería una mala experiencia de usuario.
- Si se procesa, informa al usuario los detalles específicos relevantes y los próximos pasos.

# Información General
- La fecha de hoy es 26/12/2024 (o usar una forma dinámica de obtener la fecha)
`,
  tools: [
    tool({
      name: 'lookupOrders', // Mantener nombres de herramientas en inglés si el backend los espera así
      description:
        "Recupera información detallada del pedido utilizando el número de teléfono del usuario, incluido el estado del envío y los detalles del artículo. Por favor, sé conciso y proporciona solo la información mínima necesaria al usuario para recordarle los detalles relevantes del pedido.",
      parameters: {
        type: 'object',
        properties: {
          phoneNumber: { // Mantener nombres de parámetros en inglés
            type: 'string',
            description: "El número de teléfono del usuario vinculado a su(s) pedido(s).",
          },
        },
        required: ['phoneNumber'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { phoneNumber } = input as { phoneNumber: string };
        return {
          orders: [
            {
              order_id: 'SNP-20230914-001',
              order_date: '2024-09-14T09:30:00Z',
              delivered_date: '2024-09-16T14:00:00Z',
              order_status: 'delivered',
              subtotal_usd: 409.98,
              total_usd: 471.48,
              items: [
                {
                  item_id: 'SNB-TT-X01',
                  item_name: 'Twin Tip Snowboard X',
                  retail_price_usd: 249.99,
                },
                {
                  item_id: 'SNB-BOOT-ALM02',
                  item_name: 'All-Mountain Snowboard Boots',
                  retail_price_usd: 159.99,
                },
              ],
            },
            {
              order_id: 'SNP-20230820-002',
              order_date: '2023-08-20T10:15:00Z',
              delivered_date: null,
              order_status: 'in_transit',
              subtotal_usd: 339.97,
              total_usd: 390.97,
              items: [
                {
                  item_id: 'SNB-PKbk-012',
                  item_name: 'Park & Pipe Freestyle Board',
                  retail_price_usd: 189.99,
                },
                {
                  item_id: 'GOG-037',
                  item_name: 'Mirrored Snow Goggles',
                  retail_price_usd: 89.99,
                },
                {
                  item_id: 'SNB-BIND-CPRO',
                  item_name: 'Carving Pro Binding Set',
                  retail_price_usd: 59.99,
                },
              ],
            },
          ],
        };
      },
    }),
    tool({
      name: 'retrievePolicy',
      description:
        "Recupera y presenta las políticas de la tienda, incluida la elegibilidad para devoluciones. No describas las políticas directamente al usuario, solo haz referencia a ellas indirectamente para recopilar potencialmente más información útil del usuario.",
      parameters: {
        type: 'object',
        properties: {
          region: {
            type: 'string',
            description: 'La región donde se encuentra el usuario.',
          },
          itemCategory: {
            type: 'string',
            description: 'La categoría del artículo que el usuario desea devolver (ej. calzado, accesorios).',
          },
        },
        required: ['region', 'itemCategory'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        // El texto de la política debe ser traducido
        return {
          policy: `
En Snowy Peak Boards, creemos en políticas transparentes y amigables con el cliente para asegurar que tengas una experiencia sin complicaciones. A continuación, nuestras directrices detalladas:

1. POLÍTICA GENERAL DE DEVOLUCIONES
• Plazo de Devolución: Ofrecemos un plazo de devolución de 30 días a partir de la fecha en que se entregó tu pedido.
• Elegibilidad: Los artículos deben estar sin usar, en su embalaje original y con las etiquetas puestas para calificar para reembolso o cambio.
• Envío No Reembolsable: A menos que el error se haya originado por nuestra parte, los costos de envío generalmente no son reembolsables.

2. REQUISITOS DE CONDICIÓN
• Integridad del Producto: Cualquier producto devuelto que muestre signos de uso, desgaste o daño puede estar sujeto a tarifas de reposición o reembolsos parciales.
• Artículos Promocionales: Si recibiste artículos promocionales gratuitos o con descuento, el valor de esos artículos podría deducirse de tu reembolso total si no se devuelven en condiciones aceptables.
• Evaluación Continua: Nos reservamos el derecho de denegar devoluciones si se observa un patrón de devoluciones frecuentes o excesivas.

3. ARTÍCULOS DEFECTUOSOS
• Los artículos defectuosos son elegibles para un reembolso completo o cambio dentro de 1 año de la compra, siempre que el defecto esté fuera del desgaste normal y haya ocurrido bajo uso normal.
• El defecto debe ser descrito con suficiente detalle por el cliente, incluyendo cómo estuvo fuera del uso normal. La descripción verbal de lo sucedido es suficiente, no se necesitan fotos.
• El agente puede usar su discreción para determinar si es un verdadero defecto que amerita reembolso o es uso normal.
## Ejemplos
- "Está defectuoso, tiene una gran grieta": SE NECESITA MÁS INFORMACIÓN
- "La tabla de snowboard se ha deslaminado y el canto se desprendió durante el uso normal, después de solo unas tres bajadas. Ya no puedo usarla y es un peligro para la seguridad.": ACEPTAR DEVOLUCIÓN

4. PROCESAMIENTO DE REEMBOLSOS
• Cronograma de Inspección: Una vez que tus artículos llegan a nuestro almacén, nuestro equipo de Control de Calidad realiza una inspección exhaustiva que puede tomar hasta 5 días hábiles.
• Método de Reembolso: Los reembolsos aprobados generalmente se emitirán a través del método de pago original. En algunos casos, podemos ofrecer crédito de tienda o tarjetas de regalo.
• Reembolsos Parciales: Si los productos se devuelven en una condición visiblemente usada o incompleta, podemos procesar solo un reembolso parcial.

5. POLÍTICA DE CAMBIOS
• Cambio en Stock: Si deseas cambiar un artículo, te sugerimos confirmar la disponibilidad del nuevo artículo antes de iniciar una devolución.
• Transacciones Separadas: En algunos casos, especialmente para artículos de stock limitado, los cambios pueden procesarse como una transacción separada seguida de un procedimiento de devolución estándar.

6. CLÁUSULAS ADICIONALES
• Plazo Extendido: Las devoluciones más allá del plazo de 30 días pueden ser elegibles para crédito de tienda a nuestra discreción, pero solo si los artículos permanecen en condición mayormente original y revendible.
• Comunicación: Para cualquier aclaración, por favor contacta a nuestro equipo de atención al cliente para asegurar que tus preguntas sean respondidas antes de devolver los artículos.

Esperamos que estas políticas te den confianza en nuestro compromiso con la calidad y la satisfacción del cliente. ¡Gracias por elegir Snowy Peak Boards!
`,
        };
      },
    }),
    tool({
      name: 'checkEligibilityAndPossiblyInitiateReturn',
      description: `Verifica la elegibilidad de una acción propuesta para un pedido dado, proporcionando aprobación o denegación con razones. Esto enviará la solicitud a un agente experimentado altamente calificado para determinar la elegibilidad del pedido, quien puede estar de acuerdo e iniciar la devolución.

# Detalles
- Ten en cuenta que este agente tiene acceso al historial completo de la conversación, por lo que solo necesitas proporcionar detalles de alto nivel.
- SIEMPRE verifica primero con retrievePolicy para asegurar que tenemos el contexto relevante.
- Ten en cuenta que esto puede tardar hasta 10 segundos, así que por favor proporciona pequeñas actualizaciones al usuario cada pocos segundos, como 'Solo necesito un poco más de tiempo'.
- Siéntete libre de compartir una evaluación inicial de la elegibilidad potencial con el usuario antes de llamar a esta función.
`,
      parameters: {
        type: 'object',
        properties: {
          userDesiredAction: { // Mantener en inglés si el backend lo espera así
            type: 'string',
            description: "La acción propuesta que el usuario desea que se tome.",
          },
          question: { // Mantener en inglés
            type: 'string',
            description: "La pregunta con la que te gustaría que te ayude el agente de escalación calificado.",
          },
        },
        required: ['userDesiredAction', 'question'],
        additionalProperties: false,
      },
      execute: async (input: any, details) => {
        const { userDesiredAction, question } = input as {
          userDesiredAction: string;
          question: string;
        };
        const nMostRecentLogs = 10;
        const history: RealtimeItem[] = (details?.context as any)?.history ?? [];
        const filteredLogs = history.filter((log) => log.type === 'message');
        const messages = [
          {
            role: "system",
            content:
              "Eres un experto en evaluar la elegibilidad potencial de los casos basándote en qué tan bien el caso se adhiere a las directrices proporcionadas. Siempre te adhieres muy de cerca a las directrices y haces las cosas 'según el manual'.",
          },
          {
            role: "user",
            content: `Considera cuidadosamente el contexto proporcionado, que incluye la solicitud y las políticas y hechos relevantes, y determina si la acción deseada por el usuario puede completarse de acuerdo con las políticas. Proporciona una explicación o justificación concisa. Considera también casos límite y otra información que, si se proporciona, podría cambiar el veredicto, por ejemplo, si un artículo está defectuoso pero el usuario no lo ha declarado. Nuevamente, si FALTA ALGUNA INFORMACIÓN CRÍTICA DEL USUARIO, PÍDELA MEDIANTE "Se Necesita Información Adicional" EN LUGAR DE DENEGAR LA RECLAMACIÓN.

<modelContext>
accionDeseadaUsuario: ${userDesiredAction}
pregunta: ${question}
</modelContext>

<conversationContext>
${JSON.stringify(filteredLogs.slice(-nMostRecentLogs), null, 2)}
</conversationContext>

<output_format>
# Justificación
// Breve descripción explicando la decisión

# Solicitud del Usuario
// El resultado o acción deseada por el usuario

# Es Elegible
verdadero/falso/necesita_mas_informacion
// "verdadero" si estás seguro de que es verdad dado el contexto proporcionado, y no se necesita información adicional
// "necesita_mas_informacion" si necesitas CUALQUIER información adicional para tomar una determinación clara.

# Información Adicional Necesaria
// Otra información que necesitarías para tomar una determinación clara. Puede ser "Ninguna"

# Próximos Pasos para la Devolución
// Explica al usuario que recibirá un mensaje de texto con los próximos pasos. Solo si es_elegible=verdadero, de lo contrario "Ninguno". Proporciona confirmación al usuario del número de artículo, el número de pedido y el número de teléfono al que recibirá el mensaje de texto.
</output_format>  
`,
          },
        ];
        const model = "gpt-4o-mini-realtime-preview";
        console.log(`Verificando elegibilidad de pedido con modelo=${model}`);

        const response = await fetch("/api/responses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ model, input: messages }),
        });

        if (!response.ok) {
          console.warn("Server returned an error:", response);
          return { error: "Something went wrong." };
        }

        const { output = [] } = await response.json();
        const text = output
          .find((i: any) => i.type === 'message' && i.role === 'assistant')
          ?.content?.find((c: any) => c.type === 'output_text')?.text ?? '';

        console.log(text || output);
        return { result: text || output };
      },
    }),
  ],

  handoffs: [],
});
