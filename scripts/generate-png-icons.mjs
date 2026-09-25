import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Function to generate valid uncompressed/deflate PNG binary buffers
function createPng(width, height, getPixel) {
  // Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace
  const ihdrChunk = makeChunk('IHDR', ihdrData);

  // Raw image data with 1 filter byte (0) per scanline
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawData.writeUInt8(0, offset++); // Filter type: None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixel(x, y, width, height);
      rawData.writeUInt8(r, offset++);
      rawData.writeUInt8(g, offset++);
      rawData.writeUInt8(b, offset++);
      rawData.writeUInt8(a, offset++);
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function crc32(buf) {
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    const byte = buf[i];
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) c = 0xedb88320 ^ (c >>> 1);
    else c = c >>> 1;
  }
  crcTable[n] = c;
}

function makeChunk(type, data) {
  const len = data.length;
  const buf = Buffer.alloc(12 + len);
  buf.writeUInt32BE(len, 0);
  buf.write(type, 4, 4, 'ascii');
  data.copy(buf, 8);
  const typeAndData = buf.subarray(4, 8 + len);
  const crcVal = crc32(typeAndData);
  buf.writeUInt32BE(crcVal, 8 + len);
  return buf;
}

// Pixel shader for Bengkel icon
function bengkelShader(x, y, w, h, isMaskable = false) {
  const cx = w / 2;
  const cy = h / 2;
  const dx = x - cx;
  const dy = y - cy;
  const dist = Math.sqrt(dx * dx + dy * dy);

  // Background color #0f172a (dark slate navy)
  let r = 15, g = 23, b = 42, a = 255;

  if (!isMaskable) {
    // Rounded corner for regular icons
    const cornerR = w * 0.22;
    const qx = Math.max(0, Math.abs(dx) - (w / 2 - cornerR));
    const qy = Math.max(0, Math.abs(dy) - (h / 2 - cornerR));
    const cornerDist = Math.sqrt(qx * qx + qy * qy);
    if (cornerDist > cornerR) {
      return [0, 0, 0, 0]; // Transparent outside rounded corner
    }
  }

  // Outer ring (emerald green #10b981)
  const ringR = w * 0.38;
  const ringThick = w * 0.035;
  if (Math.abs(dist - ringR) < ringThick) {
    return [16, 185, 129, 255];
  }

  // Inner circle
  const innerR = w * 0.26;
  if (dist < innerR) {
    // Center gear/core
    if (dist < w * 0.12) {
      if (dist < w * 0.05) {
        return [16, 185, 129, 255]; // center green dot
      }
      return [30, 41, 59, 255]; // center dark circle
    }
    // Tool cross
    const diag1 = Math.abs(dx - dy) / Math.SQRT2;
    const diag2 = Math.abs(dx + dy) / Math.SQRT2;
    const toolThick = w * 0.045;
    if (diag1 < toolThick || diag2 < toolThick) {
      return [241, 245, 249, 255]; // silver white tool arms
    }
  }

  return [r, g, b, a];
}

const publicDir = path.resolve('public');
fs.mkdirSync(publicDir, { recursive: true });

// 1. 192x192
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createPng(192, 192, (x, y, w, h) => bengkelShader(x, y, w, h, false)));
// 2. 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createPng(512, 512, (x, y, w, h) => bengkelShader(x, y, w, h, false)));
// 3. Apple Touch Icon 180x180
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createPng(180, 180, (x, y, w, h) => bengkelShader(x, y, w, h, false)));
// 4. Maskable 512x512
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createPng(512, 512, (x, y, w, h) => bengkelShader(x, y, w, h, true)));

console.log('All PWA PNG icons generated successfully!');
