async function renderLikes(data, ipcRenderer) {
    let container;
	/** @type {Map<String, Element>} */
	let a;
	if (document.querySelector('#likescontainer')) {
		container = document.querySelector('#likescontainer');
		a = new Map(Array.from(container.querySelectorAll('.post-card')).map(o => ([o.dataset.bskyid, o])));
	}
	else {
		container = document.createElement('div');
		container.classList.add('cards-container');
		container.id = 'likescontainer';
		a = new Map();
	}

	// setupWorker();
	// renderLikesFeed(posts.map(p => (p?.reply?.root?.uri || p.post.uri)?.trim()), likes, ipcRenderer);

	for (const post of data) renderPostSingle(post, a, likes.map(o => ({ posturi: o.post.uri, likeuri: o.post.viewer?.like })), ipcRenderer, container);

	const postids = Array.from(document.querySelectorAll('[data-like-bskyid]')).map(o => o.dataset.bskyid);
	console.log(postids);

	// "force" garbage collection
	// delete a;
	a.clear();
	a = null;

	// append container to the document body or a specific section
	const postdiv = document.querySelector('#posts');
	postdiv.querySelector('.placeholder')?.remove();
	if (!document.querySelector('#likescontainer')) {
		postdiv.appendChild(container);
		document.addEventListener('click', (e) => {
			if (e.target.tagName === "VIDEO") zoomvid(e);
			else if (e.target.tagName === "IMG" || e.target.classList.contains('overlay')) zoomimg(e);
		});
	}
}


module.exports = renderLikes;