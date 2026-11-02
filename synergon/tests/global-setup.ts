import { execSync } from 'node:child_process';

/** Unit tests run against their own database so they never clobber the dev/demo data. */
export default function setup() {
  execSync('npx prisma db push --skip-generate', { stdio: 'ignore', env: { ...process.env } });
}
