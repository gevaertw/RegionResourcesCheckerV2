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
  vmContainerName: string;
}

export interface VmCapability {
  name: string;
  value: string;
}

export interface VmSize {
  name: string;
  zones: string[];
  capabilities: VmCapability[];
}

export interface VmSubtype {
  name: string;
  sizes: VmSize[];
}

export interface VmFamily {
  name: string;
  subtypes: VmSubtype[];
}

export interface VmRegionData {
  region: string;
  timestamp: string;
  families: VmFamily[];
}
