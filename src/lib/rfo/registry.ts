/**
 * Adapter registry — Harvest+QBO live + Spike 2 docs stub.
 */

import { harvestQboAdapter } from "./adapters/harvest-qbo";
import { stubDocsAdapter } from "./adapters/stub-docs";
import type { AdapterRegistry, ReconAdapter } from "./types";

const adapters: AdapterRegistry = new Map();

function seed(): void {
  if (adapters.size > 0) return;
  adapters.set(harvestQboAdapter.id, harvestQboAdapter);
  adapters.set(stubDocsAdapter.id, stubDocsAdapter);
}

export function getAdapterRegistry(): AdapterRegistry {
  seed();
  return adapters;
}

export function getAdapter(id: string): ReconAdapter | undefined {
  return getAdapterRegistry().get(id);
}

export function listAdapters(): ReconAdapter[] {
  return [...getAdapterRegistry().values()];
}

/** Test helper */
export function registerAdapter(adapter: ReconAdapter): void {
  seed();
  adapters.set(adapter.id, adapter);
}
