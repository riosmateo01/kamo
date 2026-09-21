/** Kamo R→F→O skeleton — recon adapter → fabric object → orchestrator. */

export type {
  AdapterRegistry,
  FabricKind,
  FabricObject,
  FabricObjectStatus,
  ExceptionEvidence,
  MarginRiskExceptionPayload,
  MarginRiskView,
  MondayPnLPayload,
  NotifyChannel,
  Orchestrator,
  PlayId,
  PlayRunInput,
  PlayRunResult,
  ReconAdapter,
  ReconAdapterOptions,
  ReconResult,
  TriggerResult,
} from "./types";

export {
  createFabricObject,
  getFabricObject,
  listFabricObjects,
  clearFabricMemory,
} from "./fabric";

export {
  orchestrator,
  triggerAll,
  isSlackConfigured,
  isEmailNotifyConfigured,
  getNotifyEnvStatus,
  getMarginRiskThreshold,
  formatObjectMessage,
} from "./orchestrator";

export { harvestQboAdapter, HARVEST_QBO_ADAPTER_ID } from "./adapters/harvest-qbo";
export { stubDocsAdapter, STUB_DOCS_ADAPTER_ID } from "./adapters/stub-docs";

export {
  getAdapterRegistry,
  getAdapter,
  listAdapters,
  registerAdapter,
} from "./registry";

export { fabricateMondayBrief, MONDAY_BRIEF_PLAY_ID } from "./plays/monday-brief";
export {
  fabricateMarginRisk,
  detectMarginRiskExceptions,
  buildExceptionEvidence,
  MARGIN_RISK_PLAY_ID,
} from "./plays/margin-risk";

export { runPlay } from "./run";
