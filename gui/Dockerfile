# This Dockerfile is kept for standalone development use.
# In production the nginx/Dockerfile builds the frontend as a multi-stage step.
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

COPY . .

EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]