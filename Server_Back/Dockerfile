FROM node:20-slim

# Install OpenSSL & certificates required by Prisma's query engine on Debian
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Copy schema folder before npm install so postinstall (`prisma generate`) has access to schema.prisma
COPY prisma ./prisma/

# Install production dependencies
RUN npm install --omit=dev

# Copy application code
COPY . .

# Force-generate Prisma Client inside the Linux container environment
RUN npx prisma generate

EXPOSE 8080

CMD ["node", "Server.js"]