# One image: builds the React app, then serves it and the API from Express (PORT is set by the host; 8080 by default).
FROM node:22-slim AS build
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --ignore-scripts
COPY . .
RUN npx prisma generate --schema server/prisma/schema.prisma && npm run build -w client

FROM node:22-slim
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production PORT=8080
COPY package*.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --omit=dev --ignore-scripts -w server
COPY server server
COPY --from=build /app/client/dist client/dist
RUN npx prisma generate --schema server/prisma/schema.prisma && mkdir -p uploads && chown -R node:node /app
USER node
EXPOSE 8080
# Migrations are run separately (`npm run db:deploy`), not at container start.
CMD ["node", "server/src/server.js"]
