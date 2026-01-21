# MaxClaim Application Dockerfile
# Multi-stage build for optimized production image

# Stage 1: Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S maxclaim -u 1001 -G nodejs

# Copy built assets and dependencies
COPY --from=builder --chown=maxclaim:nodejs /app/dist ./dist
COPY --from=builder --chown=maxclaim:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=maxclaim:nodejs /app/package.json ./

# Copy static assets if any
COPY --from=builder --chown=maxclaim:nodejs /app/client/public ./client/public

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

# Expose port
EXPOSE 5000

# Switch to non-root user
USER maxclaim

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

# Start the application
CMD ["node", "dist/server/index.js"]
