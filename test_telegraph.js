const FormData = require('form-data');
const fs = require('fs');

async function test() {
    try {
        const buffer = fs.readFileSync('globo_test.png');
        const form = new FormData();
        form.append('file', buffer, { filename: 'image.png' });
        
        console.log("Uploading to telegraph...");
        const res = await fetch('https://telegra.ph/upload', {
            method: 'POST',
            body: form
        });
        const text = await res.text();
        console.log("Telegraph response:", text);
    } catch(e) {
        console.error(e);
    }
}
test();
