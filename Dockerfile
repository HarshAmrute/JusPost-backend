# JusPost Backend Dockerfile
# Use official lightweight Node.js image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install dependencies first (leverages Docker layer caching)
COPY package*.json ./
RUN npm ci --only=production

# Bundle app source
COPY . .

# Expose backend port
ENV PORT=5001
EXPOSE 5001

# Start the server
CMD ["npm", "start"]
