import { cp, mkdir, readFile, writeFile, rm, readdir } from "node:fs/promises";
import path from "node:path";
const root = process.cwd();
const pkg = JSON.parse(await readFile("package.json", "utf8"));
// Only generated directories inside this repository may be replaced.
for (const relative of ["obsidian-plugin/web", "release"]) {
  const target = path.resolve(root, relative);
  if (!target.startsWith(root + path.sep))
    throw new Error("Invalid artifact directory");
  await rm(target, { recursive: true, force: true });
}
await cp("symbiote/dist", "obsidian-plugin/web", { recursive: true });
for (const component of ["obsidian-plugin", "symbiote"]) {
  const manifest = JSON.parse(
    await readFile(`${component}/manifest.json`, "utf8"),
  );
  manifest.version = pkg.version;
  if (component === "symbiote") manifest.license = pkg.license;
  else manifest.minAppVersion = "1.8.7";
  await writeFile(
    `${component}/manifest.json`,
    JSON.stringify(manifest, null, 2) + "\n",
  );
  const destination = `release/${component}`;
  await mkdir(destination, { recursive: true });
  for (const file of component === "obsidian-plugin"
    ? ["main.js", "manifest.json", "styles.css", "web"]
    : ["manifest.json", "README.md", "dist"])
    await cp(`${component}/${file}`, `${destination}/${file}`, {
      recursive: true,
    });
}
for (const file of ["LICENSE", "README.md", "install.ps1", "install.bat"])
  await cp(file, `release/${file}`);
await cp("docs", "release/docs", {
  recursive: true,
  filter: (source) => !source.split(path.sep).includes("audit"),
});
await cp("examples", "release/examples", { recursive: true });
const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const licenses = [];
for (const [location, entry] of Object.entries(lock.packages)) {
  if (!location.includes("node_modules/") || entry.dev || entry.link) continue;
  const files = await readdir(location).catch(() => []);
  const license = files.find((name) => /^licen[sc]e(?:\.|$)/i.test(name));
  if (!license) continue;
  const meta = JSON.parse(
    await readFile(path.join(location, "package.json"), "utf8"),
  );
  licenses.push(
    `${meta.name}@${meta.version} (${meta.license || "see license"})\n\n${await readFile(path.join(location, license), "utf8")}`,
  );
}
await writeFile(
  "release/THIRD_PARTY_NOTICES.txt",
  licenses.join("\n\n" + "=".repeat(72) + "\n\n"),
);
console.log(`Release ${pkg.version}: ${path.join(root, "release")}`);
