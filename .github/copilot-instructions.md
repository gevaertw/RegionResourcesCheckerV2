# Repository instructions for Azure Container Apps applications

This repository is used to build and deploy a .NET application to Azure Container Apps using Bicep and Azure CLI.

## General engineering rules
- Prefer simple, production-oriented solutions over clever ones.
- Keep all changes minimal and explain assumptions explicitly.
- Do not introduce unnecessary frameworks, layers, or patterns.
- Preserve idempotency for infrastructure and deployment steps.
- Never hardcode secrets, credentials, tenant IDs, subscription IDs, or registry passwords.
- Prefer environment variables, managed identity, and secret references.
- When proposing commands, ensure they are copy-paste ready.
- When modifying files, summarize exactly which files were created or changed.

## Application rules
- Prefer ASP.NET Core minimal APIs unless the prompt explicitly requires MVC or a worker service.
- The application must be stateless and container-ready.
- Add `/health` or equivalent health endpoint by default.
- Add structured logging.
- Respect configuration via environment variables.
- Do not assume local filesystem persistence.
- Prefer Linux containers.

## Container rules
- Always produce a Dockerfile for the app.
- Prefer multi-stage Docker builds.
- Expose the correct port and keep it aligned with the Container Apps ingress target port.
- Prefer `mcr.microsoft.com/dotnet/aspnet` and `mcr.microsoft.com/dotnet/sdk` images unless explicitly told otherwise.

## Infrastructure rules
- Use Bicep for Azure infrastructure.
- Prefer Azure Container Apps over AKS or App Service unless explicitly told otherwise.
- Prefer one Container Apps managed environment per workload boundary unless the prompt says otherwise.
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
- Validate that the container app image reference matches the pushed image tag.
- Validate that ingress, target port, registry settings, and identity settings are coherent.

## Output rules
When implementing work, always structure your response as:
1. Goal
2. Assumptions
3. Files to create or update
4. Proposed implementation
5. Validation steps
6. Next handoff recommendation (if another agent should continue)