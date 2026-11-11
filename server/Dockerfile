FROM node:22-alpine
WORKDIR /app

# pg_dump for the automatic backup taken at start-up (lib/backup.js). The
# client may be newer than the database server, never older.
RUN apk add --no-cache postgresql16-client || apk add --no-cache postgresql-client
# In the container an update never migrates the database without a backup.
ENV BACKUP_ON_START=required

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p uploads backups

EXPOSE 3001
CMD ["node", "index.js"]
