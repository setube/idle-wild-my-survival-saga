FROM oven/bun:1.4.5 AS build

WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run check

FROM nginx:stable-alpine
COPY --from=build /app/docs /usr/share/nginx/html
EXPOSE 80
