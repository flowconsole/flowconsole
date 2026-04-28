import { cpSync, rmSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const src = resolve('packages/viewer/dist');
const dst = resolve('engine/src/FlowConsole.Cli/Resources/web');

rmSync(dst, { recursive: true, force: true });
mkdirSync(dst, { recursive: true });
cpSync(src, dst, { recursive: true });
