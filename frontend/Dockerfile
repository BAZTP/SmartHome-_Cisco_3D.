FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN --mount=type=secret,id=npm_ca,target=/tmp/npm-ca \
    if [ -f /tmp/npm-ca ]; then export NODE_EXTRA_CA_CERTS=/tmp/npm-ca; fi; \
    npm ci
COPY . .
RUN npm run build:local
FROM nginx:stable-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
