const { formatStr } = require("../src/renderer.cjs");


function renderPost(postData, post, isReply = false) {
    const card = document.createElement('div');
    card.classList.add(isReply ? 'reply-card' : 'post-card');

    if (post.pinned) {
        const pinnedLabel = document.createElement('div');
        pinnedLabel.classList.add('pinned-label');
        pinnedLabel.textContent = '📌 Pinned';
        card.appendChild(pinnedLabel);
    }

    card.dataset.bskyid = post.uri;
    card.onclick = (e) => {
        if (e.target !== card && !e.target.classList.contains('post-text')) return;
        window.location.href = `../HTML/post.html?id=${encodeURI(card.dataset.bskyid)}`;
    }

    // Author section
    const authorSection = document.createElement('div');
    authorSection.classList.add('author-section');
    const avatar = document.createElement('img');
    avatar.loading = 'lazy';
    avatar.src = post.author.avatar;
    avatar.alt = `${post.author.displayName}'s avatar`;
    avatar.classList.add('card-avatar');
    const authorInfo = document.createElement('div');
    authorInfo.classList.add('author-info');
    const displayName = document.createElement('p');

    displayName.innerHTML = formatStr(`@${post.author.handle}`);
    if (post.author.displayName) displayName.textContent = post.author.displayName;

    displayName.classList.add('author-name');
    const handle = document.createElement('p');
    handle.innerHTML = formatStr(`@${post.author.handle}`);
    handle.classList.add('author-handle');
    authorInfo.append(displayName, handle);
    authorSection.append(avatar, authorInfo);

    // Post content
    const postContent = document.createElement('p');
    postContent.textContent = post.record.text;
    postContent.classList.add('post-text');

    // Media (if exists)
    if (post.embed?.images?.length > 0) {
        const postMedia = document.createElement('img');
        postMedia.loading = 'lazy';
        postMedia.src = post.embed.images[0].fullsize;
        postMedia.alt = post.embed.images[0].alt;
        postMedia.classList.add('post-image');
        card.append(postMedia);
    }

    if (post.embed && post.embed.$type === 'app.bsky.embed.external#view') {
        const embedContainer = document.createElement('div'),
            embed = post.embed.external;

        embedContainer.classList.add('external-embed-container');

        // Check for thumbnail
        if (embed.thumb) {
            const thumbnail = document.createElement('img');
            thumbnail.loading = 'lazy';
            thumbnail.classList.add('external-embed-thumb');

            // Use embed.uri for GIFs, otherwise use thumbnail
            thumbnail.src = embed.uri.match(/\.gif(?:\?.*|$)/) ? embed.uri : embed.thumb;

            // Handle ALT descriptions if provided
            if (embed.description.startsWith('ALT:') && embed.title === embed.description.substring(4).trim()) {
                thumbnail.alt = embed.description.substring(4).trim();
            } else {
                thumbnail.alt = `${embed.title} thumbnail`;
            }

            embedContainer.appendChild(thumbnail);
        }

        // Handle the case of an image with ALT only
        if (!(embed.description.startsWith('ALT:') && embed.title === embed.description.substring(4).trim())) {
            // Title
            const titleElement = document.createElement('h3');
            titleElement.classList.add('external-embed-title');
            titleElement.textContent = embed.title;

            // Description
            const descriptionElement = document.createElement('p');
            descriptionElement.classList.add('external-embed-description');
            descriptionElement.textContent = embed.description;

            // Link
            const linkElement = document.createElement('a');
            linkElement.classList.add('external-embed-link');
            linkElement.href = embed.uri;
            linkElement.target = '_blank';
            linkElement.rel = 'noopener noreferrer'; // Security improvement
            linkElement.textContent = 'Visit';

            // Append title, description, and link
            embedContainer.appendChild(titleElement);
            embedContainer.appendChild(descriptionElement);
            embedContainer.appendChild(linkElement);
        }

        card.appendChild(embedContainer);
    }

    let interactionSection;
    
    if (isReply) {
        interactionSection = document.createElement('div');
        interactionSection.classList.add('interaction-section');
        interactionSection.innerHTML = `
                <span>💬 ${post.replyCount}</span><span>🔄 ${post.repostCount}</span><span>❤️ ${post.likeCount}</span>
            `;
    }
    else {
        interactionSection = document.createElement('div');
        interactionSection.classList.add('interaction-section');
        interactionSection.innerHTML = `
            <button class="interaction-button">💬 ${postData.post.replyCount}</button>
            <button class="interaction-button">🔄 ${postData.post.repostCount}</button>
            <button class="interaction-button">❤️ ${postData.post.likeCount}</button>
        `;
    }

    card.prepend(authorSection);
    card.append(postContent);
    card.append(interactionSection);

    if (!isReply) {
        card.style.cursor = 'default';
        card.onclick = (_) => null;
    }

    return card;
};


async function renderMain(postData) {
    const container = document.getElementById('post-container');
    if (!container) return alert("ERROR! CONTAINER NOT FOUND!");

    console.log(postData);

    // Render main post
    const mainPost = renderPost(postData, postData.post);
    container.appendChild(mainPost);

    // Render replies
    if (postData.replies && postData.replies.length > 0) {
        const replyThread = document.createElement('div');
        replyThread.classList.add('reply-thread');
        postData.replies.forEach(reply => {
            try {
                const replyCard = renderPost(postData, reply.post, true);
                replyThread.appendChild(replyCard);
            }
            catch (err) {
                console.error('failed to render', reply, 'with reason\n', err);
            }
        });
        container.appendChild(replyThread);
    }
}



/**
 * @param {Electron.IpcRenderer} ipcRenderer 
 */
async function init(ipcRenderer) {
    const params = new URLSearchParams(window.location.search),
        bskyid = params.get('id');
    const r = await ipcRenderer.invoke('get-post-single', bskyid);

    renderMain(r);
}


module.exports = init;