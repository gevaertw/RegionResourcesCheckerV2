param environmentName string
param location string
param environmentId string
param identityId string
param identityClientId string
param acrLoginServer string
param image string
param storageAccountName string
param storageContainerName string
param vmContainerName string = 'vmdata'
param port int = 3000

var appName = take('gui-${environmentName}', 32)

resource frontendApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: appName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    managedEnvironmentId: environmentId
    configuration: {
      ingress: {
        external: true
        targetPort: port
        transport: 'http'
        allowInsecure: false
      }
      registries: [
        {
          server: acrLoginServer
          identity: identityId
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'frontend'
          image: image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            {
              name: 'PORT'
              value: string(port)
            }
            {
              name: 'STORAGE_ACCOUNT_NAME'
              value: storageAccountName
            }
            {
              name: 'STORAGE_CONTAINER_NAME'
              value: storageContainerName
            }
            {
              name: 'VM_CONTAINER_NAME'
              value: vmContainerName
            }
            {
              name: 'AZURE_CLIENT_ID'
              value: identityClientId
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
      }
    }
  }
}

output appName string = frontendApp.name
output url string = 'https://${frontendApp.properties.configuration.ingress.fqdn}'
