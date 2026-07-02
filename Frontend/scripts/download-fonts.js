import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FONTS_DIR = path.join(__dirname, '..', 'assets', 'fonts');
const FONT_URLS = {
  'Poppins-Regular.ttf': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf',
  'Poppins-Medium.ttf': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Medium.ttf',
  'Poppins-SemiBold.ttf': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf',
  'Poppins-Bold.ttf': 'https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Bold.ttf'
};

// Create fonts directory if it doesn't exist
if (!fs.existsSync(FONTS_DIR)) {
  fs.mkdirSync(FONTS_DIR, { recursive: true });
}

// Download each font file
Object.entries(FONT_URLS).forEach(([filename, url]) => {
  const filePath = path.join(FONTS_DIR, filename);
  
  // Skip if file already exists
  if (fs.existsSync(filePath)) {
    console.log(`${filename} already exists, skipping...`);
    return;
  }

  console.log(`Downloading ${filename}...`);
  
  https.get(url, (response) => {
    if (response.statusCode === 200) {
      const file = fs.createWriteStream(filePath);
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded ${filename}`);
      });
    } else {
      console.error(`Failed to download ${filename}: ${response.statusCode}`);
    }
  }).on('error', (err) => {
    console.error(`Error downloading ${filename}: ${err.message}`);
  });
});