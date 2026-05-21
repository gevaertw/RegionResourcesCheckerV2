targetScope = 'resourceGroup'

@description('Base name used to derive all resource names')
param environmentName string

@description('Azure region for all resources')
param location string = resourceGroup().location

@description('Regions to collect resource provider data from')
param regions array = [
  'belgiumcentral'
  'denmarkeast'
]

@description('Frontend container image (full reference or MCR placeholder)')
param frontendImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Collector job container image (full reference or MCR placeholder)')
param jobImage string = 'mcr.microsoft.com/k8se/quickstart:latest'

@description('Blob container name for region data')
param storageContainerName string = 'regiondata'

@description('Blob container name for VM SKU data')
param vmContainerName string = 'vmdata'

@description('Frontend container listen port')
param frontendPort int = 3000

// ──────────────────────────────────────────────
// Modules
// ──────────────────────────────────────────────

module network 'modules/network.bicep' = {
  name: 'network'
  params: {
    environmentName: environmentName
    location: location
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring'
  params: {
    environmentName: environmentName
    location: location
  }
}

module storage 'modules/storage.bicep' = {
  name: 'storage'
  params: {
    environmentName: environmentName
    location: location
    peSubnetId: network.outputs.peSubnetId
    blobDnsZoneId: network.outputs.blobDnsZoneId
    containerName: storageContainerName
    vmContainerName: vmContainerName
  }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault'
  params: {
    environmentName: environmentName
    location: location
    peSubnetId: network.outputs.peSubnetId
    vaultDnsZoneId: network.outputs.vaultDnsZoneId
  }
}

module acr 'modules/acr.bicep' = {
  name: 'acr'
  params: {
    environmentName: environmentName
    location: location
  }
}

module identity 'modules/identity.bicep' = {
  name: 'identity'
  params: {
    environmentName: environmentName
    location: location
    storageAccountName: storage.outputs.storageAccountName
    acrName: acr.outputs.acrName
    keyVaultName: keyvault.outputs.keyVaultName
  }
}

module subscriptionReader 'modules/subscription-reader.bicep' = {
  name: 'subscription-reader'
  scope: subscription()
  params: {
    principalId: identity.outputs.principalId
  }
}

module environment 'modules/environment.bicep' = {
  name: 'environment'
  params: {
    environmentName: environmentName
    location: location
    containerAppsSubnetId: network.outputs.containerAppsSubnetId
    logAnalyticsWorkspaceName: monitoring.outputs.workspaceName
  }
}

module frontendApp 'modules/frontend-app.bicep' = {
  name: 'frontend-app'
  params: {
    environmentName: environmentName
    location: location
    environmentId: environment.outputs.environmentId
    identityId: identity.outputs.identityId
    identityClientId: identity.outputs.identityClientId
    acrLoginServer: acr.outputs.loginServer
    image: frontendImage
    storageAccountName: storage.outputs.storageAccountName
    storageContainerName: storageContainerName
    vmContainerName: vmContainerName
    port: frontendPort
  }
}

module collectorJobs 'modules/collector-job.bicep' = [for region in regions: {
  name: 'collector-job-${region}'
  params: {
    environmentName: environmentName
    location: location
    environmentId: environment.outputs.environmentId
    identityId: identity.outputs.identityId
    identityClientId: identity.outputs.identityClientId
    acrLoginServer: acr.outputs.loginServer
    image: jobImage
    region: region
    storageAccountName: storage.outputs.storageAccountName
    storageContainerName: storageContainerName
    vmContainerName: vmContainerName
    subscriptionIdValue: subscription().subscriptionId
  }
}]

// ──────────────────────────────────────────────
// Outputs
// ──────────────────────────────────────────────

output frontendAppName string = frontendApp.outputs.appName
output frontendUrl string = frontendApp.outputs.url
output environmentName string = environment.outputs.environmentName
output acrLoginServer string = acr.outputs.loginServer
output storageAccountName string = storage.outputs.storageAccountName
output keyVaultName string = keyvault.outputs.keyVaultName
output identityClientId string = identity.outputs.identityClientId
output identityResourceId string = identity.outputs.identityId
