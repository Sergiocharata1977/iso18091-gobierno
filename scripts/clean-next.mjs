import { rm } from 'node:fs/promises';
import path from 'node:path';

const nextDir = path.join(process.cwd(), '.next');
const retryDelaysMs = [0, 250, 500, 1000];

for (const delay of retryDelaysMs) {
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  try {
    await rm(nextDir, {
      force: true,
      maxRetries: 0,
      recursive: true,
    });
    process.exit(0);
  } catch (error) {
    if (error && typeof error === 'object' && 'code' in error) {
      const code = String(error.code);
      if (code === 'ENOENT') {
        process.exit(0);
      }

      if (code === 'EPERM' || code === 'EBUSY' || code === 'ENOTEMPTY') {
        continue;
      }
    }

    throw error;
  }
}

console.error(
  'Could not remove .next because it is locked by another process. Stop `next dev` or close the process holding `.next/trace`, then retry the build.'
);
process.exit(1);
