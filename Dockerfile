FROM node:24.22.1-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/sim/package.json packages/sim/package.json
RUN npm ci
COPY . .
RUN npm run build
ENV NODE_ENV=production
ENV CHORUSBORN_GATEWAY_ENTRY=1
EXPOSE 80
CMD ["node", "--import", "tsx", "apps/server/src/cloud/gateway.ts"]
