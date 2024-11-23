import { app, BrowserWindow, shell } from 'electron'
import path from 'path'
import { setupIPC } from './bluesky/main.js';
import { insertHistory } from './src/db.js';
import logger from './logger.js';
import { isURL } from './src/renderer.cjs';

/** @type {BrowserWindow?} */
let mainWindow;


const quitApp = async () => {
    try {
        app.quit();
        logger.info("clearing cache...");
        await (await import('./bluesky/video.js')).clearCache();
        logger.info('cache cleared!');
    }
    catch (err) {
        logger.error(err);
    }
    finally {
        process.exit('SIGINT');
    }
}


// function to create the main application window
const createMainWindow = () => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(import.meta.dirname, 'src/user_page_preload.cjs'),  // enable preload for secure communication
            contextIsolation: true,
            enableRemoteModule: false,
            nodeIntegration: true,
        }
    });

    mainWindow.webContents.setWindowOpenHandler((details) => {
        mainWindow.webContents.executeJavaScript(`localStorage.getItem('allowlinks') ? true : confirm('allow redicrection to ${details.url}?')`)
            .then(r => r ? shell.openExternal(details.url) : null);
        return { action: "deny" };
    });

    mainWindow.loadFile('HTML/index.html'); // load the main HTML file
    mainWindow.title = 'User Page';

    mainWindow.on('closed', () => {
        mainWindow = null // dereference the window object when closed
    });

    mainWindow.webContents.on('did-navigate', (_, url) => {
        mainWindow.webContents.executeJavaScript('document.title')
            .then(title => insertHistory(url, title));
    });
}


app.on('ready', () => {
    setupIPC();
    process.on('SIGINT', quitApp);
    createMainWindow();
});

// quit the app on all windows closed, except on macOS
app.on('window-all-closed', () => {
    quitApp();
    if (process.platform !== 'darwin') app.quit();
});

// recreate window if app is re-activated (macOS behavior)
app.on('activate', () => {
    if (mainWindow === null) createMainWindow();
});
