import { BlobServiceClient } from "@azure/storage-blob";
import { TokenCredential } from "@azure/identity";
import { RegionData, VmRegionData } from "./types";

export async function uploadRegionData(
  credential: TokenCredential,
  storageAccountName: string,
  containerName: string,
  data: RegionData
): Promise<void> {
  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net`,
    credential
  );

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `${data.region}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const content = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(content);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Uploaded region data to blob storage",
      blob: blobName,
      storageAccount: storageAccountName,
      container: containerName,
      sizeBytes: buffer.length,
    })
  );
}

export async function uploadVmData(
  credential: TokenCredential,
  storageAccountName: string,
  containerName: string,
  data: VmRegionData
): Promise<void> {
  const blobServiceClient = new BlobServiceClient(
    `https://${storageAccountName}.blob.core.windows.net`,
    credential
  );

  const containerClient = blobServiceClient.getContainerClient(containerName);
  const blobName = `${data.region}.json`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);

  const content = JSON.stringify(data, null, 2);
  const buffer = Buffer.from(content);

  await blockBlobClient.upload(buffer, buffer.length, {
    blobHTTPHeaders: { blobContentType: "application/json" },
  });

  console.log(
    JSON.stringify({
      level: "info",
      msg: "Uploaded VM data to blob storage",
      blob: blobName,
      storageAccount: storageAccountName,
      container: containerName,
      sizeBytes: buffer.length,
    })
  );
}
