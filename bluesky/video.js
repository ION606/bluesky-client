import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';

const baseVideoCachePath = path.resolve('cache', 'videos');
if (!fs.existsSync(baseVideoCachePath)) fs.mkdirSync(baseVideoCachePath, { recursive: true });

// function to convert .m3u8 to .mp4
function convertM3U8ToMP4(inpurl, outputPath) {
    return new Promise((resolve, reject) => {
        ffmpeg(inpurl)
            .outputOptions('-c copy') // copies the codec without re-encoding for faster processing
            .output(outputPath)
            .on('end', resolve)
            .on('error', reject)
            .run();
    });
}


// clean up the cache
export async function clearCache(...vids) {
    const arr = (vids?.length) ? vids : fs.readdirSync(baseVideoCachePath);
    await Promise.all(arr.map((p) => new Promise(resolve => fs.rm(path.resolve(baseVideoCachePath, p), resolve))));
}


export default async function convertAndServe(fname, m3u8url) {
    try {
        const newPath = path.resolve(baseVideoCachePath, fname);
        await convertM3U8ToMP4(m3u8url, newPath);
        return fname;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}
