FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Постоянное хранилище SQLite на /data
RUN mkdir -p /data
ENV NODE_ENV=production
ENV PORT=3001
ENV DB_PATH=/data/ruslearn.db

EXPOSE 3001
CMD ["npm", "start"]
