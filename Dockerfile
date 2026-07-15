FROM node:20-alpine AS build
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci
COPY frontend ./frontend
RUN npm run build

FROM node:20-alpine
WORKDIR /usr/src/app

ENV NODE_ENV=production \
    PORT=3000

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY backend ./backend
COPY frontend/assets ./frontend/assets
COPY --from=build /usr/src/app/frontend/dist ./frontend/dist
RUN mkdir -p /usr/src/app/data

VOLUME ["/usr/src/app/data"]
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then((response) => { if (!response.ok) process.exit(1); }).catch(() => process.exit(1))"

CMD ["node", "backend/server.js"]
