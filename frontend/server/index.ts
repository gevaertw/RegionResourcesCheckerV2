import express from "express";
import path from "path";
import { DefaultAzureCredential } from "@azure/identity";
import { BlobServiceClient } from "@azure/storage-blob";

const app = express();
const port = parseInt(process.env.PORT || "3000", 10);
const storageAccountName = process.env.STORAGE_ACCOUNT_NAME;
const containerName = process.env.STORAGE_CONTAINER_NAME || "regiondata";

if (!storageAccountName) {
  console.error(
    JSON.stringify({
      level: "error",
      msg: "STORAGE_ACCOUNT_NAME environment variable is required",
    })
  );
  process.exit(1);
}

const credential = new DefaultAzureCredential();
const blobServiceClient = new BlobServiceClient(
  `https://${storageAccountName}.blob.core.windows.net`,
  credential
);
const blobContainerClient = blobServiceClient.getContainerClient(containerName);

const vmContainerName = process.env.VM_CONTAINER_NAME || "vmdata";
const vmContainerClient = blobServiceClient.getContainerClient(vmContainerName);

// Health endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// List available regions (blob names without .json)
app.get("/api/regions", async (_req, res) => {
  try {
    const regions: string[] = [];
    for await (const blob of blobContainerClient.listBlobsFlat()) {
      if (blob.name.endsWith(".json")) {
        regions.push(blob.name.replace(/\.json$/, ""));
      }
    }
    res.json(regions.sort());
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", msg: "Failed to list regions", error: String(err) })
    );
    res.status(500).json({ error: "Failed to list regions" });
  }
});

// Get region data
app.get("/api/regions/:region", async (req, res) => {
  const region = req.params.region;

  // Validate: alphanumeric only to prevent path traversal
  if (!/^[a-z0-9]+$/i.test(region)) {
    res.status(400).json({ error: "Invalid region name" });
    return;
  }

  try {
    const blobClient = blobContainerClient.getBlockBlobClient(`${region}.json`);
    const download = await blobClient.download();

    if (!download.readableStreamBody) {
      res.status(404).json({ error: "Region data not found" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    download.readableStreamBody.pipe(res);
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: "Region not found" });
    } else {
      console.error(
        JSON.stringify({ level: "error", msg: "Failed to get region data", region, error: String(err) })
      );
      res.status(500).json({ error: "Failed to get region data" });
    }
  }
});

// List available VM regions
app.get("/api/vm/regions", async (_req, res) => {
  try {
    const regions: string[] = [];
    for await (const blob of vmContainerClient.listBlobsFlat()) {
      if (blob.name.endsWith(".json")) {
        regions.push(blob.name.replace(/\.json$/, ""));
      }
    }
    res.json(regions.sort());
  } catch (err) {
    console.error(
      JSON.stringify({ level: "error", msg: "Failed to list VM regions", error: String(err) })
    );
    res.status(500).json({ error: "Failed to list VM regions" });
  }
});

// Get VM data for a region
app.get("/api/vm/:region", async (req, res) => {
  const region = req.params.region;

  if (!/^[a-z0-9]+$/i.test(region)) {
    res.status(400).json({ error: "Invalid region name" });
    return;
  }

  try {
    const blobClient = vmContainerClient.getBlockBlobClient(`${region}.json`);
    const download = await blobClient.download();

    if (!download.readableStreamBody) {
      res.status(404).json({ error: "VM data not found" });
      return;
    }

    res.setHeader("Content-Type", "application/json");
    download.readableStreamBody.pipe(res);
  } catch (err: any) {
    if (err.statusCode === 404) {
      res.status(404).json({ error: "VM region not found" });
    } else {
      console.error(
        JSON.stringify({ level: "error", msg: "Failed to get VM data", region, error: String(err) })
      );
      res.status(500).json({ error: "Failed to get VM data" });
    }
  }
});

// Serve static React build
app.use(express.static(path.join(__dirname, "../dist")));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(port, () => {
  console.log(
    JSON.stringify({ level: "info", msg: `Server listening on port ${port}` })
  );
});
