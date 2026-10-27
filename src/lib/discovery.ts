export const S14_DISCOVERY_SEASON_SLUG = "s14-alliance";

export interface DiscoveryProgressItem {
  category: string;
  found: boolean;
  discoveryDropAttested: boolean;
  discoveryIdentificationAttested: boolean;
}

export function canAttestDiscovery(seasonSlug: string | null, category: string, found: boolean): boolean {
  return (
    seasonSlug === S14_DISCOVERY_SEASON_SLUG &&
    (category === "unique" || category === "set") &&
    found
  );
}

export function isDiscoveryEligible(item: DiscoveryProgressItem): boolean {
  return (
    (item.category === "unique" || item.category === "set") &&
    item.found &&
    item.discoveryDropAttested &&
    item.discoveryIdentificationAttested
  );
}

export function getDiscoveryProgress(items: readonly DiscoveryProgressItem[]) {
  const inScope = items.filter((item) => item.category === "unique" || item.category === "set");
  return {
    eligible: inScope.filter(isDiscoveryEligible).length,
    total: inScope.length,
  };
}
