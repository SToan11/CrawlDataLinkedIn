FROM node:20-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm install
RUN npx playwright install --with-deps chromium

COPY prisma ./prisma
RUN npm run prisma:generate

COPY tsconfig.json ./
COPY src ./src

RUN npm run build

CMD ["npm", "run", "start:api"]
