export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable ${name}`);
  return value;
}

export const optionalEnv = (name: string) => process.env[name] || undefined;

export const siteUrl = () => (process.env.SITE_URL || process.env.URL || 'http://localhost:8888').replace(/\/$/, '');
