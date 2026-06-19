async function test() {
    try {
        const apis = [
            'https://api.popcat.xyz/uncover',
            'https://api.popcat.xyz/jokeoverhead?image=https://dummyimage.com/500x500/000/000.png',
            'https://api.popcat.xyz/speechbubble?image=https://dummyimage.com/500x500/000/000.png'
        ];
        for (let url of apis) {
            console.log("Fetching", url);
            const res = await fetch(url);
            console.log("Status:", res.status);
            if (res.ok) {
                console.log("ContentType:", res.headers.get('content-type'));
            }
        }
    } catch(e) {
        console.error(e);
    }
}
test();
