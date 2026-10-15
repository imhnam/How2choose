import { copyFileSync, existsSync, constants } from 'node:fs';
for (const [source, target] of [['apps/api/.env.example','apps/api/.env'], ['apps/web/.env.example','apps/web/.env.local']]) {
  if (!existsSync(target)) { copyFileSync(source,target,constants.COPYFILE_EXCL); console.log('Created '+target); }
  else console.log('Kept existing '+target);
}
