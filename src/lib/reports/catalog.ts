export type DataDomain =
  | "accounting"
  | "time_tracking"
  | "payroll"
  | "resourcing"
  | "crm"
  | "accounts_payable";

export type ReportDefinition = {
  id: string;
  name: string;
  description: string;
  category: "Profitability" | "Revenue" | "Delivery" | "Working capital";
  requiredDomains: DataDomain[];
  href: string;
  implemented: boolean;
};

export type ReportAvailability = ReportDefinition & {
  ready: boolean;
  missingDomains: DataDomain[];
};

export const DOMAIN_LABELS: Record<DataDomain, string> = {
  accounting: "Accounting",
  time_tracking: "Time tracking",
  payroll: "Payroll",
  resourcing: "Resourcing",
  crm: "CRM",
  accounts_payable: "Accounts payable",
};

export const REPORT_CATALOG: ReportDefinition[] = [
  { id: "monday-profit", name: "Monday profit brief", description: "Winners, losers, thin margins, and records requiring review.", category: "Profitability", requiredDomains: ["accounting", "time_tracking"], href: "/brief", implemented: true },
  { id: "project-profitability", name: "Project profitability", description: "Revenue, labor cost, gross profit, and margin by mapped project.", category: "Profitability", requiredDomains: ["accounting", "time_tracking"], href: "/brief#projects", implemented: true },
  { id: "client-contribution", name: "Client contribution", description: "Contribution and margin rolled up across each client’s mapped projects.", category: "Profitability", requiredDomains: ["accounting", "time_tracking"], href: "/brief", implemented: false },
  { id: "margin-risk", name: "Margin-risk exceptions", description: "Projects or clients below the margin threshold or over-serviced.", category: "Profitability", requiredDomains: ["accounting", "time_tracking"], href: "/rfo", implemented: true },
  { id: "missing-cost-rates", name: "Missing cost rates", description: "Time entries excluded from labor cost, with their affected hours.", category: "Delivery", requiredDomains: ["time_tracking"], href: "/brief#needs-review", implemented: true },
  { id: "revenue-concentration", name: "Revenue concentration", description: "Share of revenue carried by the largest clients and projects.", category: "Revenue", requiredDomains: ["accounting"], href: "/brief", implemented: false },
  { id: "project-burn", name: "Project burn against budget", description: "Delivered hours and cost against approved project budgets.", category: "Delivery", requiredDomains: ["time_tracking", "resourcing"], href: "/data-health", implemented: false },
  { id: "utilization", name: "Team utilization", description: "Billable and non-billable time against available capacity.", category: "Delivery", requiredDomains: ["time_tracking", "resourcing"], href: "/data-health", implemented: false },
  { id: "ar-aging", name: "Accounts receivable aging", description: "Open invoices grouped by age and collection exposure.", category: "Working capital", requiredDomains: ["accounting"], href: "/data-health", implemented: false },
  { id: "ap-aging", name: "Accounts payable aging", description: "Open vendor commitments grouped by due date and age.", category: "Working capital", requiredDomains: ["accounting", "accounts_payable"], href: "/data-health", implemented: false },
  { id: "pipeline-forecast", name: "Pipeline-weighted revenue", description: "Expected revenue from open opportunities, probability, and timing.", category: "Revenue", requiredDomains: ["accounting", "crm"], href: "/data-health", implemented: false },
  { id: "true-labor-margin", name: "True labor margin", description: "Project contribution using actual payroll cost rather than entered rates.", category: "Profitability", requiredDomains: ["accounting", "time_tracking", "payroll"], href: "/data-health", implemented: false },
];

export function reportAvailability(
  connectedDomains: Iterable<DataDomain>
): ReportAvailability[] {
  const connected = new Set(connectedDomains);
  return REPORT_CATALOG.map((report) => {
    const missingDomains = report.requiredDomains.filter(
      (domain) => !connected.has(domain)
    );
    return {
      ...report,
      ready: report.implemented && missingDomains.length === 0,
      missingDomains,
    };
  });
}
