# Build stage
FROM node:14 AS build

WORKDIR /app
COPY package.json ./
RUN yarn install
COPY . .
RUN yarn build

# Production stage
FROM nginx:stable-alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY ./nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
