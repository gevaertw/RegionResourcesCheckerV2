param environmentName string
param location string

var sanitizedName = toLower(replace(environmentName, '-', ''))
var uniqueSuffix = uniqueString(resourceGroup().id)
var acrName = 'acr${take(sanitizedName, 38)}${take(uniqueSuffix, 6)}'

resource acr 'Microsoft.ContainerRegistry/registries@2023-11-01-preview' = {
  name: acrName
  location: location
  sku: {
    name: 'Standard'
  }
  properties: {
    adminUserEnabled: false
  }
}

output loginServer string = acr.properties.loginServer
output acrId string = acr.id
output acrName string = acr.name
