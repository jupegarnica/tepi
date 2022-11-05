import { cli } from './src/cli.ts';

if (import.meta.main) {
    await cli();
}