targetScope = 'subscription'

@description('Principal ID of the managed identity')
param principalId string

var readerRoleId = 'acdd72a7-3385-48ef-bd42-f606fba81ae7'

resource readerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(subscription().id, principalId, readerRoleId)
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', readerRoleId)
    principalId: principalId
    principalType: 'ServicePrincipal'
  }
}
