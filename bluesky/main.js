import { Agent, AppBskyFeedGenerator, CredentialSession } from '@atproto/api';
import fs from 'fs';
import * as crypto from 'crypto';
import json from '../secrets/config.json' with { type: 'json' }
import { ipcMain } from 'electron';
import logger from '../logger.js';
import { getHistory } from '../src/db.js';
import convertAndServe, { clearCache } from './video.js';
import { handleFileOpen } from './files.js';
import post, { handlePostAction } from './post.js';
import { sendPost } from './convoManager.js';

const { uname, upass } = json.bluesky;
const sessionFilePath = './secrets/session.json'; // path to your session file
export const convoHeader = { "Atproto-Proxy": "did:web:api.bsky.chat#bsky_chat" };


// function to load session data from the file
function loadSession() {
    try {
        if (fs.existsSync(sessionFilePath)) {
            const data = fs.readFileSync(sessionFilePath, 'utf-8');
            logger.info('session loaded successfully');
            return JSON.parse(data);
        }
        logger.info('no existing session found');
        return null;
    } catch (error) {
        logger.error('failed to load session:', error);
        return null;
    }
}

// create a Bluesky session and agent
const session = new CredentialSession(new URL('https://bsky.social'));
const agent = new Agent(session);

// function to save session data to a file, with validation
function saveSession(data) {
    if (!data) {
        logger.error('No session data to save.');
        return;
    }
    try {
        fs.writeFileSync(sessionFilePath, JSON.stringify(data), 'utf-8');
        logger.info('session saved successfully');
    } catch (error) {
        logger.error('failed to save session:', error);
    }
}

// initialize and resume session if possible
export async function initSession() {
    if (session?.session?.active) return agent;

    const savedSession = loadSession();
    if (savedSession) {
        try {
            await session.resumeSession(savedSession);
            logger.info('session resumed successfully');
        } catch (resumeError) {
            logger.warn('failed to resume session, attempting to refresh:', resumeError);
            try {
                await session.refreshSession();
                if (session.session) {
                    saveSession(session.session); // ensure session data exists before saving
                    logger.info('session refreshed and saved successfully');
                } else {
                    logger.error('refresh failed to retrieve valid session data.');
                    await loginAndSaveSession();
                }
            } catch (refreshError) {
                logger.error('session refresh failed, logging in again:', refreshError);
                await loginAndSaveSession();
            }
        }
    } else {
        await loginAndSaveSession();
    }

    // await agent.deleteRepost('at://did:plc:amhzdnxsvkcqjgwdh5kqmhk7/app.bsky.feed.post/3l6tg2zdph62n');
    return agent;
}

// helper function to login and save the session
async function loginAndSaveSession() {
    try {
        await session.login({ identifier: uname, password: upass });
        if (session.session) {
            saveSession(session.session);
            logger.info('logged in and session saved');
        } else {
            logger.error('login succeeded but no session data available to save');
        }
    } catch (loginError) {
        logger.error('login failed:', loginError);
    }
}


export const getDID = async (utag) => {
    try {
        let did;
        if (!utag || utag === '@me') {
            did = session.did || session?.session?.did;
        } else {
            const resolved = await agent.resolveHandle({ handle: utag });
            did = resolved.data.did;
        }
        return did;
    }
    catch (err) {
        console.error(err);
        return null;
    }
}


async function getUserData(utag, allData = false) {
    try {
        await initSession(); // ensure session is fully initialized before proceeding
        const did = await getDID(utag);
        if (!did) return { err: 'DID not found!' };

        const { data } = await agent.getProfile({ actor: did });
        const output = { profile: data };

        if (allData) {
            const { data: { feed, cursor } } = await agent.getAuthorFeed({ actor: output.profile.did, limit: 20, includePins: true }),
                { data: { feed: likes, cursor: likesCursor } } = await agent.getActorLikes({ actor: did });

            output.likes = likes;
            output.likesCursor = likesCursor;
            output.posts = feed;
            output.postcursor = cursor;

            output.replies = await getReplies(utag);
        }

        return output;
    } catch (err) {
        logger.error('failed to fetch user data:', err);
        return {};
    }
}


export const getPosts = async (utag, cursor = undefined, likesCursor = undefined) => {
    try {
        const did = await getDID(utag);
        if (!did) return { err: 'DID not found!' };

        const likes = await agent.getActorLikes({ actor: did, cursor: likesCursor }),
            posts = await agent.getAuthorFeed({ actor: did, limit: 20, includePins: true, cursor });
        return { posts, likes };
    }
    catch (err) {
        console.error(err);
        return { err: 'internal server error!' }
    }
}


export const getReplies = async (utag, cursorInit, limit = 20) => {
    const did = await getDID(utag);
    let posts = await agent.getAuthorFeed({ actor: did, limit: limit, includePins: true, cursor: cursorInit });
    let cursor = posts.data.cursor;
    const replies = posts.data.feed.filter(o => o.reply);

    while (cursor && replies.length < limit) {
        posts = await agent.getAuthorFeed({ actor: did, limit: limit, includePins: true, cursor });
        replies.push(...posts.data.feed.filter(o => o.reply));
        cursor = posts.data.cursor;
    }

    return { replies, cursor };
}


export const getMedia = async (utag, cursorInit, limit = 20) => {
    const did = await getDID(utag);
    let posts = await agent.getAuthorFeed({ actor: did, limit: limit, includePins: true, cursor: cursorInit });
    let cursor = posts.data.cursor;
    const replies = posts.data.feed.filter(o => o.reply);

    while (cursor && replies.length < limit) {
        posts = await agent.getAuthorFeed({ actor: did, limit, includePins: true, cursor });
        replies.push(...posts.data.feed.filter(o => o.reply));
        cursor = posts.data.cursor;
    }

    return { replies, cursor };
}


export const getConnections = async (e, utag, cursor, limit = 20) => {
    const did = await getDID(utag),
        { data: { follows: followsRaw, cursor: followsCursor } } = await agent.getFollows({ actor: did, cursor, limit }),
        { data: { followers: followersRaw, cursor: followersCursor } } = await agent.getFollowers({ actor: did, cursor, limit }),
        { data: { convos } } = await agent.chat.bsky.convo.listConvos({}, { headers: convoHeader }),
        follows = followsRaw?.length ? (await agent.getProfiles({ actors: followsRaw.map(o => o.did) })).data.profiles : [],
        followers = followersRaw?.length ? (await agent.getProfiles({ actors: followersRaw.map(o => o.did) })).data.profiles : [];

    return {
        follows: follows.map(f => {
            f.dm = convos.find(o => o.members.find(m => m.did === f.did));
            return f;
        }), followsCursor, followers, followersCursor
    };
}


// export IPC setup function
export async function setupIPC() {
    ipcMain.handle('getdata', async (event, utag, all = false) => {
        const data = await getUserData(utag, all);
        event.sender.send('udata', JSON.stringify(data));
    });

    ipcMain.handle('getposts', async (e, utag, cursor, likescursor) => {
        if (!cursor) return e.sender.send(404);
        const data = await getPosts(utag, cursor, likescursor);
        if (data.code) return e.sender.send(data.code);
        e.sender.send('posts', JSON.stringify(data));
        clearCache();
    });

    ipcMain.handle('get-connections', getConnections);

    ipcMain.handle('gethistory', (e, limit, offset) => e.sender.send('history', JSON.stringify(getHistory(limit, offset))));
    ipcMain.handle('getreplies', async (e, limit, offset) => e.sender.send('replies', JSON.stringify(await getReplies(limit, offset))));
    ipcMain.handle('getvideo', async (e, oldurl) => {
        const newURL = await convertAndServe(`${crypto.randomUUID()}.mp4`, oldurl);
        e.sender.send('video', oldurl, newURL);
    });

    ipcMain.handle('send-post', sendPost);
    ipcMain.handle('new-post', post);
    ipcMain.handle('upload-file', handleFileOpen);
    ipcMain.handle('post-action', async (e, action, id, condition) => await handlePostAction(e, action, id, agent, condition));
}
