FROM node:22-alpine

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .
RUN npm run build && npm prune --omit=dev && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["npm", "start"]
