FROM node:20-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build React frontend
COPY . .
RUN npm run build

# Data directory — mount a persistent volume here on Railway/Render
RUN mkdir -p server/data

EXPOSE 3001
ENV NODE_ENV=production

CMD ["node", "server/server.js"]
