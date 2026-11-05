import { DEFAULT_WS_PORT, STORAGE_KEYS } from '../config/constants';
let host = '127.0.0.1';
let port = DEFAULT_WS_PORT;
export function configureEndpoint(nextHost:string,nextPort:number) {
  const parsed = new URL(/^https?:\/\//.test(nextHost) ? nextHost : `http://${nextHost}`);
  if (!['http:','https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) throw new Error('Введите адрес HTTP(S) сервера без пути');
  if (!Number.isInteger(nextPort) || nextPort < 1 || nextPort > 65535) throw new Error('Некорректный порт');
  parsed.port = String(nextPort); host = (parsed.protocol === 'https:' ? 'https://' : '') + parsed.hostname; port = nextPort;
}
export function initialEndpoint() {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.HOST);
    const savedPort = Number(localStorage.getItem(STORAGE_KEYS.PORT));
    const browser = typeof location !== 'undefined' && /^https?:$/.test(location.protocol) ? location : null;
    configureEndpoint(stored || (browser ? `${browser.protocol}//${browser.hostname}` : host),savedPort || Number(browser?.port) || (browser?.protocol === 'https:' ? 443 : DEFAULT_WS_PORT));
  } catch {configureEndpoint('127.0.0.1',DEFAULT_WS_PORT);}
}
export const serverInfo = () => ({host,port});
export const httpBase = () => {const url = new URL(/^https?:\/\//.test(host) ? host : `http://${host}`);url.port = String(port);return url.origin;};
export const socketUrl = () => httpBase().replace(/^http/,'ws') + '/ws';
export const endpointScope = () => httpBase();
