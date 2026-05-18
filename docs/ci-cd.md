# CI/CD for This Project

## Deployment model

This repository now uses:

- `CI`: Docker Compose validation, Node syntax checks, full stack startup, smoke tests
- `CD`: `ansible-playbook` deployment to a Linux server over SSH

The deployed application is started on the server with `docker compose up -d --build`.

## Required repository secrets

Create these in `Settings -> Secrets and variables -> Actions -> Repository secrets`:

- `DEPLOY_HOST`: server IP or DNS name
- `DEPLOY_USER`: SSH username on the server
- `DEPLOY_PORT`: SSH port, usually `22`
- `DEPLOY_SSH_KEY`: private SSH key content used to connect to the server
- `JWT_SECRET`: application JWT secret
- `UNSPLASH_ACCESS_KEY`: external API key, or `demo_key`
- `GRAFANA_ADMIN_PASSWORD`: optional, set your Grafana password

Optional repository variable:

- `DEPLOY_APP_DIR`: target directory on the server, default is `/opt/coffee-shop`

## What CI does

Workflow file: `.github/workflows/ci.yml`

On each push and pull request it:

- validates `docker-compose.yml`
- checks `services/*/server.js` syntax with `node --check`
- runs `docker compose up -d --build`
- checks HTTP availability of:
  - `/`
  - `:3001/health`
  - `:3002/health`
  - `:3003/health`
  - `:3004/health`
  - `:3005/health`
  - `:3006/health`
  - `:3007/health`

## What CD does

Workflow file: `.github/workflows/cd.yml`

It:

- installs Ansible on the GitHub runner
- connects to your server through SSH
- installs Docker and Git on the server
- pulls the current repository branch on the server
- writes `.env`
- runs `docker compose up -d --build --remove-orphans`
- performs remote smoke tests

## Server requirements

Your target server should be:

- Ubuntu or Debian-based
- reachable by SSH from GitHub-hosted runners
- accessible with the private key stored in `DEPLOY_SSH_KEY`

No manual Docker installation is required. The playbook installs it.

## Deployment sequence

1. Push your branch with the workflow files.
2. Add the repository secrets listed above.
3. Ensure `Actions -> General -> Workflow permissions` is set to `Read and write permissions`.
4. Run `CI` on your branch and wait for green status.
5. Run `CD` manually on your branch using `workflow_dispatch`.
6. Verify the server:
   - `docker ps`
   - `curl http://SERVER_IP/`
   - `curl http://SERVER_IP:3001/health`

## Local reference

Example environment file is in `.env.example`.
