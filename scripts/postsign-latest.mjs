// 签名后重算 latest.yml 的 sha512 / size
// 签名会改变安装包字节，若不重算，electron-updater 校验会失败。
// 用法：node scripts/postsign-latest.mjs <latest.yml> <signed.exe>
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, statSync } from 'node:fs';

const [, , ymlPath, exePath] = process.argv;
if (!ymlPath || !exePath) {
  console.error('用法: node scripts/postsign-latest.mjs <latest.yml> <signed.exe>');
  process.exit(1);
}

const buf = readFileSync(exePath);
const sha512 = createHash('sha512').update(buf).digest('base64');
const size = statSync(exePath).size;

let yml = readFileSync(ymlPath, 'utf8');
// 替换所有 sha512 行（files[] 与顶层各一处）
yml = yml.replace(/sha512:\s*[^,\n]+/g, `sha512: ${sha512}`);
// 替换 files[] 里的 size（只替换 files 段落里第一个 size）
yml = yml.replace(/(files:\n(?:.*\n)*?\s+size:\s*)\d+/, `$1${size}`);

writeFileSync(ymlPath, yml, 'utf8');
console.log(`latest.yml 已更新：size=${size} sha512=${sha512.slice(0, 24)}…`);
