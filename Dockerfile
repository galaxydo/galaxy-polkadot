# Use the official Node.js 16.x runtime as a parent image
FROM node:16-alpine as build

# Set the working directory to /app
WORKDIR /app

# Copy package.json and yarn.lock to the container
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy the rest of the application code to the container
COPY . .

# Build the application for production
RUN yarn build

# Use Nginx as a parent image for serving the static content
FROM nginx:alpine

# Copy the build artifacts from the previous stage to the container
COPY --from=build /app/build /usr/share/nginx/html

# Copy the Nginx configuration to the container
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port 80 for incoming traffic
EXPOSE 80

# Start Nginx
CMD ["nginx", "-g", "daemon off;"]
