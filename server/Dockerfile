FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
EXPOSE 5000
# Apply the schema, then start the API.
CMD ["sh", "-c", "node src/db/migrate.js && node src/server.js"]
