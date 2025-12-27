/**
 * Copy ABIs from Hardhat artifacts to frontend apps
 * Run after `npx hardhat compile` to update ABIs in all apps
 *
 * Usage: node scripts/copyABIs.cjs
 */

const fs = require("fs");
const path = require("path");

// Source: Hardhat artifacts directory
const ARTIFACTS_DIR = path.join(
  __dirname,
  "..",
  "src",
  "artifacts",
  "contracts"
);

// Destinations
const MAIN_APP_DATA = path.join(__dirname, "..", "src", "data");
const ADMIN_APP_DATA = path.join(
  __dirname,
  "..",
  "..",
  "TouchGrass Admin",
  "src",
  "data"
);

// ABI mappings: [sourceContract, destFilename, destinations[]]
const ABI_MAPPINGS = [
  {
    source: "TouchGrass.sol/TouchGrass.json",
    dest: "TouchGrassABI.json",
    targets: [MAIN_APP_DATA, ADMIN_APP_DATA],
  },
  {
    source: "TouchGrassNFT.sol/TouchGrassNFT.json",
    dest: "TouchGrassNFTABI.json",
    targets: [MAIN_APP_DATA],
  },
  {
    source: "TouchGrassViews.sol/TouchGrassViews.json",
    dest: "TouchGrassViewsABI.json",
    targets: [ADMIN_APP_DATA],
  },
];

function copyABIs() {
  console.log("📦 Copying ABIs from Hardhat artifacts...\n");

  let copied = 0;
  let errors = 0;

  for (const mapping of ABI_MAPPINGS) {
    const sourcePath = path.join(ARTIFACTS_DIR, mapping.source);

    if (!fs.existsSync(sourcePath)) {
      console.error(`❌ Source not found: ${mapping.source}`);
      console.error(`   Run 'npx hardhat compile' first.\n`);
      errors++;
      continue;
    }

    for (const targetDir of mapping.targets) {
      const destPath = path.join(targetDir, mapping.dest);

      try {
        // Ensure target directory exists
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        const relPath = path.relative(process.cwd(), destPath);
        console.log(`✅ ${mapping.dest} → ${relPath}`);
        copied++;
      } catch (err) {
        console.error(`❌ Failed to copy ${mapping.dest}: ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\n📋 Summary: ${copied} copied, ${errors} errors`);

  if (errors > 0) {
    process.exit(1);
  }
}

copyABIs();
