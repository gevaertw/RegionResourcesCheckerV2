export interface ResourceNode {
  name: string;
  available: boolean;
  children: ResourceNode[];
}

export interface ProviderNode {
  name: string;
  children: ResourceNode[];
}

export interface RegionData {
  region: string;
  timestamp: string;
  providers: ProviderNode[];
}

export interface AppConfig {
  region: string;
  subscriptionId: string;
  storageAccountName: string;
  storageContainerName: string;
}
