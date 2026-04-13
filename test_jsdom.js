const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", resources: "usable", url: "http://localhost:3000/" });

dom.window.addEventListener('load', () => {
    console.log("Loaded document.");
    setTimeout(() => {
        console.log("Checking commands object:", !!dom.window.Commands);
        process.exit(0);
    }, 1000);
});
