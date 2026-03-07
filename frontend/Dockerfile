FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npm install @rollup/rollup-linux-x64-musl || true

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
