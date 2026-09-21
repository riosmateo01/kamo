import type {
  DateRange,
  QboConnector,
  QboCustomer,
  QboJob,
  QboRevenueLine,
} from "@/lib/contracts/types";
import qbo from "@/lib/fixtures/qbo.json";

function inRange(date: string, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export function createQboMock(): QboConnector {
  return {
    async listCustomers(): Promise<QboCustomer[]> {
      return qbo.customers;
    },
    async listJobs(): Promise<QboJob[]> {
      return qbo.jobs;
    },
    async listRevenue(range: DateRange): Promise<QboRevenueLine[]> {
      return qbo.revenueLines.filter((r) => inRange(r.date, range));
    },
  };
}
