# Restaurant Virtual Assistant

This project includes a Firebase Cloud Function that needs to be deployed separately.

## Deploying the Firebase Function

To deploy the Firebase function, follow these steps in your local development environment:

1. Install Firebase CLI globally:
   ```
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```
   firebase login
   ```

3. Navigate to the project directory and install dependencies:
   ```
   cd functions
   npm install
   ```

4. Deploy the functions:
   ```
   firebase deploy --only functions
   ```

Note: Make sure you have the necessary permissions for the Firebase project "chella-aea4b" before attempting to deploy.

## Development

For local development and testing, you can use Firebase emulators:

1. Start the emulators:
   ```
   firebase emulators:start
   ```

2. Your function will be available locally for testing.

Remember to update any environment variables or configuration settings in your local Firebase project before deploying.