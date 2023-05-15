FROM node:16 AS build
WORKDIR /app
COPY package.json ./
RUN yarn install
COPY . .
RUN yarn build

FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
