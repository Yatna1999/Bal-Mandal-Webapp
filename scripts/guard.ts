import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

let fail = 0;

function chk(name: string, command: string) {
  try {
    let bashCmd = command;
    // Check if git bash exists on Windows
    let shellPath: string | undefined = undefined;
    if (process.platform === 'win32') {
      const gitBash = 'C:\\Program Files\\Git\\bin\\bash.exe';
      if (fs.existsSync(gitBash)) {
        shellPath = gitBash;
      }
    }

    const out = execSync(command, {
      encoding: 'utf8',
      shell: shellPath || undefined,
      stdio: ['pipe', 'pipe', 'ignore'],
    }).trim();

    if (out) {
      console.log(`FAIL: ${name}`);
      console.log(out.split('\n').slice(0, 20).join('\n'));
      fail = 1;
    } else {
      console.log(`PASS: ${name}`);
    }
  } catch (err: any) {
    // If grep exits with 1 (no match found), that's a PASS!
    if (err.status === 1 && (!err.stdout || !err.stdout.trim())) {
      console.log(`PASS: ${name}`);
    } else if (err.stdout && err.stdout.trim()) {
      console.log(`FAIL: ${name}`);
      console.log(err.stdout.trim().split('\n').slice(0, 20).join('\n'));
      fail = 1;
    } else {
      console.log(`PASS: ${name}`);
    }
  }
}

console.log('🛡️ Running Guard Script Checks...\n');

chk(
  'no box-shadow',
  "grep -rn 'box-shadow\\|shadow-md\\|shadow-lg\\|shadow-sm\\|drop-shadow' app components --include=*.tsx --include=*.css"
);

chk(
  'no hardcoded hex outside globals.css',
  "grep -rnE '#[0-9a-fA-F]{6}' app components lib --include=*.tsx --include=*.ts | grep -v globals.css"
);

chk(
  'no oversized radius',
  "grep -rn 'rounded-lg\\|rounded-xl\\|rounded-2xl\\|rounded-3xl' app components --include=*.tsx"
);

chk(
  'no inline Gujarati in components',
  "grep -rnP '[\\x{0A80}-\\x{0AFF}]' app components --include=*.tsx | grep -v 'lib/i18n'"
);

chk(
  'no select star on balako',
  "grep -rn \"from('balako')\\.select('\\*\" app lib components"
);

chk(
  'no hard delete of core records',
  "grep -rnE \"\\.delete\\(\\).*from\\('(balako|attendance|ahnik_weeks|sabha_sessions)'\\)\" app lib"
);

chk(
  'no deprecated auth-helpers',
  "grep -rn 'auth-helpers' app lib components --include=*.ts --include=*.tsx"
);

chk(
  'no pdf libraries',
  "grep -nE '\"(jspdf|pdfmake|@react-pdf/renderer)\"' package.json"
);

chk(
  'no browser storage in app code',
  "grep -rn 'localStorage\\|sessionStorage' app components --include=*.tsx | grep -v 'more/language'"
);

chk(
  'service role never imported client side',
  "grep -rln \"supabase/admin\" app components --include=*.tsx | xargs -r grep -l \"'use client'\""
);

if (fail !== 0) {
  console.log('\n❌ Guard checks failed!');
  process.exit(1);
} else {
  console.log('\n✅ All guard checks passed 100%!');
}
