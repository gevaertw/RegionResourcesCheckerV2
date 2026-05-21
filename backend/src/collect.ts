import { ResourceManagementClient } from "@azure/arm-resources";
import { TokenCredential } from "@azure/identity";
import { ProviderNode, ResourceNode, RegionData } from "./types";

function insertIntoTree(
  children: ResourceNode[],
  parts: string[],
  available: boolean
): void {
  if (parts.length === 0) return;

  const [current, ...rest] = parts;
  let node = children.find((c) => c.name === current);

  if (!node) {
    node = {
      name: current,
      available: rest.length === 0 ? available : false,
      children: [],
    };
    children.push(node);
  } else if (rest.length === 0) {
    node.available = available;
  }

  if (rest.length > 0) {
    insertIntoTree(node.children, rest, available);
  }
}

function sortTree(children: ResourceNode[]): void {
  children.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of children) {
    sortTree(child.children);
  }
}

function normalizeLocation(location: string): string {
  return location.toLowerCase().replace(/\s+/g, "");
}

export async function collectProviders(
  credential: TokenCredential,
  subscriptionId: string,
  region: string
): Promise<RegionData> {
  const client = new ResourceManagementClient(credential, subscriptionId);
  const normalizedRegion = normalizeLocation(region);
  const providers: ProviderNode[] = [];

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Fetching resource providers",
      region,
      subscriptionId: subscriptionId.substring(0, 8) + "...",
    })
  );

  let providerCount = 0;

  for await (const provider of client.providers.list()) {
    const providerNode: ProviderNode = {
      name: provider.namespace || "",
      registrationState: provider.registrationState || "Unknown",
      children: [],
    };

    if (provider.resourceTypes) {
      for (const rt of provider.resourceTypes) {
        const typeName = rt.resourceType || "";
        const locations = (rt.locations || []).map(normalizeLocation);
        const available = locations.includes(normalizedRegion);
        const parts = typeName.split("/");
        insertIntoTree(providerNode.children, parts, available);
      }
    }

    sortTree(providerNode.children);
    providers.push(providerNode);
    providerCount++;
  }

  providers.sort((a, b) => a.name.localeCompare(b.name));

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Resource provider collection complete",
      region,
      providerCount,
    })
  );

  return {
    region,
    timestamp: new Date().toISOString(),
    providers,
  };
}
