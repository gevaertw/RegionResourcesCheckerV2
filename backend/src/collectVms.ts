import { ComputeManagementClient } from "@azure/arm-compute";
import { TokenCredential } from "@azure/identity";
import { VmRegionData, VmFamily, VmSubtype, VmSize, VmCapability } from "./types";

function normalizeLocation(location: string): string {
  return location.toLowerCase().replace(/\s+/g, "");
}

/**
 * Extract a "subtype" from a SKU name by removing purely numeric segments.
 * e.g. "Standard_D2s_v5" → "Standard_Ds_v5"
 */
function extractSubtype(name: string): string {
  return name
    .split("_")
    .map((seg) => (/^\d+$/.test(seg) ? "" : seg))
    .filter((seg) => seg !== "")
    .join("_");
}

export async function collectVms(
  credential: TokenCredential,
  subscriptionId: string,
  region: string
): Promise<VmRegionData> {
  const client = new ComputeManagementClient(credential, subscriptionId);
  const normalizedRegion = normalizeLocation(region);

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Fetching VM SKUs",
      region,
      subscriptionId: subscriptionId.substring(0, 8) + "...",
    })
  );

  const familyMap = new Map<string, Map<string, VmSize[]>>();

  for await (const sku of client.resourceSkus.list({ filter: `location eq '${region}'` })) {
    if (sku.resourceType !== "virtualMachines") continue;

    const skuLocations = (sku.locations || []).map(normalizeLocation);
    if (!skuLocations.includes(normalizedRegion)) continue;

    const skuName = sku.name || "";
    const family = sku.family || "Other";

    const zones: string[] = [];
    if (sku.locationInfo) {
      for (const li of sku.locationInfo) {
        if (normalizeLocation(li.location || "") === normalizedRegion && li.zones) {
          zones.push(...li.zones);
        }
      }
    }

    const capabilities: VmCapability[] = (sku.capabilities || []).map((c) => ({
      name: c.name || "",
      value: c.value || "",
    }));

    const vmSize: VmSize = {
      name: skuName,
      zones: zones.sort(),
      capabilities,
    };

    const subtype = extractSubtype(skuName);

    if (!familyMap.has(family)) {
      familyMap.set(family, new Map());
    }
    const subtypeMap = familyMap.get(family)!;
    if (!subtypeMap.has(subtype)) {
      subtypeMap.set(subtype, []);
    }
    subtypeMap.get(subtype)!.push(vmSize);
  }

  // Sort sizes within each subtype by vCPU count
  const getVCpus = (size: VmSize): number => {
    const cap = size.capabilities.find((c) => c.name === "vCPUs");
    return cap ? parseInt(cap.value, 10) || 0 : 0;
  };

  const families: VmFamily[] = [];
  for (const [familyName, subtypeMap] of familyMap) {
    const subtypes: VmSubtype[] = [];
    for (const [subtypeName, sizes] of subtypeMap) {
      sizes.sort((a, b) => getVCpus(a) - getVCpus(b));
      subtypes.push({ name: subtypeName, sizes });
    }
    subtypes.sort((a, b) => a.name.localeCompare(b.name));
    families.push({ name: familyName, subtypes });
  }
  families.sort((a, b) => a.name.localeCompare(b.name));

  const totalSizes = families.reduce(
    (sum, f) => sum + f.subtypes.reduce((s, st) => s + st.sizes.length, 0),
    0
  );

  console.log(
    JSON.stringify({
      level: "info",
      msg: "VM SKU collection complete",
      region,
      familyCount: families.length,
      totalSizes,
    })
  );

  return {
    region,
    timestamp: new Date().toISOString(),
    families,
  };
}
