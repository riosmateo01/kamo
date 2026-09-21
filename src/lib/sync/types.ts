import type {
  HarvestConnector,
  QboConnector,
  DateRange,
} from "@/lib/contracts/types";

export type SyncProvider = "harvest" | "qbo" | "both" | "seed";

export type SyncResult = {
  provider: SyncProvider;
  status: "ok" | "error" | "noop";
  message: string;
  counts?: Record<string, number>;
};

export type PullHarvest = {
  pull(connector: HarvestConnector, range: DateRange): Promise<SyncResult>;
};

export type PullQbo = {
  pull(connector: QboConnector, range: DateRange): Promise<SyncResult>;
};
