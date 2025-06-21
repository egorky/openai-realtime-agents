import { RealtimeAgent, tool } from '@openai/agents/realtime';

export const salesAgent = new RealtimeAgent({
  name: 'salesAgent',
  voice: 'sage',
  model: "gpt-4o-mini-realtime-preview",
  handoffDescription:
    "Maneja consultas relacionadas con ventas, incluyendo detalles de nuevos productos, recomendaciones, promociones y flujos de compra. Debe ser contactado si el usuario está interesado en comprar o explorar nuevas ofertas.",

  instructions:
    "Eres un útil asistente de ventas. Proporciona información completa sobre promociones disponibles, ofertas actuales y recomendaciones de productos. Ayuda al usuario con cualquier consulta de compra y guíalo a través del proceso de pago cuando esté listo.",


  tools: [
    tool({
      name: 'lookupNewSales', // Mantener nombres de herramientas en inglés
      description:
        "Verifica promociones actuales, descuentos u ofertas especiales. Responde con ofertas disponibles relevantes para la consulta del usuario.",
      parameters: {
        type: 'object',
        properties: {
          category: { // Mantener nombres de parámetros en inglés
            type: 'string',
            enum: ['snowboard', 'apparel', 'boots', 'accessories', 'any'], // Mantener enums en inglés si el sistema los espera así
            description: 'La categoría del producto o área general en la que el usuario está interesado (opcional).',
          },
        },
        required: ['category'],
        additionalProperties: false,
      },
      execute: async (input: any) => {
        const { category } = input as { category: string };
        const items = [
          { item_id: 101, type: 'snowboard', name: 'Alpine Blade', retail_price_usd: 450, sale_price_usd: 360, sale_discount_pct: 20 },
          { item_id: 102, type: 'snowboard', name: 'Peak Bomber', retail_price_usd: 499, sale_price_usd: 374, sale_discount_pct: 25 },
          { item_id: 201, type: 'apparel', name: 'Thermal Jacket', retail_price_usd: 120, sale_price_usd: 84, sale_discount_pct: 30 },
          { item_id: 202, type: 'apparel', name: 'Insulated Pants', retail_price_usd: 150, sale_price_usd: 112, sale_discount_pct: 25 },
          { item_id: 301, type: 'boots', name: 'Glacier Grip', retail_price_usd: 250, sale_price_usd: 200, sale_discount_pct: 20 },
          { item_id: 302, type: 'boots', name: 'Summit Steps', retail_price_usd: 300, sale_price_usd: 210, sale_discount_pct: 30 },
          { item_id: 401, type: 'accessories', name: 'Goggles', retail_price_usd: 80, sale_price_usd: 60, sale_discount_pct: 25 },
          { item_id: 402, type: 'accessories', name: 'Warm Gloves', retail_price_usd: 60, sale_price_usd: 48, sale_discount_pct: 20 },
        ];
        const filteredItems =
          category === 'any'
            ? items
            : items.filter((item) => item.type === category);
        filteredItems.sort((a, b) => b.sale_discount_pct - a.sale_discount_pct);
        return {
          sales: filteredItems, // Nombre del campo de resultado en inglés
        };
      },
    }),

    tool({
      name: 'addToCart',
      description: "Añade un artículo al carrito de compras del usuario.",
      parameters: {
        type: 'object',
        properties: {
          item_id: { // Mantener en inglés
            type: 'string',
            description: 'El ID del artículo para añadir al carrito.',
          },
        },
        required: ['item_id'],
        additionalProperties: false,
      },
      execute: async (input: any) => ({ success: true }),
    }),

    tool({
      name: 'checkout',
      description:
        "Inicia un proceso de pago con los artículos seleccionados por el usuario.",
      parameters: {
        type: 'object',
        properties: {
          item_ids: { // Mantener en inglés
            type: 'array',
            description: 'Un array de IDs de artículos que el usuario tiene la intención de comprar.',
            items: {
              type: 'string',
            },
          },
          phone_number: { // Mantener en inglés
            type: 'string',
            description: "Número de teléfono del usuario usado para verificación. Formateado como '(111) 222-3333'",
            pattern: '^\\(\\d{3}\\) \\d{3}-\\d{4}$',
          },
        },
        required: ['item_ids', 'phone_number'],
        additionalProperties: false,
      },
      execute: async (input: any) => ({ checkoutUrl: 'https://example.com/checkout' }), // Mantener nombre de campo en inglés
    }),
  ],

  handoffs: [],
});
