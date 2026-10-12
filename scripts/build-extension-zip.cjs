const fs = require('fs');
const path = require('path');
const JSZip = require('jszip');

async function buildExtensionZip() {
  const extensionDir = path.resolve(__dirname, '../public/extension');
  const outputZipPath = path.resolve(__dirname, '../public/kyotei-teleboat-pc-extension.zip');

  if (!fs.existsSync(extensionDir)) {
    console.error('Extension directory not found:', extensionDir);
    process.exit(1);
  }

  const zip = new JSZip();
  const files = fs.readdirSync(extensionDir);

  for (const file of files) {
    const fullPath = path.join(extensionDir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile()) {
      const data = fs.readFileSync(fullPath);
      zip.file(file, data);
      console.log(`Added to zip: ${file} (${data.length} bytes)`);
    }
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });

  fs.writeFileSync(outputZipPath, content);
  console.log(`Successfully generated: ${outputZipPath} (${content.length} bytes)`);
}

buildExtensionZip().catch((err) => {
  console.error('Failed to build extension zip:', err);
  process.exit(1);
});
