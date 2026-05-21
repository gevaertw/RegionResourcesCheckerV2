# Repository instructions for Azure Container Apps applications

This repository is used to build and deploy a Node.js backend and a React frontend to Azure Container Apps using Bicep and Azure CLI.

## General engineering rules
- Prefer simple, production-oriented solutions over clever ones.
- Keep all changes minimal and explain assumptions explicitly.
- Do not introduce unnecessary frameworks, layers, or patterns.
- Preserve idempotency for infrastructure and deployment steps.
- Never hardcode secrets, credentials, tenant IDs, subscription IDs, or registry passwords.
- Prefer environment variables, managed identity, and secret references.
- When proposing commands, ensure they are copy-paste ready.
- When modifying files, summarize exactly which files were created or changed.

## Backend rules
- The backend is implemented in Node.js.
- Prefer TypeScript unless the repository is already JavaScript-only.
- Prefer Express or Fastify unless the repo already uses another framework.
- Add a `/health` endpoint by default.
- Add structured logging.
- Respect configuration via environment variables.
- Do not assume local filesystem persistence.
- The backend must be stateless and container-ready.
- Prefer Linux containers.

## Frontend rules
- The frontend is implemented in React.
- Prefer TypeScript unless the repository is already JavaScript-only.
- Prefer Vite unless the repo already uses another build tool.
- Build the frontend as a production artifact.
- Do not embed secrets in frontend code.
- All backend URLs and runtime-specific values must be configurable.
- The frontend must be container-ready for Azure Container Apps.
- Prefer Linux containers.

## Container rules
- Always produce a Dockerfile for each deployable app.
- Prefer multi-stage Docker builds.
- Expose the correct port and keep it aligned with the Container Apps ingress target port.
- For frontend containers, prefer a small production-serving image.
- For backend containers, prefer a production node runtime image.

## Infrastructure rules
- Use Bicep for Azure infrastructure.
- Prefer Azure Container Apps over AKS or App Service unless explicitly told otherwise.
- Prefer one Azure Container Apps managed environment shared by frontend and backend unless the prompt says otherwise.
- Include Log Analytics integration for the managed environment.
- Prefer system-assigned managed identity by default unless the prompt explicitly asks for user-assigned identity.
- Use parameters for names, locations, image names, revisions, environment-specific values, and secret references.
- Do not hardcode resource group names in Bicep.
- Ensure outputs include values needed by deployment scripts.

## Deployment rules
- Prefer Azure CLI commands for deployment examples.
- Prefer `az deployment group create` for Bicep deployment.
- Prefer ACR for image storage.
- Use managed identity or federated identity where possible.
- Validate that the frontend and backend image references match the pushed image tags.
- Validate that ingress, target port, registry settings, and identity settings are coherent.
- The frontend should be externally reachable by default.
- The backend should be internal-only by default unless the prompt explicitly asks for public ingress.

## Output rules
When implementing work, always structure your response as:
1. Goal
2. Assumptions
3. Files to create or update
4. Proposed implementation
5. Validation steps
6. Next handoff recommendation (if another agent should continue)
