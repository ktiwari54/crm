# CRM — Cloud Database Setup (No Docker)

Use this if **Docker Desktop won't start** on your Windows laptop.

## Option A: Prisma Postgres (already configured)

A free cloud database was created for this project.

1. Open `apps/api/.env` — `DATABASE_URL` points to the cloud DB.
2. **Claim your database** (free, permanent) before it auto-deletes:
   - Open: https://create-db.prisma.io/claim?projectID=proj_cmqlff7wy0gbr03l7jchyygcn
   - Sign in with GitHub/Google (no credit card)
3. Run from project root:

```bash
cd C:\Users\PC\Desktop\CRM
npm install
npm run db:generate
cd apps/api
npx prisma db push
npm run prisma:seed
```

4. Start the app:

```bash
cd C:\Users\PC\Desktop\CRM
npm run dev:api
npm run dev:web
```

Login: `admin@crm.local` / `Admin123!`

---

## Option B: Neon (free forever — recommended long-term)

1. Go to https://neon.tech and sign up (free, no credit card).
2. Create a project → copy the **connection string**.
3. Replace `DATABASE_URL` in `apps/api/.env`:

```
DATABASE_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

4. Run:

```bash
npx prisma db push
npm run prisma:seed
```

**Neon free tier:** 512 MB storage, always free for dev.

---

## Option C: Supabase (free)

1. Go to https://supabase.com → New project.
2. Settings → Database → copy **URI** connection string.
3. Put it in `apps/api/.env` as `DATABASE_URL`.
4. Run `npx prisma db push` and `npm run prisma:seed`.

---

## Docker (when it works on your laptop)

If Docker Desktop eventually loads:

```bash
docker desktop start
cd C:\Users\PC\Desktop\CRM
docker compose up -d
```

Then switch `.env` back to local:

```
DATABASE_URL=postgresql://crm:crm_dev_password@localhost:5432/crm?schema=public
```

### Docker fix checklist (Windows)

1. Install **WSL 2** + **Ubuntu**: `wsl --install -d Ubuntu`
2. Open **Docker Desktop** from Start menu — wait until green "Running"
3. If stuck: `wsl --shutdown` → restart Docker Desktop
4. Enable **Virtualization** in BIOS if Docker says it's disabled
5. Settings → General → **Use WSL 2 based engine** ✓