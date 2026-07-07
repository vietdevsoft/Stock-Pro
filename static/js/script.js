// ==============================
// Stock Pro Landing Interactions
// ==============================

const header = document.getElementById('siteHeader');
const hamburgerBtn = document.getElementById('hamburgerBtn');
const navMenu = document.getElementById('navMenu');
const navLinks = document.querySelectorAll('.nav-link, .footer-links a, .hero-actions a, .cta-actions a, .category-card a');
const observedSections = document.querySelectorAll('.section-observe');
const menuNavLinks = document.querySelectorAll('.nav-menu .nav-link');
const tiltCards = document.querySelectorAll('.tilt-card');

// Header shadow when scrolling
let headerScrollTicking = false;

function updateHeaderScrollState() {
    if (!header) return;

    header.classList.toggle('scrolled', window.scrollY > 18);
    headerScrollTicking = false;
}

window.addEventListener('scroll', () => {
    if (headerScrollTicking) return;

    headerScrollTicking = true;
    window.requestAnimationFrame(updateHeaderScrollState);
}, { passive: true });

// Open mobile menu
function openMenu() {
    navMenu.classList.remove('closing');
    navMenu.classList.add('open');
    hamburgerBtn.classList.add('active');
    hamburgerBtn.setAttribute('aria-expanded', 'true');
}

// Close mobile menu with fade-out
function closeMenu() {
    if (!navMenu.classList.contains('open')) return;

    navMenu.classList.add('closing');
    hamburgerBtn.classList.remove('active');
    hamburgerBtn.setAttribute('aria-expanded', 'false');

    window.setTimeout(() => {
        navMenu.classList.remove('open', 'closing');
    }, 230);
}

hamburgerBtn.addEventListener('click', () => {
    navMenu.classList.contains('open') ? closeMenu() : openMenu();
});

// Smooth scroll and close menu after selecting item
navLinks.forEach((link) => {
    link.addEventListener('click', (event) => {
        const targetId = link.getAttribute('href');
        if (!targetId || !targetId.startsWith('#')) return;

        const target = document.querySelector(targetId);
        if (!target) return;

        event.preventDefault();
        const headerOffset = header.offsetHeight + 12;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerOffset;

        window.scrollTo({ top: targetPosition, behavior: 'smooth' });
        closeMenu();
    });
});

// Fade in sections when visible
const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (entry.isIntersecting) {
            entry.target.classList.add('show');
            revealObserver.unobserve(entry.target);
        }
    });
}, { threshold: 0.14 });

observedSections.forEach((section) => revealObserver.observe(section));

// Active nav link based on current section
const activeObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const id = entry.target.getAttribute('id');
        menuNavLinks.forEach((link) => {
            link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
        });
    });
}, { threshold: 0.42 });

['home', 'categories', 'policies', 'login', 'signup'].forEach((id) => {
    const section = document.getElementById(id);
    if (section) activeObserver.observe(section);
});

// Lightweight 3D tilt effect for cards
function handleTilt(event) {
    const card = event.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;

    card.style.transform = `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-6px)`;
}

function resetTilt(event) {
    event.currentTarget.style.transform = '';
}

const canUseHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

if (canUseHover) {
    tiltCards.forEach((card) => {
        card.addEventListener('mousemove', handleTilt);
        card.addEventListener('mouseleave', resetTilt);
    });
}

// Close mobile menu when resizing back to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
});

function setHeaderAvatar(imageUrl) {
    const avatar = document.querySelector('.user-account-link .user-avatar');
    if (!avatar || !imageUrl) return;

    avatar.textContent = '';
    avatar.classList.add('has-image');
    avatar.style.backgroundImage = `url("${imageUrl}")`;
    avatar.style.backgroundSize = 'cover';
    avatar.style.backgroundPosition = 'center';
}

async function loadHeaderProfile() {
    if (!document.querySelector('.user-account-link')) return;

    try {
        const response = await fetch('/users/profile', {
            method: 'GET',
            credentials: 'same-origin'
        });
        const result = await response.json();

        if (!result.success || !result.data) return;

        setHeaderAvatar(result.data.avatar_url);

        const userName = document.querySelector('.user-account-link .user-name');
        if (userName && result.data.full_name) userName.textContent = result.data.full_name;
    } catch (error) {
        console.error('Không thể cập nhật avatar header:', error);
    }
}

loadHeaderProfile();

// Logged-in user dropdown
const userMenu = document.getElementById('userMenu');
const userTrigger = document.getElementById('userTrigger');

if (userMenu && userTrigger) {
    userTrigger.addEventListener('click', (event) => {
        event.stopPropagation();
        const isOpen = userMenu.classList.toggle('open');
        userTrigger.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (event) => {
        if (!userMenu.contains(event.target)) {
            userMenu.classList.remove('open');
            userTrigger.setAttribute('aria-expanded', 'false');
        }
    });

    userMenu.querySelectorAll('a').forEach((item) => {
        item.addEventListener('click', () => {
            userMenu.classList.remove('open');
            userTrigger.setAttribute('aria-expanded', 'false');
            if (window.innerWidth <= 820 && typeof closeMenu === 'function') closeMenu();
        });
    });
}
