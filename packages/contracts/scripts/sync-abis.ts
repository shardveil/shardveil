/**
 * sync-abis.ts
 *
 * Reads source ABI files from the contracts repo and writes camelCase
 * exports into src/abis/. Uses only Node.js built-ins (fs, path, url).
 *
 * Usage:
 *   pnpm sync-abis
 *   SHARDVEIL_CONTRACTS_ROOT=/path/to/contracts pnpm sync-abis
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Default: four levels up from scripts/ → monorepo root → contract/abis
const contractsRoot =
  process.env.SHARDVEIL_CONTRACTS_ROOT ??
  join(__dirname, '..', '..', '..', '..', 'contract');

const sourceDir = join(contractsRoot, 'abis');
const targetDir = join(__dirname, '..', 'src', 'abis');

/** Map from source filename (no ext) to [targetFilename, exportName] */
const FILE_MAP: Record<string, [string, string]> = {
  VeilToken:      ['veilToken',      'veilTokenAbi'],
  ShardToken:     ['shardToken',     'shardTokenAbi'],
  CardRegistry:   ['cardRegistry',   'cardRegistryAbi'],
  CardNFT:        ['cardNft',        'cardNftAbi'],
  PackContract:   ['packContract',   'packContractAbi'],
  BattleEngine:   ['battleEngine',   'battleEngineAbi'],
  CraftingEngine: ['craftingEngine', 'craftingEngineAbi'],
  AMMMarketplace: ['ammMarketplace', 'ammMarketplaceAbi'],
  Treasury:       ['treasury',       'treasuryAbi'],
  GuildSystem:    ['guildSystem',    'guildSystemAbi'],
};

/**
 * Extracts the array literal from a source ABI file.
 * Uses indexOf/lastIndexOf so nested `]` characters inside struct
 * component arrays are handled correctly at any nesting depth.
 */
function extractArrayLiteral(source: string): string {
  const start = source.indexOf('[');
  const end = source.lastIndexOf(']');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('Could not find array literal in source file.');
  }
  return source.slice(start, end + 1);
}

let synced = 0;
let skipped = 0;
const errors: string[] = [];

// List source files available
let sourceFiles: string[];
try {
  sourceFiles = readdirSync(sourceDir).filter((f) => f.endsWith('.ts'));
} catch (err) {
  console.error(`ERROR: Cannot read source directory: ${sourceDir}`);
  console.error(`Set SHARDVEIL_CONTRACTS_ROOT env var to point at the contract repo root.`);
  process.exit(1);
}

for (const [sourceName, [targetName, exportName]] of Object.entries(FILE_MAP)) {
  const sourceFile = sourceFiles.find((f) => f === `${sourceName}.ts`);
  if (!sourceFile) {
    console.warn(`  SKIP  ${sourceName}.ts — not found in ${sourceDir}`);
    skipped++;
    continue;
  }

  try {
    const sourceContent = readFileSync(join(sourceDir, sourceFile), 'utf-8');
    const arrayLiteral = extractArrayLiteral(sourceContent);

    const output =
      `export const ${exportName} = ${arrayLiteral} as const;\n`;

    writeFileSync(join(targetDir, `${targetName}.ts`), output, 'utf-8');
    console.log(`  SYNC  ${sourceName}.ts  →  src/abis/${targetName}.ts  (${exportName})`);
    synced++;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  ERROR ${sourceName}.ts — ${message}`);
    errors.push(sourceName);
  }
}

console.log('');
console.log(`Done. Synced: ${synced}  Skipped: ${skipped}  Errors: ${errors.length}`);
if (errors.length > 0) {
  console.error(`Failed: ${errors.join(', ')}`);
  process.exit(1);
}
