import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createQboHttp,
  mapInvoiceToRevenue,
  mapQboCustomer,
  mapQboJob,
} from "@/lib/connectors/qbo/http";

describe("QBO HTTP mappers", () => {
  it("maps customer and job", () => {
    expect(
      mapQboCustomer({ Id: "1", DisplayName: "Acme", Job: false })
    ).toEqual({ id: "1", displayName: "Acme" });
    expect(
      mapQboJob({
        Id: "2",
        DisplayName: "Website",
        Job: true,
        ParentRef: { value: "1" },
        FullyQualifiedName: "Acme:Website",
      })
    ).toEqual({
      id: "2",
      customerId: "1",
      displayName: "Website",
      fullyQualifiedName: "Acme:Website",
    });
  });

  it("maps invoice to job revenue line", () => {
    const line = mapInvoiceToRevenue(
      {
        Id: "100",
        TxnDate: "2026-09-12",
        TotalAmt: 8000,
        DocNumber: "1001",
        CustomerRef: { value: "2", name: "Website" },
      },
      new Set(["2"]),
      new Map([["2", "1"]])
    );
    expect(line).toEqual({
      id: "inv_100",
      jobId: "2",
      customerId: "1",
      date: "2026-09-12",
      amount: 8000,
      memo: "Invoice 1001",
    });
  });
});

describe("createQboHttp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("queries sandbox Customer and splits jobs", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      expect(String(url)).toContain("sandbox-quickbooks.api.intuit.com");
      expect(String(url)).toContain("/v3/company/realm1/query");
      return new Response(
        JSON.stringify({
          QueryResponse: {
            Customer: [
              { Id: "1", DisplayName: "Acme", Job: false },
              {
                Id: "2",
                DisplayName: "Website",
                Job: true,
                ParentRef: { value: "1" },
                FullyQualifiedName: "Acme:Website",
              },
            ],
          },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const c = createQboHttp({
      accessToken: "tok",
      realmId: "realm1",
      environment: "sandbox",
    });
    const customers = await c.listCustomers();
    const jobs = await c.listJobs();
    expect(customers).toEqual([{ id: "1", displayName: "Acme" }]);
    expect(jobs[0].id).toBe("2");
    expect(jobs[0].customerId).toBe("1");
  });

  it("lists revenue from Invoice query in date range", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = String(url);
      if (u.includes("FROM%20Customer") || u.includes("FROM+Customer") || decodeURIComponent(u).includes("FROM Customer")) {
        return new Response(
          JSON.stringify({
            QueryResponse: {
              Customer: [
                { Id: "1", DisplayName: "Acme", Job: false },
                {
                  Id: "2",
                  DisplayName: "Website",
                  Job: true,
                  ParentRef: { value: "1" },
                },
              ],
            },
          }),
          { status: 200 }
        );
      }
      expect(decodeURIComponent(u)).toContain("FROM Invoice");
      expect(decodeURIComponent(u)).toContain("TxnDate >= '2026-09-08'");
      return new Response(
        JSON.stringify({
          QueryResponse: {
            Invoice: [
              {
                Id: "9",
                TxnDate: "2026-09-10",
                TotalAmt: 2000,
                CustomerRef: { value: "2" },
              },
            ],
          },
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const c = createQboHttp({
      accessToken: "tok",
      realmId: "realm1",
      environment: "sandbox",
    });
    const lines = await c.listRevenue({
      start: "2026-09-08",
      end: "2026-09-14",
    });
    expect(lines).toHaveLength(1);
    expect(lines[0].amount).toBe(2000);
    expect(lines[0].jobId).toBe("2");
    expect(lines[0].customerId).toBe("1");
  });
});
