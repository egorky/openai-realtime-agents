import { simpleHandoffScenario } from './simpleHandoff';
import { customerServiceRetailScenario } from './customerServiceRetail';
import { chatSupervisorScenario } from './chatSupervisor';

import type { RealtimeAgent } from '@openai/agents/realtime';

// Map of scenario key -> array of RealtimeAgent objects
export const allAgentSets: Record<string, RealtimeAgent[]> = {
  simpleHandoff: simpleHandoffScenario,
  customerServiceRetail: customerServiceRetailScenario,
  chatSupervisor: chatSupervisorScenario, // This is RealtimeAgent[]
};

export const defaultAgentSetKey = 'chatSupervisor';

// Define and export supervisorSdkScenarioMap here
import { customerServiceRetailCompanyName } from './customerServiceRetail'; // Ensure this is imported
import { chatSupervisorCompanyName } from './chatSupervisor'; // Ensure this is imported

export const supervisorSdkScenarioMap: Record<string, { scenario: RealtimeAgent[], companyName: string, displayName: string }> = {
  customerServiceRetail: {
    scenario: customerServiceRetailScenario,
    companyName: customerServiceRetailCompanyName,
    displayName: "Customer Service (Retail)"
  },
  chatSupervisor: {
    scenario: chatSupervisorScenario,
    companyName: chatSupervisorCompanyName,
    displayName: "Chat Supervisor"
  },
  simpleHandoff: {
    scenario: simpleHandoffScenario,
    companyName: "GenericHandoffInc", // Or define a companyName in simpleHandoff.ts and import
    displayName: "Simple Handoff (Haiku)"
  },
};
