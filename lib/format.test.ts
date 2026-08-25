import { toGu, isoWeekStart, formatTimeRangeGu, cleanMobile } from './format';

let pass = 0;
let fail = 0;

function assert(label: string, actual: string, expected: string) {
  if (actual === expected) {
    console.log(`  ✓ ${label}`);
    pass++;
  } else {
    console.error(`  ✗ ${label}`);
    console.error(`    expected: ${expected}`);
    console.error(`    actual:   ${actual}`);
    fail++;
  }
}

console.log('lib/format.ts tests\n');

assert('toGu(1234)', toGu(1234), '૧૨૩૪');

assert(
  "isoWeekStart('2026-08-26') Wednesday → Monday",
  isoWeekStart('2026-08-26'),
  '2026-08-24',
);

assert(
  "isoWeekStart('2026-08-23') Sunday → previous Monday",
  isoWeekStart('2026-08-23'),
  '2026-08-17',
);

assert(
  "formatTimeRangeGu('21:00','22:30')",
  formatTimeRangeGu('21:00', '22:30'),
  '૯:૦૦ થી ૧૦:૩૦ રાત્રે',
);

assert(
  "cleanMobile('+91 98765-43210')",
  cleanMobile('+91 98765-43210'),
  '9876543210',
);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exit(1);
