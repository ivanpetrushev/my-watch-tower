# syntax=docker/dockerfile:1

ARG NODE_VERSION=22.20.0

FROM node:${NODE_VERSION}-alpine AS base

WORKDIR /usr/src/app

################################################################################
# Build the application in a separate stage
FROM base AS build

COPY . .

RUN npm ci && npm run build

################################################################################
# Create a new stage to run the application with minimal runtime dependencies
# where the necessary files are copied from the build stage.
FROM base AS final

ENV NODE_ENV=production

RUN npm install serve@14.2.6

USER node

COPY --from=build /usr/src/app/dist ./dist

EXPOSE 5173

CMD ["npx", "serve", "-s", "dist", "-p", "5173"]