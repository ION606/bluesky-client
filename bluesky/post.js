import { Agent, RichText } from "@atproto/api";
import { getPostFiles, isAnimated, popPostFile, uploadFile } from "./files.js";
import { initSession } from "./main.js";


async function createEmbed(imgs, vid, embed) {
    let embdData;

    if (vid) {
        embdData = {
            $type: 'app.bsky.embed.video',
            video: vid[1]
        }
    }
    else if (vid) {
        embdData = {
            $type: 'app.bsky.embed.images',
            images: imgs.map(f => ({ alt: 'image!', image: f[1] }))
        }
    }
    else if (embed) {
        const img = popPostFile(embed.Image);

        return {
            $type: 'app.bsky.embed.external',
            external: {
                description: embed.Description,
                uri: embed.Uri,
                title: embed.Title,
                thumb: img
            }
        }
    }
}


export default async function post(e, postData) {
    try {
        const { text, embed } = JSON.parse(postData);

        const agent = await initSession(),
            files = getPostFiles(),
            imgs = files.filter(o => !isAnimated(o[1].mimeType)),
            vid = files.find(o => isAnimated(o[1].mimeType)),
            rt = new RichText({ text });

        agent.post({
            text: rt.text,
            facets: rt.facets,
            langs: ["en-US"],
            createdAt: new Date().toISOString(),
            embed: await createEmbed(imgs, vid, embed)
        });
    }
    catch (err) {
        console.error(err);
        return false;
    }
}

/**
 * @param {*} e 
 * @param {*} action 
 * @param {*} postid 
 * @param {Agent} agent 
 * @returns 
 */
export async function handlePostAction(e, action, postid, agent, condition = false) {
    try {
        if (!postid) return 404;

        let r;
        const [, did, collection, rkey] = postid.match(/^at:\/\/([^\/]+)\/([^\/]+)\/(.+)$/),
            post = await agent.getPost({ repo: did, rkey, collection });

        if (action === 'delete') {
            await agent.deletePost(post.uri);
            return postid;
        }
        else if (action === 'like') return await condition ? agent.deleteLike(condition) : agent.like(post.uri, post.cid);
        else if (action === 'link') return `https://bsky.app/profile/${did}/post/${rkey}`;
        else if (action === 'repost' && condition) {
            await agent.deleteRepost(condition);
            return postid;
        }
        else if (action === 'repost') {
            const uri = (await agent.repost(post.uri, post.cid)).uri;
            // const author = await agent.app.bsky.feed.searchPosts({ url: post.uri });
            // console.log(author)
            return uri;
        }
        else if (action === 'pin') return null; //agent.app.bsky.feed.sendInteractions({interactions: [{event: ''}]})


        return JSON.stringify(r);
    }
    catch (err) {
        console.error(err);
        return false;
    }
}