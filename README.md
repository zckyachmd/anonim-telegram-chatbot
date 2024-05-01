# Anonim Telegram Chatbot

The Anonim Telegram Chatbot operates within the Telegram platform, facilitating anonymous connections between users without the need for sharing personal information. Users can engage in random and confidential interactions while maintaining their privacy, enabling seamless connections with others without revealing their identity.

## Requirements

- [Telegram BOT API](https://core.telegram.org/bots/api)
- [Node.js](https://nodejs.org/en/)
- [Prisma](https://www.prisma.io/)
- [Docker](https://www.docker.com/)

## Installation

You can run the application using Docker. Follow the steps below to get started:

1. Clone this repository to your local directory:
```bash
git clone https://github.com/zckyachmd/anonim-telegram-chatbot
```

2. Navigate to the repository directory:
```bash
cd anonim-telegram-chatbot
```

3. Create a .env file and fill it with the required configurations:
```bash
cp .env.example .env
```

4. Configure your .env file with your database credentials and other settings.
5. Build the Docker image (if using Dockerfile):
```bash
docker build -t anonim-telegram-chatbot .
```

6. Run the container (if using Dockerfile):
```bash
docker run -d --name anonim-telegram-chatbot anonim-telegram-chatbot
```

## Contribution

Contributions are welcome! Feel free to submit pull requests or open issues for any bugs or feature requests.

## License

Copyright © 2024 oleh [Zacky Achmad](https://github.com/zckyachmd). This software is licensed under the [MIT License](LICENSE.md).
