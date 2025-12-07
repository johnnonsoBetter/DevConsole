# Dockerfile for LiveKit Agent with STT Transcription
# For more information: https://docs.livekit.io/agents/ops/deployment/builds/
# syntax=docker/dockerfile:1

# Use the official Node.js v22 base image
ARG NODE_VERSION=22
FROM node:${NODE_VERSION}-slim AS base

# Install required system packages
# ca-certificates: enables TLS/SSL for securely fetching dependencies
RUN apt-get update -qq && apt-get install --no-install-recommends -y ca-certificates && rm -rf /var/lib/apt/lists/*

# Create working directory
WORKDIR /app

# Copy dependency files first for efficient layer caching
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm ci

# Copy all remaining application files
COPY . .

# Build the project
RUN npm run build

# Create a non-privileged user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/app" \
    --shell "/sbin/nologin" \
    --uid "${UID}" \
    appuser

# Set proper permissions
RUN chown -R appuser:appuser /app
USER appuser

# Pre-download ML models (Silero VAD)
RUN npm run download-files

# Remove dev dependencies
USER root
RUN npm prune --production && chown -R appuser:appuser /app
USER appuser

# Set Node.js to production mode
ENV NODE_ENV=production

# Run the agent
CMD [ "npm", "start" ]
