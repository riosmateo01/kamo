import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHarvestHttp,
  mapHarvestClient,
  mapHarvestProject,
  mapHarvestTimeEntry,
} from "@/lib/connectors/harvest/http";

describe("Harvest HTTP mappers", () => {
  it("maps client/project/time entry to domain types", () => {
    expect(mapHarvestClient({ id: 1, name: "Acme" })).toEqual({
      id: "1",
      name: "Acme",
    });
    expect(
      mapHarvestProject({
        id: 2,
        name: "Web",
        code: "W",
        client: { id: 1, name: "Acme" },
      })
    ).toEqual({ id: "2", clientId: "1", name: "Web", code: "W" });
    expect(
      mapHarvestTimeEntry({
        id: 9,
        spent_date: "2026-09-10",
        hours: 1.5,
        billable: true,
        cost_rate: 75,
        user: { id: 3, name: "A" },
        project: { id: 2, name: "Web" },
      })
    ).toEqual({
      id: "9",
      projectId: "2",
      userId: "3",
      date: "2026-09-10",
      hours: 1.5,
      billable: true,
      costRate: 75,
    });
  });

  it("null cost_rate stays null without user defaults", () => {
    expect(
      mapHarvestTimeEntry({
        id: 1,
        spent_date: "2026-09-10",
        hours: 1,
        billable: true,
        cost_rate: null,
        user: { id: 1, name: "A" },
        project: { id: 1, name: "P" },
      }).costRate
    ).toBeNull();
  });

  it("null cost_rate uses user default map when provided", () => {
    const defaults = new Map([["1", 75]]);
    expect(
      mapHarvestTimeEntry(
        {
          id: 1,
          spent_date: "2026-09-10",
          hours: 1,
          billable: true,
          cost_rate: null,
          user: { id: 1, name: "A" },
          project: { id: 1, name: "P" },
        },
        defaults
      ).costRate
    ).toBe(75);
  });
});

describe("createHarvestHttp", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lists clients via API v2 with required headers", async () => {
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(String(url)).toContain("api.harvestapp.com/v2/clients");
      const h = init?.headers as Record<string, string>;
      expect(h.Authorization).toBe("Bearer tok");
      expect(h["Harvest-Account-Id"]).toBe("99");
      expect(h["User-Agent"]).toBeTruthy();
      return new Response(
        JSON.stringify({
          clients: [{ id: 10, name: "Acme" }],
          page: 1,
          total_pages: 1,
          next_page: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const c = createHarvestHttp({ accessToken: "tok", accountId: "99" });
    const clients = await c.listClients();
    expect(clients).toEqual([{ id: "10", name: "Acme" }]);
    expect(fetchMock).toHaveBeenCalled();
  });

  it("passes from/to on time_entries", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = new URL(String(url));
      if (u.pathname.includes("/users")) {
        return new Response(
          JSON.stringify({ users: [{ id: 3, cost_rate: 75 }], page: 1, next_page: null }),
          { status: 200 }
        );
      }
      expect(u.searchParams.get("from")).toBe("2026-09-01");
      expect(u.searchParams.get("to")).toBe("2026-09-14");
      return new Response(
        JSON.stringify({
          time_entries: [],
          page: 1,
          next_page: null,
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const c = createHarvestHttp({ accessToken: "tok", accountId: "99" });
    await c.listTimeEntries({ start: "2026-09-01", end: "2026-09-14" });
  });

  it("falls back to user default cost_rate when entry cost_rate is null", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      const u = new URL(String(url));
      if (u.pathname.includes("/users")) {
        return new Response(
          JSON.stringify({
            users: [{ id: 3, cost_rate: 75 }],
            page: 1,
            next_page: null,
          }),
          { status: 200 }
        );
      }
      return new Response(
        JSON.stringify({
          time_entries: [
            {
              id: 9,
              spent_date: "2026-09-10",
              hours: 8,
              billable: true,
              cost_rate: null,
              user: { id: 3, name: "A" },
              project: { id: 2, name: "Web" },
            },
          ],
          page: 1,
          next_page: null,
        }),
        { status: 200 }
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const c = createHarvestHttp({ accessToken: "tok", accountId: "99" });
    const entries = await c.listTimeEntries({
      start: "2026-09-01",
      end: "2026-09-14",
    });
    expect(entries[0]?.costRate).toBe(75);
  });
});
