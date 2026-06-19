const { Jimp } = require('jimp');

async function test() {
    const width = 512;
    const height = 512;
    // Create a new blank transparent image
    const image = new Jimp({ width, height, color: 0x00000000 });
    
    // Fill the image with some background color to simulate the photo
    image.scan(0, 0, width, height, function(x, y, idx) {
        this.bitmap.data[idx + 0] = 100;
        this.bitmap.data[idx + 1] = 100;
        this.bitmap.data[idx + 2] = 200;
        this.bitmap.data[idx + 3] = 255;
    });

    // Draw the "globo" overlay:
    const topBarHeight = 80;
    
    // Triangle parameters
    const triWidth = 80;
    const triHeight = 80;
    const triStartX = width / 2 - triWidth / 2;
    
    image.scan(0, 0, width, height, function(x, y, idx) {
        let isWhite = false;
        let isBlackBorder = false;

        // Top white bar
        if (y < topBarHeight) {
            isWhite = true;
            // Draw a black line at the bottom of the top bar, EXCEPT where the triangle is
            if (y >= topBarHeight - 4 && (x < triStartX || x > triStartX + triWidth)) {
                isWhite = false;
                isBlackBorder = true;
            }
        } else {
            if (y >= topBarHeight && y < topBarHeight + triHeight) {
                const progress = (y - topBarHeight) / triHeight;
                const leftX = triStartX + (triWidth * 0.3) * progress; 
                const rightX = triStartX + triWidth - (triWidth * 0.7) * progress;
                
                if (x >= leftX && x <= rightX) {
                    isWhite = true;
                    if (x - leftX < 4 || rightX - x < 4) {
                        isWhite = false;
                        isBlackBorder = true;
                    }
                }
            }
        }

        if (isWhite) {
            this.bitmap.data[idx + 0] = 255;
            this.bitmap.data[idx + 1] = 255;
            this.bitmap.data[idx + 2] = 255;
            this.bitmap.data[idx + 3] = 255;
        } else if (isBlackBorder) {
            this.bitmap.data[idx + 0] = 0;
            this.bitmap.data[idx + 1] = 0;
            this.bitmap.data[idx + 2] = 0;
            this.bitmap.data[idx + 3] = 255;
        }
    });

    await image.write('globo_test.png');
    console.log("Done");
}
test();
