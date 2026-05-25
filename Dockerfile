# Stage 1: Build the React application
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# Stage 2: Serve application and backend server
FROM nginx:alpine
# Install node and npm to run the backend server
RUN apk add --no-cache nodejs npm

WORKDIR /app
# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend script
COPY server.js ./

# Copy compiled React frontend assets
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["sh", "-c", "node server.js & nginx -g 'daemon off;'"]
