document.addEventListener('scroll', bottomscrolled);
async function bottomscrolled(e) {
    const scrollPosition = window.scrollY + window.innerHeight,
        pageHeight = document.documentElement.scrollHeight,
        atbottom = (scrollPosition >= pageHeight);

    if (!atbottom) return;

    // get the current div
    const targetDiv = document.querySelector('.content.active')

    switch (targetDiv.id) {
        case 'posts': window.electronAPI.getnewposts();
            break;
        case 'replies': window.electronAPI.getReplies()
            break;
        case 'likes': window.electronAPI.getnewlikes();
            break;
        case 'media':
            window.electronAPI.getnewmedia();
            break;

        default: console.log(`unknown scroll div ID ${targetDiv.id}`);
    }
}

// function to toggle the active section
function showSection(sectionId) {
    // hide all sections
    document.querySelectorAll('.content').forEach((content) => {
        content.classList.remove('active');
    });

    // remove active class from all buttons
    document.querySelectorAll('.tab-buttons button').forEach((button) => {
        button.classList.remove('active');
    });

    // show the selected section and activate the button
    document.getElementById(sectionId).classList.add('active');
    document.getElementById(sectionId + 'Btn').classList.add('active');

    createDropdown();
}


function createDropdown() {
    document.querySelector('.dropdown')?.remove();

    const activeDiv = document.querySelector('.content.active');
    if (activeDiv.id === 'replies') return;

    const dropdown = document.createElement('div');
    dropdown.classList.add('dropdown');

    const button = document.createElement('button');
    button.classList.add('dropdown-button');
    button.textContent = 'Layout: Compact';

    const content = document.createElement('div');
    content.classList.add('dropdown-content');
    content.id = 'layoutDropdown';

    const options = [
        { text: 'Large', value: 'large' },
        { text: 'Relaxed', value: 'relaxed' },
        { text: 'Compact', value: 'compact', selected: true }
    ];

    options.forEach(({ text, value, selected }) => {
        const link = document.createElement('a');
        link.href = '#';
        link.dataset.value = value;
        link.textContent = text;
        if (selected) link.classList.add('selected');
        link.addEventListener('click', togglerelaxed);
        content.appendChild(link);
    })

    dropdown.append(button, content);
    activeDiv.prepend(dropdown);
}


// function to handle layout selection
function togglerelaxed(e) {
    e.preventDefault(); // prevent the default anchor behavior

    const container = document.querySelector('.content.active [class*="cards-container"]'),
        value = e.target.getAttribute('data-value');

    if (!container) return console.warn('container not found!');

    if (value === 'compact') {
        container.classList.remove('cards-container-relaxed');
        container.classList.add('cards-container');
    } else {
        container.style.gridTemplateColumns = (value !== 'large') ? 'repeat(auto-fill, minmax(280px, 1fr))' : '';
        container.classList.remove('cards-container');
        container.classList.add('cards-container-relaxed');
    }

    // update dropdown button text to reflect current selection
    document.querySelector('.dropdown-button').textContent = `Layout: ${value.charAt(0).toUpperCase() + value.slice(1)}`;
}

document.addEventListener('DOMContentLoaded', createDropdown);