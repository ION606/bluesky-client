// set up the overlay and form toggling
async function setup() {
    const composeButton = document.querySelector('#composebtn');
    const newPostForm = document.querySelector('#new-post-form');
    const overlay = document.createElement('div');
    overlay.id = 'overlay';
    document.body.appendChild(overlay);

    function openForm() {
        newPostForm.classList.add("show");
        overlay.classList.add("show");
    }

    composeButton.addEventListener('click', openForm);
}


document.addEventListener('DOMContentLoaded', setup);

async function renderCompose(ipcRenderer) {
    const overlay = document.querySelector("#overlay"),
        postForm = document.querySelector("#postForm"),
        statusMessage = document.querySelector("#statusMessage"),
        closeButton = document.querySelector("#closeButton");

    const newPostForm = document.querySelector("#new-post-form");

    // button and hidden input elements
    const fileButton = document.querySelector("#fileButton"),
        gifButton = document.querySelector("#gifButton"),
        audioButton = document.querySelector("#audioButton"),
        postFile = document.querySelector("#postFile"),
        postGif = document.querySelector("#postGif"),
        postAudio = document.querySelector("#postAudio"),
        postEmbed = document.getElementById('showEmbedButton'),
        embedWidget = document.querySelector('#embedWidget');


    function closeForm() {
        newPostForm.classList.remove("show");
        overlay.classList.remove("show");
    }

    closeButton.addEventListener("click", closeForm);
    overlay.addEventListener("click", closeForm);

    // trigger corresponding inputs when button is clicked
    fileButton.addEventListener("click", () => postFile.click());
    gifButton.addEventListener("click", () => {
        postGif.style.display = 'block';
        postGif.focus();
    });
    audioButton.addEventListener("click", () => postAudio.click());

    postEmbed.addEventListener('click', () => {
        embedWidget.style.display = embedWidget.style.display === 'none' || embedWidget.style.display === '' ? 'block' : 'none';
    });

    postForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const postContent = document.querySelector('#postContent').value.trim(),
            gifUrl = document.querySelector('#postGif').value.trim(),
            statusMessage = document.querySelector('#statusMessage'),
            embedData = Array.from(embedWidget.querySelectorAll('input')).map(o => {
                const id = o.id.replace('embed', '')
                if (o.type === 'file') return [id, o.files[0].name];
                else return [id, o.value];
            });

        // files from hidden inputs
        const file = postFile.files[0];
        const audio = postAudio.files[0];

        statusMessage.textContent = "Posting...";

        try {
            ipcRenderer.invoke('new-post', JSON.stringify({ text: postContent, embed: Object.fromEntries(embedData) }));
            statusMessage.textContent = "Posted successfully!";
            postForm.reset();
            postGif.style.display = 'none'; // hide gif input after submission
        } catch (error) {
            console.error('Error posting:', error);
            statusMessage.textContent = 'Failed to post. Please try again.';
        }
    });
}


function displayUploadStatus(files) {
    const statusContainer = document.querySelector('#uploadStatus'); // element to display results

    // Clear previous status
    statusContainer.innerHTML = '';

    // Iterate through files and display status
    for (const [fileName, fileStatus] of Object.entries(files)) {
        const statusMessage = document.createElement('p');

        if (fileStatus) {
            // Upload succeeded
            statusMessage.textContent = `File "${fileName}" uploaded successfully!`;
            statusMessage.style.color = 'green';
        } else {
            // Upload failed
            statusMessage.textContent = `File "${fileName}" failed to upload!`;
            statusMessage.style.color = 'red';
        }

        // Append status message to the container
        statusContainer.appendChild(statusMessage);
    }
}


module.exports = { renderCompose, displayUploadStatus }