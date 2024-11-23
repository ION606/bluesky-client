import { ChatBskyConvoDefs } from "@atproto/api";
import { convoHeader, getDID, initSession } from "./main.js";



export async function getDMs(cursor = undefined, limit = undefined) {
    try {
        const agent = await initSession(),
            convos = await agent.chat.bsky.convo.listConvos({ cursor, limit });
        return convos.data;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function sendPost(e, posturi, utag, dmid = undefined) {
    try {
        const agent = await initSession(),
            [, did, collection, rkey] = posturi.match(/^at:\/\/([^\/]+)\/([^\/]+)\/(.+)$/),
            post = await agent.getPost({ repo: did, rkey, collection }),

            /** @type {ChatBskyConvoDefs.MessageInput} */
            msg = {
                embed: {
                    $type: 'app.bsky.embed.record',
                    record: {
                        cid: post.cid,
                        uri: post.uri
                    }
                },
                text: ''
            }

        return await sendMessage(utag, msg, dmid);
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


export async function sendMessage(utag, message, convoIdInp = undefined) {
    try {
        const agent = await initSession();
        let convoId;

        if (convoIdInp) convoId = convoIdInp;
        else {
            const did = await getDID(utag);
            if (!did) return null;

            const convos = (await getDMs()).convos;
            convoId = await agent.chat.bsky.convo.getConvo({ convoId: convos.find(o => o.members.find(o => o.did === did)) });
        }
        return (await agent.chat.bsky.convo.sendMessage({ convoId, message }, { headers: convoHeader })).data;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}