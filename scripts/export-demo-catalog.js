const fs = require('node:fs');
const path = require('node:path');
const { exportDemoProducts } = require('../backend/seed');

const output = path.resolve(process.argv[2] || 'frontend/dist/demo-products.json');
fs.mkdirSync(path.dirname(output), { recursive: true });
const products = exportDemoProducts();
fs.writeFileSync(output, `${JSON.stringify(products, null, 2)}\n`, 'utf8');
console.log(`Exported ${products.length} demo products to ${output}`);
