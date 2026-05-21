#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ──────────────────────────────────────────────
# Load configuration
# ──────────────────────────────────────────────

if [[ ! -f secrets.json ]]; then
  echo "ERROR: secrets.json not found. Copy secrets.json.template and fill in your values."
  exit 1
fi

if [[ ! -f parameters.json ]]; then
  echo "ERROR: parameters.json not found."
  exit 1
fi

SUBSCRIPTION_ID=$(jq -r '.subscriptionId' secrets.json)
RESOURCE_GROUP=$(jq -r '.resourceGroup' secrets.json)
ENVIRONMENT_NAME=$(jq -r '.parameters.environmentName.value' parameters.json)
LOCATION=$(jq -r '.parameters.location.value' parameters.json)
IMAGE_TAG="${IMAGE_TAG:-$(date +%Y%m%d-%H%M%S)}"

echo "═══════════════════════════════════════════"
echo "  Region Resources Checker - Deploy"
echo "═══════════════════════════════════════════"
echo "  Subscription:  ${SUBSCRIPTION_ID:0:8}..."
echo "  Resource Group: ${RESOURCE_GROUP}"
echo "  Environment:    ${ENVIRONMENT_NAME}"
echo "  Location:       ${LOCATION}"
echo "  Image Tag:      ${IMAGE_TAG}"
echo "═══════════════════════════════════════════"

# Set subscription
az account set --subscription "$SUBSCRIPTION_ID"

# ──────────────────────────────────────────────
# Ensure resource group exists
# ──────────────────────────────────────────────

echo ""
echo "▶ Ensuring resource group exists..."
az group create \
  --name "$RESOURCE_GROUP" \
  --location "$LOCATION" \
  --output none 2>/dev/null || true

# ──────────────────────────────────────────────
# Infrastructure deployment (skip if unchanged)
# ──────────────────────────────────────────────

CHECKSUM_FILE=".infra-checksum"
CURRENT_CHECKSUM=$(find infra/ -name '*.bicep' -type f -exec sha256sum {} \; | sort | sha256sum | awk '{print $1}')

SKIP_INFRA=false
if [[ -f "$CHECKSUM_FILE" ]]; then
  PREVIOUS_CHECKSUM=$(cat "$CHECKSUM_FILE")
  if [[ "$CURRENT_CHECKSUM" == "$PREVIOUS_CHECKSUM" ]]; then
    SKIP_INFRA=true
  fi
fi

if [[ "$SKIP_INFRA" == "true" ]]; then
  echo ""
  echo "▶ Infrastructure unchanged — skipping Bicep deployment."
else
  echo ""
  echo "▶ Deploying infrastructure (Bicep)..."
  az deployment group create \
    --resource-group "$RESOURCE_GROUP" \
    --template-file infra/main.bicep \
    --parameters @parameters.json \
    --output none

  echo "$CURRENT_CHECKSUM" > "$CHECKSUM_FILE"
  echo "  ✓ Infrastructure deployed."
fi

# ──────────────────────────────────────────────
# Retrieve outputs
# ──────────────────────────────────────────────

echo ""
echo "▶ Retrieving deployment outputs..."
OUTPUTS=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs \
  --output json 2>/dev/null || echo "{}")

ACR_LOGIN_SERVER=$(echo "$OUTPUTS" | jq -r '.acrLoginServer.value // empty')

if [[ -z "$ACR_LOGIN_SERVER" ]]; then
  echo "ERROR: Could not retrieve ACR login server. Run with infra deployment first."
  exit 1
fi

FRONTEND_APP_NAME=$(echo "$OUTPUTS" | jq -r '.frontendAppName.value // empty')

echo "  ACR:            ${ACR_LOGIN_SERVER}"
echo "  Frontend App:   ${FRONTEND_APP_NAME}"

# ──────────────────────────────────────────────
# Build and push container images
# ──────────────────────────────────────────────

ACR_NAME="${ACR_LOGIN_SERVER%%.*}"
FRONTEND_IMAGE="${ACR_LOGIN_SERVER}/frontend:${IMAGE_TAG}"
JOB_IMAGE="${ACR_LOGIN_SERVER}/backend-job:${IMAGE_TAG}"

echo ""
echo "▶ Building and pushing backend job image (ACR Tasks)..."
az acr build \
  --registry "$ACR_NAME" \
  --image "backend-job:${IMAGE_TAG}" \
  ./backend
echo "  ✓ ${JOB_IMAGE}"

echo ""
echo "▶ Building and pushing frontend image (ACR Tasks)..."
az acr build \
  --registry "$ACR_NAME" \
  --image "frontend:${IMAGE_TAG}" \
  ./frontend
echo "  ✓ ${FRONTEND_IMAGE}"

# ──────────────────────────────────────────────
# Update container apps with real images
# ──────────────────────────────────────────────

echo ""
echo "▶ Updating infrastructure with ACR images..."
az deployment group create \
  --resource-group "$RESOURCE_GROUP" \
  --template-file infra/main.bicep \
  --parameters @parameters.json \
  --parameters frontendImage="$FRONTEND_IMAGE" jobImage="$JOB_IMAGE" \
  --output none

# Update checksum after successful image deployment
CURRENT_CHECKSUM=$(find infra/ -name '*.bicep' -type f -exec sha256sum {} \; | sort | sha256sum | awk '{print $1}')
echo "$CURRENT_CHECKSUM" > "$CHECKSUM_FILE"

# ──────────────────────────────────────────────
# Show result
# ──────────────────────────────────────────────

OUTPUTS=$(az deployment group show \
  --resource-group "$RESOURCE_GROUP" \
  --name main \
  --query properties.outputs \
  --output json)

FRONTEND_URL=$(echo "$OUTPUTS" | jq -r '.frontendUrl.value // "unknown"')

echo ""
echo "═══════════════════════════════════════════"
echo "  Deployment complete!"
echo "═══════════════════════════════════════════"
echo "  Frontend URL:    ${FRONTEND_URL}"
echo "  Frontend Image:  ${FRONTEND_IMAGE}"
echo "  Job Image:       ${JOB_IMAGE}"
echo "  ACR:             ${ACR_LOGIN_SERVER}"
echo "═══════════════════════════════════════════"
