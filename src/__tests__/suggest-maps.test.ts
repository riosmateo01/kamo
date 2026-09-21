import { describe, expect, it } from "vitest";
import {
  suggestClientMaps,
  suggestProjectMaps,
} from "@/lib/mapping/suggest";

describe("name-match suggest", () => {
  it("matches clients by normalized name", () => {
    const maps = suggestClientMaps(
      [{ id: "h1", name: "Acme Co" }],
      [{ id: "q1", displayName: "acme  co" }]
    );
    expect(maps).toEqual([
      { harvestClientId: "h1", qboCustomerId: "q1", status: "mapped" },
    ]);
  });

  it("does not overwrite existing maps", () => {
    const maps = suggestClientMaps(
      [{ id: "h1", name: "Acme Co" }],
      [
        { id: "q1", displayName: "Acme Co" },
        { id: "q2", displayName: "Other" },
      ],
      [{ harvestClientId: "h1", qboCustomerId: "q2", status: "mapped" }]
    );
    expect(maps).toHaveLength(1);
    expect(maps[0].qboCustomerId).toBe("q2");
  });

  it("matches projects on displayName or FQN leaf", () => {
    const maps = suggestProjectMaps(
      [{ id: "hp", clientId: "h1", name: "Website Redesign" }],
      [
        {
          id: "qj",
          customerId: "q1",
          displayName: "Website Redesign",
          fullyQualifiedName: "Acme Co:Website Redesign",
        },
      ]
    );
    expect(maps[0].qboJobId).toBe("qj");
  });
});
