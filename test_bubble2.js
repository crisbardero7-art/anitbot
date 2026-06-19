async function test() {
    try {
        const url = 'https://raw.githubusercontent.com/GreenComfyTea/Streamer-Speech-Bubble/main/assets/speech_bubble.png';
        const res = await fetch(url);
        console.log("Status:", res.status);
    } catch(e) {
        console.error(e);
    }
}
test();
