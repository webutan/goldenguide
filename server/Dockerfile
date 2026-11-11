# Alpine 3.22 is pinned because it still ships the PostgreSQL 16 client, the
# same major version as the `db` service. When the database image is upgraded,
# move this to an Alpine release that has the matching client.
FROM node:22-alpine3.22
WORKDIR /app

# pg_dump for the automatic backup taken at start-up (lib/backup.js). A newer
# client can dump an older server, so fall back rather than fail the build;
# scripts/restore-db.sh drops the few lines a newer client adds.
RUN apk add --no-cache postgresql16-client \
 || apk add --no-cache postgresql17-client \
 || apk add --no-cache postgresql-client
# In the container an update never migrates the database without a backup.
ENV BACKUP_ON_START=required

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .
RUN mkdir -p uploads backups

EXPOSE 3001
CMD ["node", "index.js"]
