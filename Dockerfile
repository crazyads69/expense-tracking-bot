# Dockerfile
FROM oven/bun:alpine as base
WORKDIR /usr/src/app

# Install dependencies
COPY package.json bun.lockb ./
RUN bun install --frozen-lockfile

# Copy source code
COPY . .

# Generate Prisma client
RUN bunx prisma generate

# Expose the port
EXPOSE 3000

# Run the app
CMD ["bun", "run", "src/index.ts"]