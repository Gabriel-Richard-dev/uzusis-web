# Build do Angular; o nginx serve o estático e é a origem única (/api, /auth, /storage).
# Angular 22 exige Node ^22.22.3 || ^24.15.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN NODE_OPTIONS=--max-old-space-size=2048 npx ng build --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
# O builder application (esbuild) grava o estático em dist/<projeto>/browser.
COPY --from=build /app/dist/uzusis/browser /usr/share/nginx/html
