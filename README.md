# Anonim Chatbot

Anonymous Chatbot is an instant messaging application that allows users to communicate with a bot without having to provide their identity information. With an intuitive design and user-friendly interface, Anonymous Chatbot enables users to exchange messages with the bot without fearing the disclosure of personal data.

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
