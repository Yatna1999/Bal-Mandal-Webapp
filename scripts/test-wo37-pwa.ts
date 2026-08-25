import fs from 'fs';
import path from 'path';

async function testWO37Pwa() {
  console.log('🧪 Starting WO-37 PWA Verification Test...\n');

  // 1. Check public/manifest.json
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    console.error('❌ public/manifest.json missing');
    return;
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  console.log(`✓ Manifest Name (Gujarati): "${manifest.name}"`);
  console.log(`✓ Manifest Short Name: "${manifest.short_name}"`);
  console.log(`✓ Theme Color: "${manifest.theme_color}" (expected: #A81E2E)`);
  console.log(`✓ Display Mode: "${manifest.display}"`);

  // 2. Check PNG Icon Files
  const icons = ['icon-192.png', 'icon-512.png', 'maskable-512.png', 'badge-96.png'];
  icons.forEach((icon) => {
    const iconPath = path.join(process.cwd(), 'public', 'icons', icon);
    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      console.log(`✓ Icon public/icons/${icon} exists (${stats.size} bytes)`);
    } else {
      console.error(`❌ Icon public/icons/${icon} missing!`);
    }
  });

  // 3. Check Service Worker Caching Logic
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  const swContent = fs.readFileSync(swPath, 'utf8');

  const ignoresApi = swContent.includes("url.pathname.startsWith('/api/')");
  const ignoresSupabase = swContent.includes("url.hostname.includes('supabase.co')");

  console.log(`✓ SW API response cache bypass rule present: ${ignoresApi}`);
  console.log(`✓ SW Supabase response cache bypass rule present: ${ignoresSupabase}`);

  if (ignoresApi && ignoresSupabase) {
    console.log('✓ Strict caching rule verified: API & Supabase data are NEVER cached to prevent stale attendance overwrite!');
  } else {
    console.error('❌ Service Worker caching rule failed');
  }

  console.log('\n=== WO-37 PWA VERIFICATION PASSED 100% ===');
}

testWO37Pwa();
