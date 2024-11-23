import { dialog, ipcMain } from "electron";
import { PassThrough, Readable } from 'stream';
import { initSession } from "./main.js";
import sharp from "sharp";
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs';


const fnamesToPosts = {};

// Store data in main process only
ipcMain.handle('set-sensitive-data', (event, key, value) => {
    fnamesToPosts[key] = value;
});

ipcMain.handle('get-files', (event, key) => {
    return JSON.stringify(fnamesToPosts);
});

export const clearPostFiles = () => {
    for (const key in fnamesToPosts) {
        delete fnamesToPosts[key];
    }
}
export const getPostFiles = () => Object.entries(fnamesToPosts);
export const popPostFile = (fname) => {
    if (!fname || !(fname in fnamesToPosts)) return;
    const o = fnamesToPosts[fname];
    delete fnamesToPosts[fname];
    return o;
}

ipcMain.handle('clear-sensitive-data', clearPostFiles);

export const isAnimated = (mimeType) => (mimeType.startsWith('video/') || mimeType.endsWith('/gif'));


function resizeVideo(data, type) {
    // normal video, do not convert
    if (!type.endsWith('/gif')) {
        const readableStream = new Readable();
        readableStream.push(data);
        readableStream.push(null);
        return readableStream;
    }

    const passThroughStream = new PassThrough();
    ffmpeg(data)
        // .size(`${width}x?`) // Resize to specified width, keeping aspect ratio
        .outputOptions('-c:v libx264', '-crf 28') // Set codec and compression level
        .format('mp4') // Set format to MP4
        .on('error', (err) => {
            console.error('Error processing video:', err);
            passThroughStream.destroy(err);
        })
        .on('end', () => {
            console.log('Video processing completed.');
        })
        .pipe(passThroughStream, { end: true });

    return passThroughStream;
}



function resizePhoto(data, type) {
    const outputStream = new PassThrough();
    sharp(data)
        .resize({ width: 800 }) // adjust width to reduce size REMOVEME?
        .toFormat(type)
        .pipe(outputStream);

    return outputStream;
}


export async function uploadFile(fobj) {
    // bluesky does not support gifs, so EVERYTHING needs to be an mp4
    const agent = await initSession(),
        anim = isAnimated(fobj.type),
        type = anim ? 'mp4' : fobj.type.split('/')?.at(1),
        typefull = anim ? 'video/mp4' : fobj.type;

    let outputStream;

    if (anim) outputStream = resizeVideo(fobj.data, fobj.type);
    else outputStream = resizePhoto(fobj.data, type);

    // not reading through a stream ffs
    // if (compressedBuffer.length > 976 * 1024) {
    //     console.error("File is still too large after compression. Try further resizing.");
    //     return;
    // }

    // upload the stream as a blob
    const { data } = await agent.uploadBlob(outputStream, { encoding: typefull });
    return data;
}


/**
 * @param {...{name: string, type: string, size: number, data: Uint8Array}} fobjs
 */
export async function handleFileOpen(event, ...fobjs) {
    const o = {};

    for (const fobj of fobjs) {
        try {
            const blobData = await uploadFile(fobj);
            o[fobj.name] = blobData.blob.ref;
            fnamesToPosts[fobj.name] = blobData.blob;
        }
        catch (err) {
            console.error(err);
            o[fobj.name] = false;
        }
    }

    return JSON.stringify(o);
}