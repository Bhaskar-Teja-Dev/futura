import fs from 'fs';
import { execSync } from 'child_process';

const envFile = fs.readFileSync('.dev.vars', 'utf8');
const lines = envFile.split('\n');

for (const line of lines) {
  if (line.trim() && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    
    if (key && value) {
      console.log(`Uploading secret: ${key}`);
      try {
        // We use set STDIN to avoid trailing newlines and input issues
        execSync(`npx wrangler secret put ${key}`, {
          input: value,
          stdio: ['pipe', 'inherit', 'inherit']
        });
        console.log(`Successfully uploaded ${key}`);
      } catch (e) {
        console.error(`Failed to upload ${key}`, e.message);
      }
    }
  }
}
