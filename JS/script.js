document.addEventListener('scroll', () => bottomscrolled(document.querySelector('#posts')));
async function bottomscrolled(targetDiv) {
    const scrollPosition = window.scrollY + window.innerHeight,
        pageHeight = document.documentElement.scrollHeight,
        atbottom = (scrollPosition >= pageHeight);

    if (!atbottom) return;

    window.electronAPI.getnewposts();
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
}

// function to handle layout selection
function togglerelaxed(e) {
    e.preventDefault(); // prevent the default anchor behavior

    const value = e.target.getAttribute('data-value');
    const container = document.querySelector(`#${sessionStorage.getItem('currenttab') || 'cardscontainer'}`);

    console.log(value)

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

document.addEventListener('DOMContentLoaded', () => {
    // event listener for dropdown items
    document.querySelectorAll('#layoutDropdown a').forEach(item => {
        item.addEventListener('click', togglerelaxed);
    });
});