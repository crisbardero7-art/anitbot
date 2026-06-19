const { Jimp } = require('jimp');
const fs = require('fs');

async function test() {
    // Crear imagen de prueba (simula un sticker de 512x512)
    const size = 512;
    const image = new Jimp({ width: size, height: size, color: 0x333333FF });
    
    // Guardar como PNG
    const buffer = await image.getBuffer('image/png');
    
    // Aplicar efecto globo
    const { applyGloboEffect } = require('./commands/globo');
    const result = await applyGloboEffect(buffer);
    
    fs.writeFileSync('globo_result_test.png', result);
    console.log('Saved globo_result_test.png - open it to see the shape!');
    
    // Print dimensions
    const resultImg = await Jimp.read(result);
    console.log(`Result: ${resultImg.bitmap.width}x${resultImg.bitmap.height}`);
}
test().catch(console.error);
