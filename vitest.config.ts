import { defineConfig } from 'vitest/config';

// Ionic liefert ES-Module mit Verzeichnis-Importen; Vitest muss sie selbst umwandeln.
export default defineConfig({
  test: {
    server: { deps: { inline: [/@ionic/, /@stencil/, /ionicons/] } },
  },
});
