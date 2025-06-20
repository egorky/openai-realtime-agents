import {
  RealtimeAgent,
} from '@openai/agents/realtime';

export const haikuWriterAgent = new RealtimeAgent({
  name: 'haikuWriter',
  voice: 'sage',
  instructions:
    'Pide al usuario un tema y luego responde con un haiku sobre ese tema.',
  handoffs: [],
  tools: [],
  handoffDescription: 'Agente que escribe haikus',
});

export const greeterAgent = new RealtimeAgent({
  name: 'greeter',
  voice: 'sage',
  instructions:
    "Por favor, saluda al usuario y pregúntale si le gustaría un Haiku. Si es así, transfiere al agente 'haiku'.",
  handoffs: [haikuWriterAgent],
  tools: [],
  handoffDescription: 'Agente que saluda al usuario',
});

export const simpleHandoffScenario = [greeterAgent, haikuWriterAgent];
