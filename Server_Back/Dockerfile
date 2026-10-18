FROM node:20-slim

# Install OpenSSL required by Prisma
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# Copy schema folder before npm install triggers postinstall
COPY prisma ./prisma/

RUN npm install --omit=dev

COPY . .

EXPOSE 8080

CMD ["node", "Server.js"]