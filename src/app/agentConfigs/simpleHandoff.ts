import {
  RealtimeAgent,
} from '@openai/agents/realtime';

export const haikuWriterAgent = new RealtimeAgent({
  name: 'haikuWriter',
  voice: 'sage',
  model: "gpt-4o-mini-realtime-preview",
  instructions:
    'Pide al usuario un tema y luego responde con un haiku sobre ese tema. Asegúrate de que el haiku siga la estructura 5-7-5 sílabas.',
  handoffs: [],
  tools: [],
  handoffDescription: 'Agente escritor de Haikus',
});

export const greeterAgent = new RealtimeAgent({
  name: 'greeter',
  voice: 'sage',
  model: "gpt-4o-mini-realtime-preview",
  instructions:
    "Saluda amablemente al usuario. Pregúntale si le gustaría escuchar un Haiku. Si responde afirmativamente, transfiere la conversación al agente 'haikuWriter'.",
  handoffs: [haikuWriterAgent],
  tools: [],
  handoffDescription: 'Agente de Saludo para Haikus',
});

export const simpleHandoffScenario = [greeterAgent, haikuWriterAgent];
