// Drives tools/gen-block-thumbs.html headlessly and writes every block
// photo into editor-assets/block-thumbs/. Run from the repo root:
//   node tools/gen-block-thumbs.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const OUT = 'editor-assets/block-thumbs';
mkdirSync( OUT, { recursive: true } );

const browser = await chromium.launch();
const page = await browser.newPage( { viewport: { width: 400, height: 400 } } );
const errors = [];
page.on( 'console', m => { if ( m.type() === 'error' ) errors.push( m.text().slice( 0, 160 ) ); } );
page.on( 'pageerror', e => errors.push( 'PAGEERROR: ' + String( e ).slice( 0, 160 ) ) );

await page.goto( 'http://localhost:8124/tools/gen-block-thumbs.html', { waitUntil: 'networkidle', timeout: 60000 } );
await page.waitForFunction( 'window.__thumbsReady === true', null, { timeout: 30000 } );

const ids = await page.evaluate( 'window.__thumbIds' );
let ok = 0;
for ( const id of ids ) {
	const url = await page.evaluate( id => window.renderThumb( id ), id );
	if ( ! url || ! url.startsWith( 'data:image/png' ) ) throw new Error( 'bad render for ' + id );
	writeFileSync( `${ OUT }/${ id }.png`, Buffer.from( url.split( ',' )[ 1 ], 'base64' ) );
	ok++;
}
console.log( `wrote ${ ok }/${ ids.length } thumbs` );
if ( errors.length ) {
	console.log( 'console errors:' );
	errors.slice( 0, 6 ).forEach( e => console.log( '  ', e ) );
	process.exitCode = 1;
}
await browser.close();
