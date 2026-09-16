// 1. Typewriter Effect
const text = "Building a Personal iSCSI SAN with Consumer Hardware";
const typeEl = document.getElementById('typewriter');
let i = 0;

function typeWriter() {
    if (i < text.length) {
        typeEl.innerHTML += text.charAt(i);
        i++;
        setTimeout(typeWriter, 50);
    }
}
window.onload = typeWriter;

// 2. Dark Mode Toggle
const toggle = document.getElementById('themeToggle');
const html = document.documentElement;

if (localStorage.getItem('theme') === 'dark') {
    html.setAttribute('data-theme', 'dark');
}

toggle.addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
});

// 3. Nav Highlight (ScrollSpy)
const sections = document.querySelectorAll('section');
const navLinks = document.querySelectorAll('.nav-links a');

window.addEventListener('scroll', () => {
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        if (scrollY >= sectionTop - 150) {
            current = section.getAttribute('id');
        }
    });
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href').includes(current)) {
            link.classList.add('active');
        }
    });
});