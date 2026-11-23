FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --chown=node:node package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --chown=node:node *.html *.js *.css favicon.svg server.mjs robots.txt ./
COPY --chown=node:node src ./src
COPY --chown=node:node assets ./assets
COPY --chown=node:node vendor ./vendor
RUN mkdir /data && chown node:node /data
USER node
ENV NODE_ENV=production PORT=4173 DATA_DIR=/data
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=4s --start-period=30s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","server.mjs"]
