# Build do Angular 16; nginx serve o estático e faz o proxy de /api e /storage.
FROM node:20 AS build
WORKDIR /app
COPY package.json package-lock.json ./
# primeng 17 x Angular 16: peer range não bate, o lock já resolve.
RUN npm ci --legacy-peer-deps
COPY . .
RUN npm run build -- --configuration production

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/app/EST-REUTILIZAVEL-frontend /usr/share/nginx/html
