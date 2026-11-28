const path = require('node:path');
const fs = require('node:fs/promises');
require('dotenv').config({path:path.resolve(__dirname,'../.env'),quiet:true});
const {createLocalDatabase,createRemoteDatabase}=require('../backend/database-client');
const {getTursoConfig,getConfiguredFile}=require('../backend/db');
const {showcaseProducts,populateShowcase}=require('../backend/services/showcase');

async function main() {
  const args=process.argv.slice(2);
  if (!args.includes('--apply')) {
    const products=showcaseProducts();
    console.log(JSON.stringify({mode:'preview',products:products.length,accounts:6,categories:[...new Set(products.map(item=>item.category))],regions:['pl','ua','eu']})); return;
  }
  const index=args.indexOf('--credentials-output');
  if(index<0 || !args[index+1]) throw new Error('CREDENTIALS_OUTPUT_REQUIRED');
  const remote=getTursoConfig();
  if(args.includes('--remote') && !remote) throw new Error('REMOTE_DATABASE_REQUIRED');
  const output=path.resolve(args[index+1]);
  await fs.mkdir(path.dirname(output),{recursive:true});
  const file=await fs.open(output,'wx',0o600);
  let db;
  try {
    db=remote?createRemoteDatabase(remote):createLocalDatabase(getConfiguredFile(),{fileMustExist:true});
    const result=await populateShowcase(db);
    await file.writeFile(JSON.stringify({createdAt:new Date().toISOString(),accounts:result.credentials},null,2));
    console.log(JSON.stringify({inserted:result.inserted,skipped:result.skipped,createdAccounts:result.credentials.length,credentialsFile:output}));
  } finally {await file.close();if(db)await db.close();}
}
main().catch(()=>{console.error('SHOWCASE_SETUP_FAILED: no credentials are printed; check configuration or existing demo accounts.');process.exitCode=1;});
