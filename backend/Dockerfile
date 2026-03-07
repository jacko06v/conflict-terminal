FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

EXPOSE 4000

CMD ["npm", "run", "dev"]
