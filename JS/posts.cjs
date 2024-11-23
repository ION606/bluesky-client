const { formatStr } = require("../src/renderer.cjs");

function zoomimg(e) {
	const { src } = e.target,
		overlayEl = document.querySelector('.overlay'),
		zoomContainer = document.querySelector('#imgzoom');

	zoomContainer.querySelector('video').style.display = 'none';
	zoomContainer.querySelector('img').style.display = '';

	zoomContainer.querySelector('img').src = src;
	zoomContainer.classList.toggle('zoomed');
	overlayEl.classList.toggle('hidden');
	document.querySelector('.profile-container').classList.toggle('.noscroll');
}

function zoomvid(e) {
	const { src } = e.target;
	if (src.endsWith('/assets/video-loading.mp4')) return;

	const zoomContainer = document.querySelector('#imgzoom');
	if (zoomContainer.contains(e.target)) return;

	e.target.pause();

	zoomContainer.querySelector('video').style.display = '';
	zoomContainer.querySelector('img').style.display = 'none';

	zoomContainer.querySelector('video').src = src;
	zoomContainer.classList.toggle('zoomed');
	document.querySelector('.overlay').classList.toggle('hidden');
	document.querySelector('.profile-container').classList.toggle('.noscroll');

	const isZoomed = zoomContainer.classList.contains('zoomed');
	e.target.parentElement.querySelector('.controls').style.display = (isZoomed) ? 'none !important' : ''
}


// video stuff
function createVideoEl() {
	// create main video container
	const videoContainer = document.createElement('div');
	videoContainer.classList.add('video-container');
	videoContainer.classList.add('zoom-video');

	// create video element
	const videoElement = document.createElement('video');
	videoElement.classList.add('video-element');
	videoElement.src = ''; // specify the video source here
	videoElement.controls = false; // disable default controls
	videoElement.setAttribute('playsinline', ''); // ensures mobile compatibility for inline playback

	// create controls container
	const controls = document.createElement('div');
	controls.classList.add('controls');

	// create play/pause button
	const playPauseButton = document.createElement('button');
	playPauseButton.classList.add('play-pause');
	playPauseButton.textContent = '';

	// create fullscreen button
	const fullscreenButton = document.createElement('button');
	fullscreenButton.classList.add('fullscreen');
	fullscreenButton.textContent = '⛶';

	// create progress bar
	const progressBar = document.createElement('input');
	progressBar.classList.add('progress-bar');
	progressBar.type = 'range';
	progressBar.min = '0';
	progressBar.value = '0';
	progressBar.step = '0.1';

	// create volume button with slider container
	const volumeContainer = document.createElement('div');
	volumeContainer.classList.add('volume-container');

	const volumeButton = document.createElement('button');
	volumeButton.classList.add('volume-button');
	volumeButton.textContent = '🔊';

	// append volume control to volume container
	volumeContainer.appendChild(volumeButton);

	// append controls to controls container
	controls.appendChild(playPauseButton);
	controls.appendChild(progressBar);
	controls.appendChild(volumeContainer); // add volume container to the interface
	controls.appendChild(fullscreenButton);

	controls.style.display = 'none';

	// append video and controls to video container
	videoContainer.appendChild(videoElement);
	videoContainer.appendChild(controls);

	// JavaScript functionality for controls

	// update play/pause functionality
	playPauseButton.addEventListener('click', () => {
		videoContainer.querySelector('.play-icon')?.remove();
		if (videoElement.paused || videoElement.ended) {
			videoElement.play();
			playPauseButton.classList.remove('play');
			playPauseButton.classList.add('pause');
		} else {
			videoElement.pause();
			playPauseButton.classList.remove('pause');
			playPauseButton.classList.add('play');
		}
	});
	fullscreenButton.onclick = (_) => videoElement.click();

	// set initial icon state to "play"
	playPauseButton.classList.add('play');

	// update progress bar as video plays
	videoElement.addEventListener('timeupdate', () => {
		progressBar.value = (videoElement.currentTime / videoElement.duration) * 100;
	});

	videoElement.addEventListener('pause', () => {
		playPauseButton.classList.remove('pause');
		playPauseButton.classList.add('play');
	});

	videoElement.addEventListener('play', () => {
		playPauseButton.classList.remove('play');
		playPauseButton.classList.add('pause');
	});

	// allow user to skip within video by dragging progress bar
	progressBar.addEventListener('input', () => {
		videoElement.currentTime = (progressBar.value / 100) * videoElement.duration;
	});

	// adjust video volume with volume control
	let preVol;
	volumeButton.addEventListener('click', () => {
		if (videoElement.volume) {
			preVol = videoElement.volume;
			videoElement.volume = '0';
			volumeButton.textContent = '🔇';
		}
		else {
			videoElement.volume = preVol || '1';
			volumeButton.textContent = '🔊';
		}
	});

	return videoContainer;
}


function sendSuccess(dmItem, failed = false) {
	const image = dmItem.querySelector('img');
	if (image) {
		// Create the checkmark div
		const checkmark = document.createElement('div');
		checkmark.className = (failed) ? 'crossmark' : 'checkmark';
		checkmark.style.marginRight = '10px';

		// Replace the image with the checkmark
		image.replaceWith(checkmark);

		setTimeout(() => {
			document.querySelector('#dmPopup').querySelector('.close-btn').click();
			checkmark.replaceWith(image);
			checkmark.remove();
		}, 1500);
	}
	else console.log('no pfp found!');

	dmItem.classList.add((failed) ? 'error' : 'success');
}


function renderDMs(posturi, follows, ipcRenderer) {
	const dmList = document.getElementById('dmList');
	dmList.innerHTML = '';

	follows.forEach(follow => {
		const dmItem = document.createElement('div');
		dmItem.className = 'dm-item' + (follow.dm ? '' : ' disabled');
		dmItem.innerHTML = `
		<img src="${follow.avatar}" alt="${follow.displayName}">
		<div class="info">
		  <div class="name">${follow.displayName || follow.handle}</div>
		  <div class="handle">@${follow.handle}</div>
		</div>
	  `;

		dmItem.addEventListener('click', async (e) => {
			e.preventDefault();
			if (!follow.dm) return alert('not allowed!');

			const r = await ipcRenderer.invoke('send-post', posturi, follow.handle, follow.dm.id);
			if (!r) sendSuccess(dmItem, true);
			else sendSuccess(dmItem);
		});

		dmList.appendChild(dmItem);
	});
}


function createButtonEls(card, ipcRenderer, idkey = 'bskyid', containerid = 'cards') {
	// Add this to your function after creating the main card content
	const buttonContainer = document.createElement('div');
	buttonContainer.classList.add('button-container');

	// Like button
	const likeButton = document.createElement('button');
	likeButton.classList.add('action-button', 'like-button');
	likeButton.innerHTML = `<i class="fa-${card.dataset.likeuri ? 'solid' : 'regular'} fa-heart"></i>`;
	likeButton.title = 'Like';

	// Like button
	const repostButton = document.createElement('button');
	repostButton.className = 'action-button';
	repostButton.style.color = card.dataset.reposturi ? '#10c200' : 'grey';
	repostButton.innerHTML = `<i class="fa-solid fa-retweet"></i>`;
	repostButton.title = 'Repost';

	// Delete button
	const deleteButton = document.createElement('button');
	deleteButton.classList.add('action-button', 'delete-button');
	deleteButton.innerHTML = '<i class="fas fa-trash-alt"></i>';
	deleteButton.title = 'Delete';

	// Send via DM button
	const sendDMButton = document.createElement('button');
	sendDMButton.classList.add('action-button', 'dm-button');
	sendDMButton.innerHTML = '<i class="fas fa-paper-plane"></i>';
	sendDMButton.title = 'Send via DM';

	// Copy link button
	const copyLinkButton = document.createElement('button');
	copyLinkButton.classList.add('action-button', 'copy-link-button');
	copyLinkButton.innerHTML = '<i class="fas fa-link"></i>';
	copyLinkButton.title = 'Copy Link';

	// Pin/Unpin toggle button
	const pinButton = document.createElement('button');
	pinButton.classList.add('action-button', 'pin-button');
	pinButton.innerHTML = '<i class="fas fa-thumbtack"></i>';
	pinButton.title = 'Pin/Unpin';

	// Three-dot menu button to toggle dropdown
	const menuButton = document.createElement('button');
	menuButton.classList.add('action-button', 'menu-button');
	menuButton.innerHTML = '<i class="fas fa-ellipsis-h"></i>';
	menuButton.title = 'More options';

	// Dropdown menu container for collapsible options
	const dropdownMenu = document.createElement('div');
	dropdownMenu.classList.add('dropdown-menu');
	dropdownMenu.classList.add('hidden'); // initially hidden

	dropdownMenu.append(pinButton, copyLinkButton)

	// Append buttons to the container
	buttonContainer.appendChild(likeButton);
	buttonContainer.appendChild(repostButton);
	buttonContainer.appendChild(deleteButton);
	buttonContainer.appendChild(sendDMButton);
	buttonContainer.appendChild(menuButton);
	buttonContainer.appendChild(dropdownMenu);

	// Like button functionality
	likeButton.addEventListener('click', async () => {
		const lurl = card.dataset.likeuri,
			r = await ipcRenderer.invoke('post-action', 'like', card.dataset[`${idkey}`], lurl);

		// if there is a url then it should return nothing
		if (!r && !lurl) return alert("ERROR!");
		else if (lurl) delete card.dataset.likeuri;
		else if (r) card.dataset.likeuri = r.uri
		likeButton.innerHTML = `<i class="fa-${lurl ? 'regular' : 'solid'} fa-heart"></i>`
	});

	// Delete button functionality
	deleteButton.addEventListener('click', async () => {
		if (confirm('Are you sure you want to delete this post?')) {
			const r = await ipcRenderer.invoke('post-action', 'delete', card.dataset[`${idkey}`]);
			if (!r) return alert("ERROR!");
			card.remove();
			// alert('Post deleted.');
		}
	});

	// Send DM functionality
	sendDMButton.addEventListener('click', async () => {
		const r = await ipcRenderer.invoke('get-connections');
		document.getElementById('dmPopup').classList.add('active');
		renderDMs(card.dataset[`${idkey}`], r.follows, ipcRenderer);
	});

	// Copy link functionality
	copyLinkButton.addEventListener('click', async () => {
		const r = await ipcRenderer.invoke('post-action', 'link', card.dataset[`${idkey}`]);
		if (!r) return alert("ERROR!");
		navigator.clipboard.writeText(r).then(() => {
			alert('Link copied to clipboard!');
		});
	});

	// Repost functionality
	repostButton.addEventListener('click', async () => {
		const r = await ipcRenderer.invoke('post-action', 'repost', card.dataset[`${idkey}`], card.dataset.reposturi);

		if (!r) alert('ERROR!');
		else if (card.dataset.reposturi) {
			// TODO: move the card back to it's original position or refresh the page?
			if (!card.dataset.ismypost) card.remove();
			delete card.dataset.reposturi;
			repostButton.style.color = 'grey';
		}
		else {
			const pinnedEl = document.querySelector(`#${containerid}container`).querySelector('.pinned-card');
			if (pinnedEl) pinnedEl.after(card);
			else document.querySelector(`#${containerid}container`).prepend(card);

			card.dataset.reposturi = r;
			repostButton.style.color = '#10c200';
		}
	});

	// Pin/Unpin functionality
	let isPinned = false;
	pinButton.addEventListener('click', async () => {
		return alert("TODO");
		// const r = await ipcRenderer.invoke('post-action', 'pin', card.dataset.bskyid);
		// return alert(r);

		isPinned = !isPinned;
		pinButton.title = isPinned ? 'Unpin' : 'Pin';
		pinButton.classList.toggle('pinned', isPinned);
		alert(isPinned ? 'Pinned!' : 'Unpinned!');
		// Add logic for pinning/unpinning the post
	});

	menuButton.addEventListener('click', (e) => {
		e.stopPropagation(); // prevent event bubbling
		dropdownMenu.classList.toggle('hidden'); // show/hide menu
	});

	// Hide dropdown menu when clicking outside
	document.addEventListener('click', (e) => {
		if (!buttonContainer.contains(e.target)) {
			dropdownMenu.classList.add('hidden'); // hide menu
		}
	});

	return buttonContainer;
}


function setupWorker(name = 'bktemp') {
	if (typeof (Worker) === "undefined") return console.error('workers not supported!\nswitching to manual...');

	const w = new Worker("../JS/worker.js", { name });
	w.postMessage('PING');
	w.onmessage = function (event) {
		console.log(event.data);
	};

	function stopWorker() {
		w.terminate();
		w = undefined;
	}
}

/**
 * @param {*} post 
 * @param {*} a 
 * @param {{posturi: string, likeuri: string}[]} likes 
 * @param {*} ipcRenderer 
 * @param {*} container 
 */
function renderPostSingle(post, a, likes, ipcRenderer, container, idkey = 'bskyid', containerid) {
	/** @type {Element} */
	let card;
	const cardId = (post?.reply?.root?.uri || post.post.uri)?.trim();

	// if the card exists, use it; otherwise, create a new card
	if (a.has(cardId)) card = a.get(cardId);
	else {
		card = document.createElement('div');
		card.classList.add('post-card');
		card.dataset[`${idkey}`] = cardId;
	}

	// handle repost reason if it hasn't been added to this card
	if (post.reason && post.reason.by && !card.querySelector('.repost-section')) {
		const aname = post.reason.by.displayName || formatStr(post.reason.by.handle);
		const repostSection = document.createElement('div');
		repostSection.classList.add('repost-section');

		const repostAvatar = document.createElement('img');
		repostAvatar.src = post.reason.by.avatar;
		repostAvatar.alt = `${aname}'s avatar`;
		repostAvatar.classList.add('card-avatar', 'repost-avatar');
		repostAvatar.loading = 'lazy';

		const repostInfo = document.createElement('div');
		repostInfo.classList.add('repost-info');

		const repostName = document.createElement('h2');
		repostName.innerHTML = aname;
		repostName.classList.add('author-name');

		const repostHandle = document.createElement('p');
		repostHandle.innerHTML = `${formatStr('@' + post.reason.by.handle)} reposted`;
		repostHandle.classList.add('author-handle');

		repostInfo.appendChild(repostName);
		repostInfo.appendChild(repostHandle);
		repostSection.appendChild(repostAvatar);
		repostSection.appendChild(repostInfo);

		card.dataset.ismypost = post.post.author.did === post.reason.by.did;
		card.dataset.reposturi = post.post.viewer.repost;
		card.prepend(repostSection);
	}

	// handle reply if it hasn't been added to this card
	if (post.reply && post.reply.root && !card.querySelector('.original-post')) {
		const originalPost = document.createElement('div');
		originalPost.classList.add('original-post');

		const repaname = post.reply.root.author.displayName || formatStr(post.reply.root.author?.handle);
		// add the original author and text
		const originalAuthor = document.createElement('p');
		originalAuthor.innerHTML = `Replying to ${repaname}`;
		originalAuthor.classList.add('original-author');
		originalPost.appendChild(originalAuthor);

		const originalText = document.createElement('p');
		originalText.innerHTML = formatStr(post.reply.root.record.text) || 'Image reply';
		originalText.classList.add('original-text');
		originalPost.appendChild(originalText);

		// add the original image if present
		if (post.reply.root.embed?.images?.length > 0) {
			const originalImage = document.createElement('img');
			originalImage.loading = 'lazy';
			originalImage.src = post.reply.root.embed.images[0].thumb;
			originalImage.alt = post.reply.root.embed.images[0].alt || 'Original post image';
			originalImage.classList.add('original-image');
			originalPost.appendChild(originalImage);
		}

		card.appendChild(originalPost);

		// add the section for "what I was replying to" if grandparentAuthor exists
		if (post.reply.grandparentAuthor) {
			const parentPost = document.createElement('div');
			parentPost.classList.add('parent-post');

			const spacingEl = document.createElement('p');
			spacingEl.className = 'convcont';
			spacingEl.textContent = '.....';

			const parentAuthor = document.createElement('p');
			const paraname = post.reply.parent.author.displayName || formatStr(post.reply.parent.author.handle);
			parentAuthor.innerHTML = `${paraname}`;
			parentAuthor.classList.add('original-author');

			parentPost.append(spacingEl, parentAuthor);

			const parentText = document.createElement('p');
			parentText.innerHTML = formatStr(post.reply.parent.record.text) || 'Image reply';
			parentText.classList.add('original-text');
			parentPost.appendChild(parentText);

			if (post.reply.parent.embed && post.reply.parent.embed.images && post.reply.parent.embed.images.length > 0) {
				const parentImage = document.createElement('img');
				parentImage.loading = 'lazy';
				parentImage.src = post.reply.parent.embed.images[0].thumb;
				parentImage.alt = post.reply.parent.embed.images[0].alt || 'Parent post image';
				parentImage.classList.add('original-image');
				parentPost.appendChild(parentImage);
			}

			card.appendChild(parentPost);
		}
	}

	// author info section for the main post
	if (!card.querySelector('.author-section')) {
		const aname = post.post.author.displayName || formatStr(post.post.author.handle);
		const authorSection = document.createElement('div');
		authorSection.classList.add('author-section');

		const avatar = document.createElement('img');
		avatar.src = post.post.author.avatar;
		avatar.alt = `${aname}'s avatar`;
		avatar.classList.add('card-avatar');
		avatar.loading = 'lazy';

		const authorInfo = document.createElement('div');
		authorInfo.classList.add('author-info');

		const displayName = document.createElement('h2');
		displayName.innerHTML = aname;
		displayName.classList.add('author-name');

		const handle = document.createElement('p');
		handle.innerHTML = `${formatStr('@' + post.post.author.handle)}`;
		handle.classList.add('author-handle');

		authorInfo.appendChild(displayName);
		authorInfo.appendChild(handle);
		authorSection.appendChild(avatar);
		authorSection.appendChild(authorInfo);

		card.appendChild(authorSection);
	}

	// main post text content
	if (!card.querySelector('.post-text')) {
		const textContent = document.createElement('p');
		textContent.innerHTML = formatStr(post.post.record.text);
		textContent.classList.add('post-text');
		card.appendChild(textContent);
	}

	// handle video embed (if present and not added yet)
	if (post.post.embed && post.post.embed.$type === 'app.bsky.embed.video#view' && !card.querySelector('.post-video')) {
		const videoContainer = createVideoEl(), videoPlayer = videoContainer.querySelector('video');

		videoPlayer.classList.add('post-video');
		videoPlayer.width = post.post.embed.aspectRatio?.width;
		videoPlayer.height = post.post.embed.aspectRatio?.height;
		videoContainer.appendChild(videoPlayer);
		card.appendChild(videoContainer);
		videoPlayer.src = '../assets/video-loading.mp4';
		videoPlayer.dataset.src = post.post.embed.playlist;
		videoPlayer.poster = post.post.embed.thumbnail;
	}

	// main post image (if it exists and hasn't been added)
	if (post.post.embed && post.post.embed.images && post.post.embed.images.length > 0 && !card.querySelector('.post-image')) {
		const repeatimg = card.querySelector('.original-image')?.src === post.post.embed.images[0].thumb;
		if (!repeatimg) {
			const imageContainer = document.createElement('div');
			imageContainer.classList.add('image-container');

			const postImage = document.createElement('img');
			postImage.src = post.post.embed.images[0].thumb;
			postImage.alt = post.post.embed.images[0].alt || 'Embedded image';
			postImage.classList.add('post-image');
			postImage.loading = 'lazy';

			imageContainer.appendChild(postImage);
			card.appendChild(imageContainer);
		}
	}

	// interaction counts
	if (!card.querySelector('.interaction-counts')) {
		const counts = document.createElement('div');
		counts.classList.add('interaction-counts');
		counts.textContent = `💬 ${post.post.replyCount}  🔄 ${post.post.repostCount}  ❤️ ${post.post.likeCount}`;
		card.appendChild(counts);
	}

	// add the card to the container if it's a new card
	if (!a.has(cardId)) {
		const lurl = likes.find(o => (o.posturi === cardId));
		if (lurl) card.dataset.likeuri = lurl.likeuri;
		card.appendChild(createButtonEls(card, ipcRenderer, idkey, containerid));
		container.appendChild(card);
		a.set(cardId, card);
	}
}


/**
 * @param {*} posts 
 * @param {*} likes 
 * @param {*} pinnedPost 
 * @param {*} ipcRenderer 
 */
module.exports = function renderPosts(posts, likes, pinnedPost, ipcRenderer, idkey = 'bskyid', containerid = 'posts') {
	console.log(`${idkey}, ${containerid}container, ${posts.length}`);
	let container;
	/** @type {Map<String, Element>} */
	let a;
	if (document.querySelector(`#${containerid}container`)) {
		container = document.querySelector(`#${containerid}container`);
		a = new Map(Array.from(container.querySelectorAll('.post-card')).map(o => ([o.dataset[`${idkey}`], o])));
	}
	else {
		container = document.createElement('div');
		container.classList.add('cards-container');
		container.id = containerid;
		a = new Map();
	}

	// setupWorker();
	// renderLikesFeed(posts.map(p => (p?.reply?.root?.uri || p.post.uri)?.trim()), likes, ipcRenderer);

	for (const post of posts) renderPostSingle(post, a, likes.map(o => ({ posturi: o.post.uri, likeuri: o.post.viewer?.like })), ipcRenderer, container, idkey, containerid);

	const postids = Array.from(document.querySelectorAll(`[data-${idkey}]`)).map(o => o.dataset[`${idkey} `]);
	console.log(postids);

	// "force" garbage collection
	// delete a;
	a.clear();
	a = null;

	if (pinnedPost) {
		const pinnedcard = container.querySelector(`[data-${idkey}="${pinnedPost.uri}"]`);
		if (pinnedcard) {
			const pinnedLabel = document.createElement('div');
			pinnedLabel.classList.add('pinned-label');
			pinnedLabel.textContent = '📌 Pinned'; // optionally add an emoji/icon
			pinnedcard?.prepend(pinnedLabel); // place it at the top of the pinned card
			pinnedcard?.classList.add('pinned-card');
			container.prepend(pinnedcard); // move it to be first
		}
	}

	// append container to the document body or a specific section
	const postdiv = document.getElementById(containerid);
	postdiv.querySelector('.placeholder')?.remove();
	if (!document.querySelector(`#${containerid}container`)) {
		postdiv.appendChild(container);
		document.addEventListener('click', (e) => {
			if (e.target.tagName === "VIDEO") zoomvid(e);
			else if (e.target.tagName === "IMG" || e.target.classList.contains('overlay')) zoomimg(e);
		});
	}
}
