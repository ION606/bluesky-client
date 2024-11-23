const { contextBridge, ipcRenderer } = require('electron');
const { populateProfile, Profile } = require('../JS/Profile.cjs');
const renderPosts = require('../JS/posts.cjs');
const renderReplies = require('../JS/replies.cjs');
const renderLikes = require('../JS/likes.cjs');
const { displayUploadStatus, renderCompose } = require('../JS/compose.cjs');

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



window.addEventListener('DOMContentLoaded', () => {
    renderCompose(ipcRenderer);
    const query = new URLSearchParams(window.location.search);
    const utag = query.get('profile') || '@me';

    ipcRenderer.on('udata', (e, dataRaw) => {
        setupMutationObserver();

        const data = JSON.parse(dataRaw),
            pObj = new Profile(data.profile);

        if (data.err) throw data.err;

        console.log(data);
        if (data.postcursor) sessionStorage.setItem('postcursor', data.postcursor);
        if (data.likesCursor) sessionStorage.setItem('likescursor', data.likesCursor);

        document.querySelector('#loading')?.remove();
        populateProfile(pObj);

        if (data.posts) renderPosts(data.posts, data.likes || [], pObj?.pinnedPost, ipcRenderer);
        if (data.replies) renderReplies(data.replies);
        if (data.likes) renderPosts(data.likes, data.likes, null, ipcRenderer, 'bskylikeid', 'likes');
    });

    contextBridge.exposeInMainWorld('electronAPI', {
        getnewposts: () => {
            const cursor = sessionStorage.getItem('postcursor'),
                likescursor = sessionStorage.getItem('likescursor');

            if (cursor) ipcRenderer.invoke('getposts', utag, cursor, likescursor);
            else if (document.querySelector('#eof')) return;
            else {
                const d = document.createElement('div');
                d.id = 'eof';
                d.innerHTML = '<h2>Reached end of feed!</h2>';
                document.querySelector('#posts')?.appendChild(d);
            }
        },
        getnewlikes: () => {
            return alert("TODO (check TODO.txt)");
            const cursor = sessionStorage.getItem('postcursor');

            if (cursor) ipcRenderer.invoke('getposts', utag, cursor, likescursor);
            else if (document.querySelector('#eof')) return;
            else {
                const d = document.createElement('div');
                d.id = 'eof';
                d.innerHTML = '<h2>Reached end of feed!</h2>';
                document.querySelector('#posts')?.appendChild(d);
            }
        },
        getHistory: (cursor = undefined) => ipcRenderer.invoke('gethistory', cursor),
        getReplies: (cursor = undefined) => ipcRenderer.invoke('getreplies', cursor),
        getVideo: (src) => ipcRenderer.invoke('getvideo', src),
    });

    ipcRenderer.on('posts', (e, rawData) => {
        const data = JSON.parse(rawData);
        console.log(data);

        // reset all videos because the cache was cleared
        document.querySelectorAll('.post-card video').forEach(video => {
            video.src = '../assets/video-loading.mp4';
            video.pause();
            video.currentTime = 0;
        });

        if (data.err) return alert(data.err);
        if (data.feed) renderPosts(data.posts, data.likes?.map(o => ({ posturi: o.post.uri, likeuri: o.post.viewer?.like })), null, ipcRenderer);

        if (data.cursor) sessionStorage.setItem('postcursor', data.cursor);
        else sessionStorage.removeItem('postcursor');
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