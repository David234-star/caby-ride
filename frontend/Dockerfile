FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY . .
# Disable telemetry for speed
ENV NEXT_TELEMETRY_DISABLED 1
EXPOSE 3000
CMD ["npm", "run", "dev"]