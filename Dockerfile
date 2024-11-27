# Dockerfile
FROM oven/bun:1 as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile
RUN apt-get update && apt-get install -y netcat

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose the port
EXPOSE 3000

# Run the app
CMD ["sh", "-c", "until nc -z mongo1 27017; do echo waiting for mongodb; sleep 2; done; bun run src/index.ts"]