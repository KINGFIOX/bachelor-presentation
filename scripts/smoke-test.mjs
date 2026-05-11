// Headless smoke test: open the slides, wait for reveal to initialise,
// step through every slide, dump the slide count and any console errors.
import puppeteer from 'puppeteer';

const URL = process.env.SMOKE_URL || 'http://localhost:8001/';

const browser = await puppeteer.launch({ headless: 'new' });
const page = await browser.newPage();
const errors = [];
const consoleMessages = [];

page.on('pageerror', (err) => errors.push({ kind: 'pageerror', message: err.message }));
page.on('console', (msg) => {
	const text = msg.text();
	consoleMessages.push({ type: msg.type(), text });
	if (msg.type() === 'error') errors.push({ kind: 'console', message: text });
});
page.on('requestfailed', (req) => {
	const errText = req.failure().errorText;
	// Vite dependency-pre-bundling cancels the first request and re-issues it; the
	// aborted attempt surfaces as a benign net::ERR_ABORTED that we should ignore.
	if (errText === 'net::ERR_ABORTED') return;
	errors.push({ kind: 'requestfailed', message: `${req.url()} -> ${errText}` });
});
page.on('response', (resp) => {
	if (resp.status() >= 400) {
		errors.push({ kind: 'http', message: `${resp.status()} ${resp.url()}` });
	}
});

await page.goto(URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

// Wait for reveal to finish initial layout
await page
	.waitForFunction(() => document.querySelector('.reveal.ready'), { timeout: 60000 })
	.catch(() => {});

// Sleep extra to let mermaid finish
await new Promise((r) => setTimeout(r, 4000));

const stats = await page.evaluate(() => {
	const slides = document.querySelectorAll('.reveal .slides > section');
	const totalSlides = (() => {
		let count = 0;
		document.querySelectorAll('.reveal .slides > section').forEach((s) => {
			const subs = s.querySelectorAll(':scope > section');
			count += subs.length || 1;
		});
		return count;
	})();
	const mermaids = document.querySelectorAll('pre.mermaid svg').length;
	const mermaidBlocks = document.querySelectorAll('pre.mermaid').length;
	const images = document.querySelectorAll('img');
	const brokenImages = Array.from(images)
		.filter((img) => img.complete && img.naturalWidth === 0)
		.map((img) => img.getAttribute('src'));
	return {
		topLevelSections: slides.length,
		totalSlides,
		mermaidBlocks,
		mermaidsRendered: mermaids,
		images: images.length,
		brokenImages,
	};
});

console.log('--- Smoke test results ---');
console.log(JSON.stringify(stats, null, 2));
if (errors.length > 0) {
	console.log('--- Errors ---');
	for (const e of errors) console.log(`[${e.kind}] ${e.message}`);
} else {
	console.log('No JS / console errors');
}

await browser.close();
process.exit(errors.length > 0 ? 1 : 0);
