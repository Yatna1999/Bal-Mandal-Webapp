import fs from 'fs';
import path from 'path';

// Pure Node.js script using PNG encoder format or Canvas/Zlib to create PNG icons
function createSimplePng(size: number, circleRadius: number): Buffer {
  // Simple uncompressed PNG generator
  const width = size;
  const height = size;
  const cx = width / 2;
  const cy = height / 2;

  // Background #FDFCF9 -> RGB (253, 252, 249)
  // Circle #A81E2E -> RGB (168, 30, 46)
  const bgR = 253, bgG = 252, bgB = 249;
  const cR = 168, cG = 30, cB = 46;

  // Generate raw RGBA data
  const rawData = Buffer.alloc(height * (1 + width * 4));
  let offset = 0;

  for (let y = 0; y < height; y++) {
    rawData[y * (width * 4 + 1)] = 0; // Filter type 0 (None)
    offset = y * (width * 4 + 1) + 1;
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= circleRadius) {
        rawData[offset] = cR;
        rawData[offset + 1] = cG;
        rawData[offset + 2] = cB;
        rawData[offset + 3] = 255;
      } else {
        rawData[offset] = bgR;
        rawData[offset + 1] = bgG;
        rawData[offset + 2] = bgB;
        rawData[offset + 3] = 255;
      }
      offset += 4;
    }
  }

  // We can write uncompressed PNG using zlib
  const zlib = require('zlib');
  const compressed = zlib.deflateSync(rawData);

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace
  const ihdrChunk = createChunk('IHDR', ihdr);

  // IDAT chunk
  const idatChunk = createChunk('IDAT', compressed);

  // IEND chunk
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([pngHeader, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const crc32 = require('zlib').crc32 || simpleCrc32;
  const len = data.length;
  const buf = Buffer.alloc(4 + 4 + len + 4);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);

  const typeAndData = buf.slice(4, 8 + len);
  const crc = crc32(typeAndData);
  buf.writeUInt32BE(crc >>> 0, 8 + len);
  return buf;
}

function simpleCrc32(buf: Buffer): number {
  const zlib = require('zlib');
  return zlib.crc32 ? zlib.crc32(buf) : 0;
}

async function main() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  // 1. icon-192.png (192x192, radius 60px)
  const icon192 = createSimplePng(192, 60);
  fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), icon192);

  // 2. icon-512.png (512x512, radius 160px)
  const icon512 = createSimplePng(512, 160);
  fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), icon512);

  // 3. maskable-512.png (512x512, radius 120px - inside 80% safe zone)
  const maskable512 = createSimplePng(512, 120);
  fs.writeFileSync(path.join(iconsDir, 'maskable-512.png'), maskable512);

  // 4. badge-96.png (96x96, radius 30px)
  const badge96 = createSimplePng(96, 30);
  fs.writeFileSync(path.join(iconsDir, 'badge-96.png'), badge96);

  console.log('✓ Generated icons in public/icons/ successfully!');
}

main();
