// One-time helper: sign in as the instructor and print a Google refresh token for .env / Netlify.
// Usage: GOOGLE_CLIENT_ID=... GOOGLE_CLIENT_SECRET=... npm run google-auth
import { createServer } from 'node:http';

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
if (!clientId || !clientSecret) {
  console.error('Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET first (see docs/SETUP.md).');
  process.exit(1);
}

const port = 53682;
const redirectUri = `http://localhost:${port}/callback`;
const scopes = [
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.freebusy',
];

const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
authUrl.search = new URLSearchParams({
  client_id: clientId,
  redirect_uri: redirectUri,
  response_type: 'code',
  scope: scopes.join(' '),
  access_type: 'offline',
  prompt: 'consent',
}).toString();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, redirectUri);
  if (url.pathname !== '/callback') return res.writeHead(404).end();
  const code = url.searchParams.get('code');
  if (!code) {
    res.end(`Sign-in failed: ${url.searchParams.get('error')}`);
    return server.close();
  }
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ code, client_id: clientId, client_secret: clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' }),
  });
  const tokens = await tokenRes.json();
  if (!tokens.refresh_token) {
    res.end('No refresh token returned. See the terminal.');
    console.error(tokens);
  } else {
    res.end('Done! You can close this tab and go back to the terminal.');
    console.log(`\nGOOGLE_REFRESH_TOKEN=${tokens.refresh_token}\n`);
    console.log('Add that to your .env file and to Netlify environment variables. Keep it secret.');
  }
  server.close();
});

server.listen(port, () => {
  console.log('Open this URL and sign in with the Google account whose calendar you teach from:\n');
  console.log(authUrl.toString());
});
