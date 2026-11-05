/** Clipboard always belongs to the device whose UI the user is operating. */
export async function readClipboard():Promise<string>{try{return await navigator.clipboard.readText();}catch{return '';}}
export async function writeClipboard(text:string):Promise<boolean>{try{await navigator.clipboard.writeText(text);return true;}catch{return false;}}
