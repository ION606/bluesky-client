const { formatStr } = require('../src/renderer.cjs');


/**
 * @param {Profile} profileData 
 */
function populateProfile(profileData) {
    const bannerImg = document.querySelector('#banner-img');
    const avatarImg = document.querySelector('#avatar-img');
    const handleElement = document.querySelector('#handle');
    const descriptionElement = document.querySelector('#description');
    const followersCountElement = document.querySelector('#followersCount');
    const followsCountElement = document.querySelector('#followsCount');
    const postsCountElement = document.querySelector('#postsCount');

    console.info(profileData);

    // set element content
    bannerImg.src = profileData.banner;
    avatarImg.src = profileData.avatar;
    handleElement.textContent = profileData.handle;
    descriptionElement.innerHTML = formatStr(profileData.description);
    followersCountElement.textContent = profileData.followersCount;
    followsCountElement.textContent = profileData.followsCount;
    postsCountElement.textContent = profileData.postsCount;
}

class Profile {
    constructor(data) {
        if (!data) throw "DATA NOT FOUND!";
        this.did = data.did,
            this.handle = data.handle,
            this.displayName = data.displayName,
            this.avatar = data.avatar,
            this.associated = data.associated,
            this.viewer = data.viewer,
            this.labels = data.labels,
            this.createdAt = data.createdAt,
            this.description = formatStr(data.description),
            this.indexedAt = data.indexedAt,
            this.banner = data.banner,
            this.followersCount = data.followersCount,
            this.followsCount = data.followsCount,
            this.postsCount = data.postsCount,
            this.pinnedPost = data.pinnedPost
    }

    getProfileSummary() {
        return `${this.handle} (${this.did}): ${this.description}`;
    }

    getPinnedPostUri() {
        return this.pinnedPost.uri;
    }
}


module.exports = { Profile, populateProfile }