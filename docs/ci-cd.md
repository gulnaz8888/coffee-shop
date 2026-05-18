# CI/CD for This Project

## What the project actually is

This repository is not the monolith described in `README.md`.
The real runnable app is:

- local development and smoke testing: `docker-compose.yml`
- production-style deployment: `k8s/*.yaml`
- services: `services/*`
- frontend image: `nginx/`

Because of that, the safest CI/CD path is:

1. `CI` validates the current source and builds Docker images.
2. `CD` publishes images to `GHCR`.
3. `CD` deploys Kubernetes manifests and injects your own secrets at deploy time.

## What was changed

- services now read `MONGO_URI` and `PORT` from environment variables
- `payment-service` was added to Kubernetes manifests
- frontend Kubernetes deployment now uses the custom `nginx` image from this repo
- hardcoded Kubernetes secrets were removed from tracked manifests
- GitHub Actions workflows were added in `.github/workflows/`

## Required GitHub Secrets

Create these repository secrets:

- `KUBECONFIG_B64`: base64 of your kubeconfig file
- `JWT_SECRET`: JWT secret for auth services
- `UNSPLASH_ACCESS_KEY`: key for external service
- `GHCR_USERNAME`: your GitHub username
- `GHCR_TOKEN`: GitHub PAT with at least `read:packages`

Create this repository variable if you do not want to use `default` namespace:

- `KUBE_NAMESPACE`

## How to prepare kubeconfig

On your machine:

```bash
base64 -w 0 ~/.kube/config
```

Copy the output into GitHub Secret `KUBECONFIG_B64`.

If you are on Windows PowerShell:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("$HOME\\.kube\\config"))
```

## How the workflows behave

### CI

File: `.github/workflows/ci.yml`

Runs on push and pull request:

- `docker compose config`
- `node --check` for each service entrypoint
- `kubectl kustomize k8s`
- `docker compose build`

### CD

File: `.github/workflows/cd.yml`

Runs on push to `main` or manually:

- builds all service and frontend images
- pushes images to `ghcr.io/<your-github-owner>/...`
- creates or updates Kubernetes secrets
- rewrites image tags in kustomize
- applies manifests
- waits for deployment rollout

## What you still need to replace with your own data

- old Terraform state and tfvars files in the repo should not be reused as-is
- if you keep using Terraform, replace `project_id`, `repo_url`, SSH keys, and any VM-specific values with your own
- if you do not use Kubernetes, adapt `cd.yml` to your VM or Render target instead of applying `k8s/`

## Practical sequence

1. Fork the repo to your own GitHub account.
2. Push these changes to your branch.
3. Add the GitHub secrets listed above.
4. Merge into `main`.
5. Run `CD` manually once from GitHub Actions.
6. Check `kubectl get pods -n <namespace>`.
