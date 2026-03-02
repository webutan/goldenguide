FROM node:22-alpine
WORKDIR /app

COPY server/package.json server/package-lock.json ./
RUN npm ci --omit=dev

COPY server/ .
COPY sql/ ./sql/
RUN mkdir -p uploads

EXPOSE 3001
CMD ["node", "index.js"]
