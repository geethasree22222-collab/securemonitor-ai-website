FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json server.js securemonitor.html .env.example ./
RUN mkdir -p /app/data && chown -R node:node /app
USER node
EXPOSE 3000
CMD ["npm", "start"]
