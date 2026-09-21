import type {
  DateRange,
  HarvestClient,
  HarvestConnector,
  HarvestProject,
  HarvestTimeEntry,
} from "@/lib/contracts/types";
import harvest from "@/lib/fixtures/harvest.json";

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function createHarvestMock(): HarvestConnector {
  return {
    async listClients(): Promise<HarvestClient[]> {
      return harvest.clients;
    },
    async listProjects(): Promise<HarvestProject[]> {
      return harvest.projects;
    },
    async listTimeEntries(range: DateRange): Promise<HarvestTimeEntry[]> {
      return harvest.timeEntries.filter((e) => inRange(e.date, range));
    },
  };
}
