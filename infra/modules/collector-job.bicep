param environmentName string
param location string
param environmentId string
param identityId string
param identityClientId string
param acrLoginServer string
param image string
param region string
param storageAccountName string
param storageContainerName string
param vmContainerName string = 'vmdata'
param subscriptionIdValue string

var jobName = take('col-${environmentName}-${region}', 32)

resource collectorJob 'Microsoft.App/jobs@2024-03-01' = {
  name: jobName
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${identityId}': {}
    }
  }
  properties: {
    environmentId: environmentId
    configuration: {
      triggerType: 'Schedule'
      scheduleTriggerConfig: {
        cronExpression: '0 * * * *'
        parallelism: 1
        replicaCompletionCount: 1
      }
      replicaTimeout: 600
      replicaRetryLimit: 1
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
          name: 'collector'
          image: image
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          env: [
            {
              name: 'REGION'
              value: region
            }
            {
              name: 'AZURE_SUBSCRIPTION_ID'
              value: subscriptionIdValue
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
    }
  }
}

output jobName string = collectorJob.name
