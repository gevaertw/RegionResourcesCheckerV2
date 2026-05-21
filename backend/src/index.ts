import { DefaultAzureCredential } from "@azure/identity";
import { loadConfig } from "./config";
import { collectProviders } from "./collect";
import { uploadRegionData } from "./upload";

async function main(): Promise<void> {
  const startTime = Date.now();

  console.log(
    JSON.stringify({ level: "info", msg: "Job started", time: new Date().toISOString() })
  );

  const config = loadConfig();

  console.log(
    JSON.stringify({ level: "info", msg: "Configuration loaded", region: config.region })
  );

  const credential = new DefaultAzureCredential();

  const regionData = await collectProviders(
    credential,
    config.subscriptionId,
    config.region
  );

  await uploadRegionData(
    credential,
    config.storageAccountName,
    config.storageContainerName,
    regionData
  );

  const durationMs = Date.now() - startTime;
  console.log(
    JSON.stringify({
      level: "info",
      msg: "Job completed successfully",
      region: config.region,
      providerCount: regionData.providers.length,
      durationMs,
    })
  );
}

main().catch((err) => {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "Job failed",
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
  );
  process.exit(1);
});
