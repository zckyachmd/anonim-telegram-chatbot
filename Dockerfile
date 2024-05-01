FROM node:18-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Copy .env file into container
COPY .env ./

# Build the application
RUN npm run build

# Command to run the application
CMD [ "npm", "start" ]
