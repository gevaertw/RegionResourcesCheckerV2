import { AppConfig } from "./types";

export function loadConfig(): AppConfig {
  const region = process.env.REGION;
  const subscriptionId = process.env.AZURE_SUBSCRIPTION_ID;
  const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
  const storageContainerName = process.env.STORAGE_CONTAINER_NAME || "regiondata";

  const missing: string[] = [];
  if (!region) missing.push("REGION");
  if (!subscriptionId) missing.push("AZURE_SUBSCRIPTION_ID");
  if (!storageAccountName) missing.push("STORAGE_ACCOUNT_NAME");

  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return {
    region: region!,
    subscriptionId: subscriptionId!,
    storageAccountName: storageAccountName!,
    storageContainerName,
  };
}
