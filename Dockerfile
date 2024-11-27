# Dockerfile
FROM oven/bun:alpine as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
# Install netcat for the wait-for-it functionality
RUN apk add --no-cache netcat-openbsd
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose the port
EXPOSE 3000

# Run the app
CMD ["sh", "-c", "until nc -z mongo1 27017; do echo waiting for mongodb; sleep 2; done; bun run src/index.ts"]