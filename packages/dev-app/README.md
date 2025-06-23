# Palabra Test Application

This is a test application demonstrating the capabilities of the Palabra translation library. The application includes basic and advanced examples of real-time speech translation.

## Features

- Basic translator example with simple controls
- Advanced translator with multiple language support and real-time transcription/translation display
- Modern, responsive UI
- Easy-to-use interface

## Setup

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the `packages/dev-app` directory with the following content:
```env
VITE_PALABRA_CLIENT_ID=your_client_id
VITE_PALABRA_CLIENT_SECRET=your_client_secret
VITE_PALABRA_ENDPOINT=https://domain (optional)
```

Replace `your_client_id` and `your_client_secret` with your actual Palabra API credentials.

## Running the Application

```bash
npm run dev
```

The application will be available at `http://localhost:5173` (or another port if 5173 is busy).

## Available Examples

1. **Basic Translator**
   - Simple translation interface
   - Start/Stop translation
   - Microphone control
   - Real-time transcription display
   - Real-time translation display

2. **Advanced Translator**
   - Multiple language support
   - Real-time transcription display
   - Real-time translation display
   - Dynamic language switching
   - Advanced error handling

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_PALABRA_CLIENT_ID` | Your Palabra API client ID |
| `VITE_PALABRA_CLIENT_SECRET` | Your Palabra API client secret |
| `VITE_PALABRA_ENDPOINT` | Your API url (optional) |

To obtain these credentials, please contact the Palabra team. 