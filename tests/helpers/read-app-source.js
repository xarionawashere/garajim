const fs = require('fs');
const path = require('path');

const APP_MODULES = ['core.js', 'garage.js', 'backup.js', 'settings.js', 'achievements.js', 'ride-dna.js', 'ride-session.js', 'navigation.js', 'journey-tools.js', 'assistant.js', 'studio.js', 'app-boot.js'];

function readIndexWithAppSource(root) {
  let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const name of APP_MODULES) {
    const marker = '<script src="src/js/' + name + '"></script>';
    const modulePath = path.join(root, 'src', 'js', name);
    const moduleSource = fs.readFileSync(modulePath, 'utf8');
    if (!html.includes(marker)) throw new Error('Missing application script reference: ' + marker);
    html = html.replace(marker, '<script>\n' + moduleSource + '\n</script>');
  }
  return html;
}

module.exports = { readIndexWithAppSource };
