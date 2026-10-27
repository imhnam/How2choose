import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: 'apps/api/.env' });
const scrypt = promisify(scryptCallback);

function usage() {
  console.error([
    'Cách dùng: npm run admin:promote -- <email-hoặc-số-điện-thoại> [--name="Tên hiển thị"] [--password="Mật khẩu"]',
    '',
    'Tài khoản phải tồn tại trước, hoặc truyền --name để tạo tài khoản quản trị mới.',
    'Nếu bỏ qua --password, script sẽ tạo mật khẩu ngẫu nhiên và in ra một lần.',
  ].join('\n'));
}

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (const arg of argv) {
    const match = arg.match(/^--([a-z-]+)=(.*)$/i);
    if (match) flags[match[1]] = match[2];
    else positional.push(arg);
  }
  return { positional, flags };
}

function normalizeIdentifier(input) {
  const value = input.trim();
  if (value.includes('@')) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      throw new Error('Email không hợp lệ.');
    }
    return { email };
  }
  const phone = value.replace(/[\s()-]/g, '');
  const normalized = /^0\d{9}$/.test(phone) ? '+84' + phone.slice(1) : phone;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
    throw new Error('Số điện thoại không hợp lệ. Dùng 0xxxxxxxxx hoặc định dạng E.164.');
  }
  return { phone: normalized };
}

async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return salt + ':' + hash.toString('hex');
}

function generatePassword() {
  return randomBytes(18).toString('base64url');
}

async function run() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const identifier = positional[0];
  if (!identifier) {
    usage();
    process.exitCode = 1;
    return;
  }
  if (!process.env.DATABASE_URL) throw new Error('Thiếu DATABASE_URL. Chạy npm run setup trước.');

  const key = normalizeIdentifier(identifier);
  const password = flags.password || generatePassword();
  if (password.length < 8) throw new Error('Mật khẩu phải có ít nhất 8 ký tự.');
  const passwordHash = await hashPassword(password);

  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await client.query(
      'SELECT "id", "role" FROM "User" WHERE ("email" = $1 AND $1::text IS NOT NULL) OR ("phone" = $2 AND $2::text IS NOT NULL) LIMIT 1',
      [key.email ?? null, key.phone ?? null],
    );
    let userId;
    let created = false;
    if (existing.rows.length) {
      userId = existing.rows[0].id;
      await client.query('UPDATE "User" SET "role" = \'ADMIN\', "passwordHash" = $2, "updatedAt" = NOW() WHERE "id" = $1', [userId, passwordHash]);
    } else {
      const displayName = (flags.name ?? '').trim();
      if (displayName.length < 2) throw new Error('Tài khoản chưa tồn tại. Hãy đăng ký trước hoặc truyền --name="Tên hiển thị" để tạo mới.');
      userId = 'adm_' + randomBytes(12).toString('hex');
      await client.query(
        'INSERT INTO "User" ("id", "email", "phone", "displayName", "passwordHash", "role", "updatedAt") VALUES ($1, $2, $3, $4, $5, \'ADMIN\', NOW())',
        [userId, key.email ?? null, key.phone ?? null, displayName, passwordHash],
      );
      created = true;
    }
    await client.query('COMMIT');
    console.log(created ? 'Đã tạo tài khoản quản trị:' : 'Đã cấp quyền quản trị cho tài khoản:');
    console.log('  ' + (key.email ?? key.phone));
    console.log('  Mật khẩu: ' + password);
    console.log('Hãy đổi mật khẩu sau lần đăng nhập đầu tiên và không chia sẻ thông tin này.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
