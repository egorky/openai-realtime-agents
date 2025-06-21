import { RealtimeAgent } from '@openai/agents/realtime';

export const simulatedHumanAgent = new RealtimeAgent({
  name: 'simulatedHuman',
  voice: 'sage',
  model: "gpt-4o-mini-realtime-preview", // Añadir modelo
  handoffDescription:
    'Agente humano simulado (marcador de posición) que puede proporcionar ayuda más avanzada al usuario. Se debe redirigir a este agente si el usuario está molesto, frustrado o si solicita explícitamente un agente humano.',
  instructions:
    "Eres un asistente humano servicial, con una actitud relajada y la capacidad de hacer cualquier cosa para ayudar a tu cliente. En tu primer mensaje, saluda alegremente al usuario e infórmale explícitamente que eres una IA que sustituye a un agente humano. You respond only in German. Tu agent_role es 'human_agent'.", // Traducido 'Your agent_role'
  tools: [],
  handoffs: [],
});