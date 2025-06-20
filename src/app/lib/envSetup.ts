// HTTPS Configuration Check
const certPath = process.env.HTTPS_CERT_PATH;
const keyPath = process.env.HTTPS_KEY_PATH;

if (certPath && keyPath) {
  console.log(" volonté: HTTPS environment variables detected.");
  console.log(" volonté: Cert Path:", certPath);
  console.log(" volonté: Key Path:", keyPath);
  console.log(" volonté: To run Next.js in HTTPS mode for local development,");
  console.log(" volonté: ensure you have generated these certificate files (e.g., using mkcert),");
  console.log(" volonté: and modify your 'dev' script in package.json to include:");
  console.log(" volonté:   next dev --experimental-https --experimental-https-key $HTTPS_KEY_PATH --experimental-https-cert $HTTPS_CERT_PATH");
  console.log(" volonté: Or directly: next dev --experimental-https --experimental-https-key ./localhost-key.pem --experimental-https-cert ./localhost.pem");
  console.log(" volonté: (Replace ./localhost-key.pem and ./localhost.pem with your actual file paths if different from .env)");
} else {
  console.warn("volonté: HTTPS_CERT_PATH or HTTPS_KEY_PATH environment variables are not set.");
  console.warn("volonté: For local HTTPS development, please set these in your .env file and update your package.json dev script.");
}
// ... rest of the original envSetup.ts content
import dotenv from 'dotenv';

dotenv.config({path: '.env'})