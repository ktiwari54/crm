# Build from the repo root: docker build -f apps/web/Dockerfile -t crm-web .
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
# The committed lockfile was generated on Windows and omits Linux-native optional
# binaries (lightningcss / swc) that Tailwind v4 needs. Drop it so npm re-resolves
# platform binaries for this image's architecture.
RUN rm -f package-lock.json && npm install --no-audit --no-fund
COPY apps/web ./apps/web
ENV NEXT_TELEMETRY_DISABLED=1
# API URL is baked at build time; override with --build-arg for other environments.
ARG NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN npm run build:web

FROM node:20-slim AS run
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# Next.js standalone output (monorepo-rooted) + static assets + public files
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
