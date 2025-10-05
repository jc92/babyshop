// Runs the Kadolog scraper across a pre-defined term list and aggregates results.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { DEFAULT_OPTIONS, makeProductKey, parseScraperArgs, scrape } from './kadolog-scraper.mjs';

const RAW_TERMS = `
## Bebe mange
Biberons
Chauffe biberons
Kit biberons depart
Doseur de lait
Tire-lait
Bavoirs
Egouttoir
Goupillon
Casier a biberons
Sterilisateur
Sac isotherme
Tetine biberons
Sucette
Attache sucette
Preparateur culinaire
Assiette
Tasse 1er age
Coffret repas
Goblet
Thermos
Pot de conservation
Set de couverts
Chaise haute
Panier a tetines
Rehausseur de chaise

## Bebe et sa toilette
Table a langer
Trousse de soin
Coussin a langer
Housse coussin a langer
Poubelle anti-odeur
Baignoire
Fauteuil de bain
Thermometre de bain
Cape de bain
Anneau de bain
Support de baignoire
Meuble de bain
Jeux de bain
Matelas flottant
Tapis anti-derapant
Brosse a dents
Mouche-nez
Brosse et peigne
Ciseaux
Marche-pied
Petit pot

## Bebe se promene
Poussette
Porte bebe
Echarpe de portage
Nid d'ange
Chanceliere
Sac nursery
Nacelle
Couverture de nacelle
Drap de nacelle
Poussette canne
Habillage pluie
Moustiquaire
Siege auto
Ombrelle
Organisateur de voyage
Planche a roulette
Protection siege auto
Rehausseur

## Bebe Dort
Berceau
Couffin
Landau
Nacelle
Lit
Sac de couchage
Drap de housse
Couette
Housse de couette
Couverture
Tour de lit
Fleche de lit
Ciel de lit
Moustiquaire pour lit
Plan a langer
Armoire
Tapis de jeux
Commode
Corbeille a linge
Decorations
Etagere
Fauteuil bebe
Humidificateur
Lampe de chevet
Porte-manteau
Stickers
Thermometre de chambre
Toise

## Bebe s'habille
Body
Bonnet
Chaussettes
Chaussons
Moufles
Pyjamas
Vetement

## Bebe voyage
Lit pliant de voyage
Matelas de lit pliant
Tente anti-uv

## Bebe en securite
Parc
Matelas de parc
Tour de parc
Tapis de parc
Relax
Barriere de securite
Babyphone
Veilleuse
Plan incline
Cale-bebe
Pese-bebe

## Bebe et ses parents
Abonnement au Ligueur et mon bebe
Des heures de baby sitting
Un abonnement a un magazine
Un don pour UNICEF
Un massage bebe
Un repas traiteur pour les parents fatigues
Un shooting photo
Un week-end thalasso

## Bebe joue
Anneau de dentition
Arceaux et spirales de jeu
Boite a musique
Jouets d'eveil
Jouets de bain
Mobiles & veilleuses
Peluches et doudous
Tapis d'eveil
Coffre a jouets
`;

const DEFAULT_BATCH_OUTPUT = path.resolve(process.cwd(), 'tmp/kadolog-batch.json');
const DEFAULT_TERM_DIR = path.resolve(process.cwd(), 'tmp/kadolog-terms');
const DEFAULT_TERM_DELAY_MS = 4_000;

function parseTermLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('##'));
}

function slugify(value) {
  const ascii = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-');
  return ascii.replace(/^-+|-+$/g, '').toLowerCase() || 'term';
}

function parseBatchArgs(argv) {
  const batch = {
    batchOutput: DEFAULT_BATCH_OUTPUT,
    termDir: DEFAULT_TERM_DIR,
    termDelayMs: DEFAULT_TERM_DELAY_MS,
    terms: parseTermLines(RAW_TERMS),
    termsFile: undefined,
    showHelp: false,
  };

  const scraperArgv = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      scraperArgv.push(arg);
      continue;
    }

    const key = arg.slice(2);
    const value = argv[i + 1];
    switch (key) {
      case 'batch-output':
        if (value) {
          batch.batchOutput = path.resolve(process.cwd(), value);
          i += 1;
        }
        break;
      case 'term-dir':
        if (value) {
          if (value.toLowerCase() === 'none') {
            batch.termDir = null;
          } else {
            batch.termDir = path.resolve(process.cwd(), value);
          }
          i += 1;
        }
        break;
      case 'term-delay':
        if (value) {
          batch.termDelayMs = Math.max(0, Number.parseInt(value, 10));
          i += 1;
        }
        break;
      case 'terms-file':
        if (value) {
          batch.termsFile = path.resolve(process.cwd(), value);
          i += 1;
        }
        break;
      case 'help':
        batch.showHelp = true;
        break;
      default:
        scraperArgv.push(arg);
        if (value && !value.startsWith('--')) {
          scraperArgv.push(value);
          i += 1;
        }
        break;
    }
  }

  const scraperOptions = parseScraperArgs(scraperArgv);
  scraperOptions.outputPath = undefined;
  scraperOptions.query = '';
  scraperOptions.showHelp = false;

  return { batch, scraperOptions };
}

function printHelp() {
  const lines = [
    'Usage: node scripts/kadolog-batch.mjs [options]',
    '',
    'Options (batch specific):',
    `  --batch-output <path>    Aggregated JSON output (default: ${DEFAULT_BATCH_OUTPUT})`,
    `  --term-dir <path|none>   Directory for per-term outputs (default: ${DEFAULT_TERM_DIR})`,
    `  --term-delay <ms>        Delay between term runs (default: ${DEFAULT_TERM_DELAY_MS})`,
    '  --terms-file <path>      Provide custom term list (one per line; headings starting with ## ignored)',
    '',
    'Any additional flags are forwarded to kadolog-scraper (e.g., --base, --pages, --delay, selectors, --verbose).',
    'Set KADOLOG_EMAIL/KADOLOG_PASSWORD in your env or .env.local for one-click auth.',
    '',
  ];
  process.stdout.write(lines.join('\n'));
}

async function readTerms(batch) {
  if (!batch.termsFile) {
    return batch.terms;
  }
  const fileContent = await readFile(batch.termsFile, 'utf-8');
  const terms = parseTermLines(fileContent);
  if (!terms.length) {
    throw new Error(`No terms found in ${batch.termsFile}`);
  }
  return terms;
}

async function sleep(ms) {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  const { batch, scraperOptions } = parseBatchArgs(process.argv.slice(2));
  if (batch.showHelp) {
    printHelp();
    return;
  }
  const terms = await readTerms(batch);

  if (!terms.length) {
    console.error('No search terms available.');
    process.exit(1);
  }

  const aggregate = new Map();
  const termSummaries = [];

  if (batch.termDir) {
    await mkdir(batch.termDir, { recursive: true });
  }

  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    const slug = slugify(term || `term-${index + 1}`);
    const perTermOutput = batch.termDir ? path.join(batch.termDir, `${slug}.json`) : undefined;

    const header = `\n[${index + 1}/${terms.length}] Scraping term: ${term}`;
    console.log(header);
    process.stdout.write('   status: fetching...');

    let result;
    try {
      result = await scrape({
        ...scraperOptions,
        query: term,
        outputPath: perTermOutput,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`\r   status: failed (${message})\n`);
      throw error;
    }

    const fetchedLine = `   status: fetched ${result.records.length} item${result.records.length === 1 ? '' : 's'}`;
    const padding = fetchedLine.length < 40 ? ' '.repeat(40 - fetchedLine.length) : '';
    process.stdout.write(`\r${fetchedLine}${padding}\n`);

    termSummaries.push({
      term,
      recordCount: result.records.length,
      outputPath: perTermOutput ?? null,
    });

    for (const record of result.records) {
      const key = makeProductKey(record);
      const existing = aggregate.get(key);
      if (existing) {
        if (!existing.terms.includes(term)) {
          existing.terms.push(term);
        }
      } else {
        aggregate.set(key, { ...record, terms: [term] });
      }
    }

    if (batch.termDelayMs > 0 && index < terms.length - 1) {
      await sleep(batch.termDelayMs);
    }
  }

  const aggregatedRecords = Array.from(aggregate.values());
  const payload = {
    scrapedAt: new Date().toISOString(),
    baseUrl: scraperOptions.baseUrl ?? DEFAULT_OPTIONS.baseUrl,
    termCount: terms.length,
    totalUniqueRecords: aggregatedRecords.length,
    terms: termSummaries,
    records: aggregatedRecords,
  };

  if (batch.batchOutput) {
    await mkdir(path.dirname(batch.batchOutput), { recursive: true });
    await writeFile(batch.batchOutput, JSON.stringify(payload, null, 2), 'utf-8');
    console.log(`\nSaved aggregated dataset with ${aggregatedRecords.length} unique records to ${batch.batchOutput}`);
  }
}

if (import.meta.main) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Batch scrape failed: ${message}`);
    process.exit(1);
  });
}
