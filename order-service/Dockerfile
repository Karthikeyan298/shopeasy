FROM node:16-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production
COPY src/ ./src/
EXPOSE 5002
CMD ["node", "src/index.js"]
