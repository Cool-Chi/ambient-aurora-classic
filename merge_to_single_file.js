const fs = require('fs');
const path = require('path');

const inputHtmlPath = path.join(__dirname, 'index.html');
const outputDir = path.join(__dirname, 'dist');
const outputHtmlPath = path.join(outputDir, 'index.html');

console.log('Starting merge process...');

// Read the original index.html
let htmlContent = fs.readFileSync(inputHtmlPath, 'utf-8');

// Regex to find CSS links
// e.g. <link rel="stylesheet" href="css/style.css">
const linkRegex = /<link\s+rel=["']stylesheet["']\s+href=["']([^"']+)["']\s*\/?>/gi;

// Regex to find JS scripts
// e.g. <script src="js/main.js"></script>
const scriptRegex = /<script\s+src=["']([^"']+)["']><\/script>/gi;

// Replace CSS
htmlContent = htmlContent.replace(linkRegex, (match, href) => {
  console.log(`Embedding CSS: ${href}`);
  try {
    const cssPath = path.join(__dirname, href);
    const cssContent = fs.readFileSync(cssPath, 'utf-8');
    return `<style>\n${cssContent}\n</style>`;
  } catch (error) {
    console.error(`Error reading CSS file ${href}:`, error.message);
    return match; // keep original if error
  }
});

// Replace JS
htmlContent = htmlContent.replace(scriptRegex, (match, src) => {
  // Specifically ignore "js/store.js" as requested by the user
  if (src === 'js/store.js') {
    console.log(`Ignoring script: ${src}`);
    return ''; // Remove the tag
  }

  console.log(`Embedding JS: ${src}`);
  try {
    const jsPath = path.join(__dirname, src);
    const jsContent = fs.readFileSync(jsPath, 'utf-8');
    return `<script>\n${jsContent}\n</script>`;
  } catch (error) {
    console.error(`Error reading JS file ${src}:`, error.message);
    return match; // keep original if error
  }
});

// Create dist directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the single file HTML
fs.writeFileSync(outputHtmlPath, htmlContent, 'utf-8');

console.log(`Merge complete! Single file HTML saved to: ${outputHtmlPath}`);
