FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --production
COPY . .
VOLUME ["/usr/src/app/data"]
EXPOSE 3000
CMD ["node", "backend/server.js"]
