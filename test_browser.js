const puppeteer = require('puppeteer');

(async () => {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    page.on('console', msg => console.log('BROWSER LOG:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER EXCEPTION:', err.toString()));
    
    await page.goto('http://localhost:3000');
    
    // Set dummy key
    await page.evaluate(() => {
        localStorage.setItem('gemini_api_key', 'dummy_key');
        localStorage.setItem('terminal_notes_key', 'dummy_key');
    });

    await page.type('#command-input', '/summarize 1\n');
    await new Promise(r => setTimeout(r, 1000));
    
    const output = await page.evaluate(() => document.getElementById('output').innerText);
    console.log('OUTPUT:', output.trim());
    
    await browser.close();
})();
