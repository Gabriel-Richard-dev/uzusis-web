# Build do Angular; o nginx serve o estático e é a origem única (/api, /auth, /storage).
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN NODE_OPTIONS=--max-old-space-size=2048 npx ng build --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/uzusis /usr/share/nginx/html
