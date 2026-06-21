// ==============================
// Stock Pro Account Interactions
// ==============================

const tabButtons = document.querySelectorAll('.tab-btn[data-tab]');
const panels = document.querySelectorAll('.tab-panel');
const accountTabs = document.getElementById('accountTabs');
const sidebar = document.querySelector('.account-sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const logoutModal = document.getElementById('logoutModal');
const openLogoutButtons = document.querySelectorAll('[data-open-logout]');
const closeLogoutButtons = document.querySelectorAll('[data-close-logout]');
const passwordForm = document.getElementById('passwordForm');
const passwordMessage = document.getElementById('passwordMessage');
const passwordCaptchaCode = document.getElementById('passwordCaptchaCode');
const passwordCaptchaInput = document.getElementById('passwordCaptchaInput');
const passwordCaptchaRefresh = document.getElementById('passwordCaptchaRefresh');
const countElements = document.querySelectorAll('.count-up');

function setActiveTab(tabId, updateHash = true) {
    tabButtons.forEach((button) => button.classList.toggle('active', button.dataset.tab === tabId));
    panels.forEach((panel) => panel.classList.toggle('active', panel.id === tabId));

    if (updateHash) history.replaceState(null, '', `#${tabId}`);
    if (window.innerWidth <= 1040 && sidebar) sidebar.classList.remove('open');

    if (tabId === 'spending') animateCounters();
}

tabButtons.forEach((button) => {
    button.addEventListener('click', () => setActiveTab(button.dataset.tab));
});

document.querySelectorAll('[data-tab-link]').forEach((link) => {
    link.addEventListener('click', (event) => {
        const tab = link.dataset.tabLink;
        if (!tab) return;
        event.preventDefault();
        setActiveTab(tab);
    });
});

if (sidebarToggle && sidebar) {
    sidebarToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

function openLogoutModal(event) {
    event.preventDefault();
    logoutModal.classList.add('open');
    logoutModal.setAttribute('aria-hidden', 'false');
}

function closeLogoutModal() {
    logoutModal.classList.remove('open');
    logoutModal.setAttribute('aria-hidden', 'true');
}

openLogoutButtons.forEach((button) => button.addEventListener('click', openLogoutModal));
closeLogoutButtons.forEach((button) => button.addEventListener('click', closeLogoutModal));

if (logoutModal) {
    logoutModal.addEventListener('click', (event) => {
        if (event.target === logoutModal) closeLogoutModal();
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeLogoutModal();
});


function createPasswordCaptcha() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = 'SP';
    for (let i = 0; i < 3; i += 1) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

function refreshPasswordCaptcha() {
    if (!passwordCaptchaCode) return;
    passwordCaptchaCode.textContent = createPasswordCaptcha();
    if (passwordCaptchaInput) passwordCaptchaInput.value = '';
}

if (passwordCaptchaRefresh) {
    passwordCaptchaRefresh.addEventListener('click', refreshPasswordCaptcha);
}

refreshPasswordCaptcha();

if (passwordForm) {
    passwordForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const newPassword = document.getElementById('newPassword').value.trim();
        const confirmPassword = document.getElementById('confirmPassword').value.trim();
        const captchaValue = passwordCaptchaInput ? passwordCaptchaInput.value.trim().toUpperCase() : '';
        const captchaExpected = passwordCaptchaCode ? passwordCaptchaCode.textContent.trim().toUpperCase() : '';

        passwordMessage.classList.remove('ok');

        if (newPassword.length < 6) {
            passwordMessage.textContent = 'Mật khẩu mới cần tối thiểu 6 ký tự.';
            return;
        }

        if (newPassword !== confirmPassword) {
            passwordMessage.textContent = 'Mật khẩu xác nhận không khớp.';
            return;
        }

        if (captchaExpected && captchaValue !== captchaExpected) {
            passwordMessage.textContent = 'Mã xác nhận không đúng. Vui lòng kiểm tra lại.';
            refreshPasswordCaptcha();
            return;
        }

        passwordMessage.classList.add('ok');
        passwordMessage.textContent = 'Cập nhật mật khẩu thành công trong bản demo.';
        passwordForm.reset();
        refreshPasswordCaptcha();
    });
}

let countersAnimated = false;
function animateCounters() {
    if (countersAnimated) return;
    countersAnimated = true;

    countElements.forEach((element) => {
        const target = Number(element.dataset.value || 0);
        const isMoney = target >= 1000;
        const duration = 900;
        const start = performance.now();

        function tick(now) {
            const progress = Math.min((now - start) / duration, 1);
            const value = Math.floor(target * progress);
            element.textContent = isMoney ? `${value.toLocaleString('vi-VN')}đ` : value.toLocaleString('vi-VN');
            if (progress < 1) requestAnimationFrame(tick);
        }

        requestAnimationFrame(tick);
    });
}

// Initialize active tab from hash
const initialTab = window.location.hash.replace('#', '');
if (initialTab && document.getElementById(initialTab)) {
    setActiveTab(initialTab, false);
}

// Account-specific tilt cards are handled by script.js if loaded before this file.
