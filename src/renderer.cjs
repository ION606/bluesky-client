const isURL = (ustr) => {
    try { return new URL(ustr) }
    catch (err) { return null }
}


/**
 * formats a string by converting URLs and mentions to HTML links
 * @param {string} str - the input string to format
 * @returns {string} - the formatted HTML string
 */
function formatStr(str) {
    if (typeof str !== 'string') return ''; // validate input

    const newStr = str.split(/\s+/).map((c) => {
        // check if string is a URL
        if (isURL(c)) {
            return `<a class="inline external-link" href="${c}" target="_blank" rel="noopener noreferrer">${c}</a>`;
        }
        // check if string is a mention
        if (c.startsWith('@')) {
            const profileLink = c.replace('@', '');
            return `<a class="inline user-link" href="index.html?profile=${encodeURIComponent(profileLink)}" rel="noopener noreferrer">${c}</a>`;
        }

        // return the word as-is if it's neither
        return c;
    });

    return newStr.join(' ');
}


module.exports = { formatStr, isURL };