import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canAttestDiscovery, getDiscoveryProgress, isDiscoveryEligible, S14_DISCOVERY_SEASON_SLUG } from "./discovery";

describe("Season 14 Discovery eligibility", () => {
  it("requires a found unique or set item plus both self-attested conditions", () => {
    const base = {
      category: "unique",
      found: true,
      discoveryDropAttested: true,
      discoveryIdentificationAttested: true,
    };

    assert.equal(isDiscoveryEligible(base), true);
    assert.equal(isDiscoveryEligible({ ...base, category: "set" }), true);
    assert.equal(isDiscoveryEligible({ ...base, found: false }), false);
    assert.equal(isDiscoveryEligible({ ...base, discoveryDropAttested: false }), false);
    assert.equal(isDiscoveryEligible({ ...base, discoveryIdentificationAttested: false }), false);
    assert.equal(isDiscoveryEligible({ ...base, category: "runeword" }), false);
  });

  it("allows editing attestations only for found unique or set items in Season 14", () => {
    assert.equal(canAttestDiscovery(S14_DISCOVERY_SEASON_SLUG, "unique", true), true);
    assert.equal(canAttestDiscovery(S14_DISCOVERY_SEASON_SLUG, "set", true), true);
    assert.equal(canAttestDiscovery("s13-betrayal", "unique", true), false);
    assert.equal(canAttestDiscovery(null, "unique", true), false);
    assert.equal(canAttestDiscovery(S14_DISCOVERY_SEASON_SLUG, "runeword", true), false);
    assert.equal(canAttestDiscovery(S14_DISCOVERY_SEASON_SLUG, "unique", false), false);
  });

  it("counts unique and set entries only, requiring both conditions for credit", () => {
    const progress = getDiscoveryProgress([
      { category: "unique", found: true, discoveryDropAttested: true, discoveryIdentificationAttested: true },
      { category: "set", found: true, discoveryDropAttested: true, discoveryIdentificationAttested: false },
      { category: "unique", found: false, discoveryDropAttested: true, discoveryIdentificationAttested: true },
      { category: "runeword", found: true, discoveryDropAttested: true, discoveryIdentificationAttested: true },
      { category: "rune", found: true, discoveryDropAttested: true, discoveryIdentificationAttested: true },
    ]);

    assert.deepEqual(progress, { eligible: 1, total: 3 });
  });
});
