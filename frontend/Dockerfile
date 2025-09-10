FROM caddy:2.10.0-builder-alpine AS builder

RUN xcaddy build \
    --with github.com/caddy-dns/cloudflare

FROM caddy:2.10.0-alpine

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

RUN apk add npm && npm install -g @google/gemini-cli

COPY Caddyfile /etc/caddy/Caddyfile

WORKDIR /project
