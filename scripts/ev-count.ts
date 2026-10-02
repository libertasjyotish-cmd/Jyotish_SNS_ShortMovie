import { GoogleSheetsService } from '@/services/sheets';

async function main() {
  const s = new GoogleSheetsService();
  for (const l of ['ja', 'en', 'es', 'pt', 'id', 'ar', 'fr', 'de'] as const) {
    const r = await s.getEvergreenScripts(l);
    console.log(l, r.length);
  }
}

void main();
