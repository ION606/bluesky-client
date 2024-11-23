// function to create a single reply card, with an optional parent post shown above it
function createReplyCard(replyData) {
    const replyCardContainer = document.createElement('div');
    replyCardContainer.classList.add('reply-card-container');

    // add parent post if exists, along with dots if it's not the root
    if (replyData.reply.parent) {
        const parentPost = createPostPreview(replyData.reply.parent, true);
        replyCardContainer.appendChild(parentPost);

        // add dots if there's a grandparent (to indicate more context above)
        if (replyData.reply.grandparentAuthor) {
            const dots = document.createElement('p');
            dots.classList.add('convcont');
            dots.textContent = '.....';
            replyCardContainer.appendChild(dots);
        }
    }

    // main reply card
    const replyCard = document.createElement('div');
    replyCard.classList.add('reply-card');

    // author section
    const authorSection = document.createElement('div');
    authorSection.classList.add('author-section');

    const avatar = document.createElement('img');
    avatar.src = replyData.post.author.avatar;
    avatar.alt = `${replyData.post.author.handle}'s avatar`;
    avatar.classList.add('card-avatar');
    authorSection.appendChild(avatar);

    const authorInfo = document.createElement('div');
    authorInfo.classList.add('author-info');
    const authorName = document.createElement('p');
    authorName.textContent = replyData.post.author.displayName || replyData.post.author.handle;
    authorName.classList.add('author-name');
    authorInfo.appendChild(authorName);

    authorSection.appendChild(authorInfo);
    replyCard.appendChild(authorSection);

    // reply text
    const replyText = document.createElement('p');
    replyText.textContent = replyData.post.record.text || 'Image reply';
    replyText.classList.add('reply-text');
    replyCard.appendChild(replyText);

    // embedded media if available
    if (replyData.post.embed && replyData.post.embed.external) {
        const mediaContainer = document.createElement('div');
        mediaContainer.classList.add('media-container');

        const mediaImage = document.createElement('img');
        mediaImage.src = replyData.post.embed.external.thumb;
        mediaImage.alt = replyData.post.embed.external.description;
        mediaImage.classList.add('media-image');
        mediaImage.loading = 'lazy';

        mediaContainer.appendChild(mediaImage);
        replyCard.appendChild(mediaContainer);
    }

    replyCardContainer.appendChild(replyCard);
    return replyCardContainer;
}

// helper function to create a condensed preview of the parent post
function createPostPreview(post, isParent = false) {
    const postPreview = document.createElement('div');
    postPreview.classList.add(isParent ? 'parent-post-preview' : 'grandparent-post-preview');

    // author and content preview
    const author = document.createElement('p');
    author.textContent = `${post.author.displayName || post.author.handle}`;
    author.classList.add('original-author');
    postPreview.appendChild(author);

    const content = document.createElement('p');
    content.textContent = post.record.text || 'Image reply';
    content.classList.add('original-text');
    postPreview.appendChild(content);

    return postPreview;
}


module.exports = function renderReplies(replyObj) {
    const repliesContainer = document.querySelector('#replies');
    repliesContainer.querySelector('.placeholder')?.remove();

    const { cursor, replies } = replyObj;

    if (cursor) sessionStorage.setItem('repliescursor', cursor);
    else sessionStorage.removeItem('repliescursor');

    replies.forEach(reply => {
        const replyCard = createReplyCard(reply);
        repliesContainer.appendChild(replyCard);
    });
}
