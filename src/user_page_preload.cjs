const { contextBridge, ipcRenderer } = require('electron');
const { populateProfile, Profile } = require('../JS/Profile.cjs');
const renderPosts = require('../JS/posts.cjs');
const renderReplies = require('../JS/replies.cjs');
const { displayUploadStatus, renderCompose } = require('../JS/compose.cjs');


const disableTab = (tabid) => {
    const el = document.querySelector(`#${tabid}Btn`);
    el.outerHTML = '<button id="likesBtn" class="notallowed">Likes</button>'
}

async function handleFileDialogue(e) {
    try {
        const file = e.target.files[0];
        if (file) {
            try {
                // read file data as a buffer
                const fileBuffer = await file.arrayBuffer();

                // send file data to main process
                const files = await ipcRenderer.invoke('upload-file', {
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    data: Buffer.from(fileBuffer)
                });

                e.target.dataset.fname = file.name;

                displayUploadStatus(JSON.parse(files));
            } catch (error) {
                console.error("Failed to upload file:", error);
            }
        }
        console.log(e.target.files);
        // console.log('savePath: ', savePath);
    } catch (e) {
        console.log('Error:', e);
    }
}

const appendEOF = (divid) => {
    if (document.getElementById(divid)?.querySelector('.eof')) return;
    else {
        const d = document.createElement('div');
        d.className = 'eof';
        d.innerHTML = '<h2>Reached end of feed!</h2>';
        document.getElementById(divid)?.appendChild(d);
    }
}


window.addEventListener('DOMContentLoaded', () => {
    if (window.location.pathname.endsWith('/post.html')) return require('../JS/singlepost.cjs')(ipcRenderer);

    renderCompose(ipcRenderer);
    const query = new URLSearchParams(window.location.search);
    const utag = query.get('profile') || '@me';

    ipcRenderer.on('udata', (e, dataRaw) => {
        // REMOVE ALL CURSORS
        sessionStorage.clear();
        setupMutationObserver();

        const data = JSON.parse(dataRaw),
            pObj = new Profile(data.profile);

        if (data.err) throw data.err;

        console.log(data);
        if (data.postcursor) sessionStorage.setItem('postcursor', data.postcursor);
        if (data.likesCursor) {
            sessionStorage.setItem('likescursor', data.likesCursor);
            sessionStorage.setItem('likesfeedcursor', data.likesCursor);
        }
        if (data.media.cursor) sessionStorage.setItem('mediacursor', data.media.cursor);

        document.querySelector('#loading')?.remove();
        populateProfile(pObj);

        if (data.posts) renderPosts(data.posts, data.likes || [], pObj?.pinnedPost, ipcRenderer);
        if (data.replies) renderReplies(data.replies);
        if (data.likes?.length) renderPosts(data.likes, data.likes, null, ipcRenderer, 'bskylikeid', 'likes');
        else disableTab('likes');
        if (data.media) renderPosts(data.media.data, data.likes, null, ipcRenderer, 'bskymediaid', 'media');
    });

    contextBridge.exposeInMainWorld('electronAPI', {
        getnewposts: () => {
            const cursor = sessionStorage.getItem('postcursor'),
                likescursor = sessionStorage.getItem('likescursor');

            if (cursor) ipcRenderer.invoke('getposts', utag, cursor, likescursor);
            else appendEOF('posts');
        },
        getnewlikes: () => {
            const cursor = sessionStorage.getItem('likesfeedcursor');

            if (cursor) ipcRenderer.invoke('getlikes', utag, cursor);
            else appendEOF('likes');
        },
        getHistory: (cursor = undefined) => ipcRenderer.invoke('gethistory', cursor),
        getReplies: (utag) => {
            const cursor = sessionStorage.getItem('repliescursor');
            if (cursor) ipcRenderer.invoke('getreplies', cursor, utag);
            else appendEOF('replies');
        },
        getnewmedia: (utag) => {
            const cursor = sessionStorage.getItem('mediacursor');
            if (cursor) ipcRenderer.invoke('getmedia', cursor, utag);
            else appendEOF('media');
        },
        getVideo: (src) => ipcRenderer.invoke('getvideo', src),
    });

    ipcRenderer.on('posts', (e, rawData) => {
        const data = JSON.parse(rawData);

        // reset all videos because the cache was cleared
        document.querySelectorAll('.post-card video').forEach(video => {
            video.src = '../assets/video-loading.mp4';
            video.pause();
            video.currentTime = 0;
        });

        if (data.err) return alert(data.err);
        if (data.posts.feed) renderPosts(data.posts.feed, data.likes?.feed, null, ipcRenderer);

        if (data.posts.cursor) sessionStorage.setItem('postcursor', data.posts.cursor);
        else sessionStorage.removeItem('postcursor');

        if (data.likes.cursor) sessionStorage.setItem('likescursor', data.likes.cursor);
    });

    ipcRenderer.on('likes', (e, data) => {
        // reset all videos because the cache was cleared
        document.querySelectorAll('.post-card video').forEach(video => {
            video.src = '../assets/video-loading.mp4';
            video.pause();
            video.currentTime = 0;
        });

        if (data.err) return alert(data.err);

        console.log(data);
        renderPosts(data.feed, data.feed, null, ipcRenderer, 'bskylikeid', 'likes');

        if (data.cursor) sessionStorage.setItem('likesfeedcursor', data.cursor);
        else sessionStorage.removeItem('likesfeedcursor');
    });

    ipcRenderer.on('history', (e, data) => {
        const hist = JSON.parse(data);
        console.log(hist);
    });

    ipcRenderer.on('video', (e, oldurl, newurl) => {
        const vel = document.querySelector(`video[data-src="${oldurl}"]`);
        if (!vel) return console.error(`video with url ${oldurl} not found!`);

        vel.parentElement.querySelector('.controls').style.display = '';
        vel.src = `../cache/videos/${newurl}`;
        vel.loop = false;
        vel.removeEventListener('play', vidplaylistenerfunc);
        vel.play();
    });

    ipcRenderer.on('replies', (e, data) => renderReplies(JSON.parse(data)));
    ipcRenderer.invoke('getdata', utag, true);
});

const vidplaylistenerfunc = (e) => {
    const video = e.target;
    video.controls = false;
    video.loop = true;
    video.parentElement.querySelector('.play-pause').click();
    ipcRenderer.invoke('getvideo', video.dataset.src);
}

const handleNewVideo = (video) => {
    const playicon = document.createElement('div');
    playicon.className = 'play-icon';
    playicon.innerHTML = '&#9658;';
    video.parentElement.appendChild(playicon);
    video.addEventListener('click', vidplaylistenerfunc);
}

const setupMutationObserver = () => {
    new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName === 'VIDEO') handleNewVideo(node);
                else if (node.tagName === 'INPUT' && node.type == "file") node.addEventListener('change', handleFileDialogue);
                else {
                    node.querySelectorAll?.('video').forEach(handleNewVideo);
                    document.querySelectorAll('input[type="file"]')?.forEach(el => el.addEventListener('change', handleFileDialogue));
                }

            });
        });
    }).observe(document.body, { childList: true, subtree: true });
}