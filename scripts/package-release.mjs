import { cp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
const root=process.cwd();
const pkg=JSON.parse(await readFile('package.json','utf8'));
// Only generated directories inside this repository may be replaced.
for(const relative of ['obsidian-plugin/web','release']){
  const target=path.resolve(root,relative);
  if(!target.startsWith(root+path.sep))throw new Error('Invalid artifact directory');
  await rm(target,{recursive:true,force:true});
}
await cp('symbiote/dist','obsidian-plugin/web',{recursive:true});
for(const component of ['obsidian-plugin','symbiote']){
  const manifest=JSON.parse(await readFile(`${component}/manifest.json`,'utf8'));
  manifest.version=pkg.version;
  if(component==='symbiote')manifest.license=pkg.license;
  else manifest.minAppVersion='1.8.7';
  await writeFile(`${component}/manifest.json`,JSON.stringify(manifest,null,2)+'\n');
  const destination=`release/${component}`;await mkdir(destination,{recursive:true});
  for(const file of component==='obsidian-plugin' ? ['main.js','manifest.json','styles.css','web'] : ['manifest.json','README.md','dist'])await cp(`${component}/${file}`,`${destination}/${file}`,{recursive:true});
}
for(const file of ['LICENSE','README.md','install.ps1','install.bat'])await cp(file,`release/${file}`);
await cp('docs','release/docs',{recursive:true,filter:source=>!source.split(path.sep).includes('audit')});
console.log(`Release ${pkg.version}: ${path.join(root,'release')}`);
