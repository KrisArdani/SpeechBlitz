FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install --omit=dev

# Bundle app source
COPY server.js .
COPY public ./public

# Bind to the port provided by Cloud Run (defaulting to 8080)
ENV PORT=8080
EXPOSE 8080

CMD [ "npm", "start" ]
