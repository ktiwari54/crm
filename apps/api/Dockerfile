# Build from the repo root: docker build -f apps/api/Dockerfile -t crm-api .
FROM node:20-slim AS build
WORKDIR /app
# Install workspace deps (root + both workspace manifests are needed for npm ci)
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
# Build the API + generate the Prisma client
COPY apps/api ./apps/api
RUN npm run db:generate && npm run build:api

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000
COPY --from=build /app/node_modules ./node_modules
# Workspace-nested deps (prisma, @prisma/client, etc. that npm did not hoist)
COPY --from=build /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/generated ./apps/api/generated
COPY --from=build /app/apps/api/prisma ./apps/api/prisma
# Needed by the prisma CLI (db push / migrate) at runtime, e.g. the migrate job
COPY --from=build /app/apps/api/prisma.config.ts ./apps/api/prisma.config.ts
EXPOSE 4000
CMD ["node", "apps/api/dist/src/main.js"]
