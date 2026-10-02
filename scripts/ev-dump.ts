import { GoogleSheetsService, Language } from '@/services/sheets';

async function main() {
  const s = new GoogleSheetsService();
  const lang = (process.argv[2] ?? 'en') as Language;
  for (const r of await s.getEvergreenScripts(lang)) {
    console.log(JSON.stringify(r));
  }
}

void main();
