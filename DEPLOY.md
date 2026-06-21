# Deployment

Two ways to run the stack in production. Both serve the web app and API behind
Caddy with automatic HTTPS.

## Images

CI/CD publishes two images to GHCR on every push to `main`:

- `ghcr.io/ktiwari54/crm/api:latest`
- `ghcr.io/ktiwari54/crm/web:latest`

The web image is built with `NEXT_PUBLIC_API_URL=/api/v1` (relative), so the
browser calls the API on the same origin and Caddy routes `/api/*` to the API
container. No domain is baked into the image.

---

## Option A — Manual deploy on a VPS

On a server with Docker installed:

```bash
git clone https://github.com/ktiwari54/crm.git
cd crm

# Create the production env file
cat > .env <<'EOF'
DOMAIN=crm.example.com
POSTGRES_PASSWORD=<a-strong-password>
JWT_SECRET=<a-long-random-secret>
# STRIPE_SECRET_KEY=sk_live_...
# STRIPE_WEBHOOK_SECRET=whsec_...
EOF

# Log in to GHCR if the packages are private
echo <GITHUB_PAT> | docker login ghcr.io -u <github-user> --password-stdin

docker compose -f docker-compose.deploy.yml pull
docker compose -f docker-compose.deploy.yml up -d
docker compose -f docker-compose.deploy.yml run --rm migrate   # first run only
```

Point your domain's DNS A record at the server. Caddy provisions a TLS cert
automatically. The app is then live at `https://$DOMAIN`.

For Stripe: set the webhook endpoint to `https://$DOMAIN/api/v1/webhooks/stripe`.

---

## Option B — Automatic deploy from GitHub Actions

The `deploy` job in `.github/workflows/cd.yml` SSHes into the server and runs the
commands above after each successful image build. It is **disabled by default**.

To enable, in **Settings → Secrets and variables → Actions**:

| Type     | Name             | Value                                            |
|----------|------------------|--------------------------------------------------|
| Variable | `DEPLOY_ENABLED` | `true`                                           |
| Secret   | `DEPLOY_HOST`    | server IP / hostname                             |
| Secret   | `DEPLOY_USER`    | SSH user                                         |
| Secret   | `DEPLOY_SSH_KEY` | private key authorized on the server             |
| Secret   | `DEPLOY_PATH`    | absolute path to the cloned repo on the server   |

Prerequisite: clone the repo at `DEPLOY_PATH` on the server and create the `.env`
file (as in Option A) once. After that, every push to `main` redeploys.

---

## Local full-stack run (build from source, no HTTPS)

For testing the production images locally without a domain:

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml run --rm migrate
# web → http://localhost:3000, API → http://localhost:4000/api/v1
```
