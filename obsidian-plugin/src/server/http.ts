import type {IncomingMessage,ServerResponse} from 'node:http';
import type {BridgeApplication} from '../application';
import {APP_VERSION} from '../../../packages/protocol';
export const mime:Record<string,string>={html:'text/html; charset=utf-8',js:'text/javascript; charset=utf-8',css:'text/css',png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',mp4:'video/mp4',webm:'video/webm',mp3:'audio/mpeg',ogg:'audio/ogg',wav:'audio/wav',woff2:'font/woff2'};
export async function serveHttp(req:IncomingMessage,res:ServerResponse,ports:{application:BridgeApplication;readStatic:(relative:string)=>Promise<Buffer>}):Promise<void>{
  const url=new URL(req.url || '/','http://localhost');
  if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405);res.end();return;}
  if(url.pathname==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({app:'TaleBridge',status:'online',version:APP_VERSION}));return;}
  const media=/^\/media\/([\w-]+)$/.exec(url.pathname);
  if(media){try{const {data,path}=await ports.application.readMedia(media[1],url.searchParams.get('ticket')||'');res.writeHead(200,{'Content-Type':mime[path.split('.').pop()!.toLowerCase()]||'application/octet-stream','Content-Length':data.length,'Cache-Control':'private, no-store'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(403);res.end();}return;}
  if(url.pathname==='/vault-file'||url.pathname.startsWith('/clipboard')||url.pathname.startsWith('/public/')){res.writeHead(403);res.end();return;}
  const relative=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(relative!=='index.html'&&!/^assets\/[\w.-]+\.(?:js|css|woff2|png|webp)$/.test(relative)){res.writeHead(404);res.end();return;}
  try{
    const data=await ports.readStatic(relative);
    res.writeHead(200,{'Content-Type':mime[relative.split('.').pop()!]||'application/octet-stream','Cache-Control':relative==='index.html'?'no-cache':'public, max-age=3600','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: http: https:; img-src 'self' https: http: blob:; media-src 'self' https: http: blob:; frame-src https://www.youtube.com; base-uri 'none'; frame-ancestors 'none'"});
    res.end(req.method==='HEAD'?undefined:data);
  }catch{res.writeHead(503,{'Content-Type':'text/plain; charset=utf-8'});res.end('TaleBridge: web-сборка отсутствует. Установите полный release или выполните npm run build.');}
}
