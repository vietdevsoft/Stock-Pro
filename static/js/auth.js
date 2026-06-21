// ==============================
// Stock Pro Auth Animated Pages
// Giữ layout stockpro_auth_animated, bổ sung Forgot Password + tinh chỉnh font UI
// ==============================

function renderCaptcha(captchaElement) {
    if (!captchaElement) return;
    captchaElement.src = `/captcha?t=${Date.now()}`;
}

function getCaptchas() {
    const captchaCodes = document.querySelectorAll("[data-captcha-code]");

    captchaCodes.forEach((captchaCode) => {
        renderCaptcha(captchaCode);

        const captchaBox = captchaCode.closest(".captcha-box");
        const refreshButton = captchaBox?.querySelector("[data-captcha-refresh]");

        refreshButton?.addEventListener("click", () => {
            renderCaptcha(captchaCode);
        });
    });
    
}


function togglePassword() {
    const buttons = document.querySelectorAll("[data-password-toggle]");

    buttons.forEach((button) => {
        button.addEventListener("click", function () {
            const input = button.closest(".password-field")?.querySelector("input");

            if (!input) return;

            const isPassword = input.type === "password";

            input.type = isPassword ? "text" : "password";
            button.textContent = isPassword ? "Ẩn" : "Hiện";
            button.setAttribute(
                "aria-label",
                isPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"
            );
        });
    });
}

async function loginUser(email, password, captcha) {
    const data = {
        email: email,
        password: password,
        captcha: captcha
    };

    const response = await fetch("/auths/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(data)
    });

    const result = await response.json();

    return result;
}

async function registerUser(full_name, phone_number, email, password, captcha) {
    const data = {
        full_name: full_name,
        phone_number: phone_number,
        email: email,
        password: password,
        captcha: captcha
    };

    const response = await fetch("/auths/register", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(data)
    });

    const result = await response.json();

    console.log("Status:", response.status);
    console.log("Result:", result);

    if (!response.ok) {
        throw new Error(result.detail || "Đăng ký thất bại");
    }

    return result;
}

async function forgotUser(email, captcha) {
    const data = {
        email: email,
        captcha: captcha
    };

    const response = await fetch("/auths/forgot-password", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        credentials: "same-origin",
        body: JSON.stringify(data)
    });

    const result = await response.json();

    console.log("Status:", response.status);
    console.log("Result:", result);

    if (!response.ok) {
        throw new Error(result.detail || "Gửi mail thất bại");
    }

    return result;
}

async function sendRequestsLogin() {
    const loginForm = document.querySelector('[data-auth-form="login"]');

    if (!loginForm) return;

    loginForm.addEventListener("submit", async function (even) {
        even.preventDefault();

        const email = document.getElementById("loginEmail").value.trim();
        const password = document.getElementById("loginPassword").value.trim();
        const captcha = document.getElementById("loginCaptcha").value.trim().toLowerCase();

        try {
            const data = await loginUser(email, password, captcha);
            console.log("Login response:", data);
            const message = data['message'];

            if (message === "Captcha không chính xác.") {
                showMessage(loginForm, "Captcha không chính xác.", "error");
                getCaptchas();

            } else if (message === "Email hoặc mật khẩu không chính xác.") {
                showMessage(loginForm, "Email hoặc mật khẩu không chính xác.", "error");
                getCaptchas();

            } else if (message === "Đăng nhập thành công.") {
                showMessage(loginForm, "Đăng nhập thành công.", "success");
                setTimeout(() => {window.location.replace("/");}, 500);


            } else {
                showMessage(loginForm, "Phản hồi đăng nhập không hợp lệ.", "error");
                getCaptchas();
            }

        } catch (error) {
            showMessage(loginForm, "Không thể kết nối tới server.", "error");
            getCaptchas();
        }
    });

    
}

async function sendRequestsRegister() {
    const registerForm = document.querySelector('[data-auth-form="register"]');

    if (!registerForm) return;

    registerForm.addEventListener("submit", async function (even) {
        even.preventDefault();

        clearFieldErrors(registerForm);

        const full_name = document.getElementById("fullName").value.trim();
        const phone_number = document.getElementById("phone").value.trim();
        const email = document.getElementById("registerEmail").value.trim();
        const password = document.getElementById("registerPassword").value.trim();
        const confirmPassword = document.getElementById("confirmPassword").value.trim();
        const captcha = document.getElementById("registerCaptcha").value.trim().toLowerCase();

        if (!/^0\d{9}$/.test(phone_number)) return setFieldError("phone", "Số điện thoại không hợp lệ.");
        if (password.length < 8) return setFieldError("registerPassword", "Mật khẩu tối thiểu 8 ký tự.");
        if (password !== confirmPassword) return setFieldError("confirmPassword", "Mật khẩu xác nhận không khớp.");

        try {
            const data = await registerUser(full_name, phone_number, email, password, captcha);
            const message = data["message"];

            if (message === "Captcha không chính xác.") {
                setFieldError("registerCaptcha", "Captcha không chính xác.");
                getCaptchas();

            } else if (message === "Số điện thoại đã được sử dụng.") {
                setFieldError("phone", "Số điện thoại đã được sử dụng.");
                getCaptchas();

            } else if (message === "Email đã được sử dụng.") {
                setFieldError("registerEmail", "Email đã được sử dụng.");
                getCaptchas();

            } else if (message === "Tạo tài khoản thất bại.") {
                showMessage(registerForm, "Tạo tài khoản thất bại.", "error");
                getCaptchas();

            } else if (message === "Đăng ký tài khoản thành công.") {
                showMessage(registerForm, "Đăng ký tài khoản thành công.", "success");
                registerForm.reset();
                getCaptchas();

            } else {
                showMessage(registerForm, "Phản hồi đăng ký không hợp lệ.", "error");
                getCaptchas();
            }

        } catch (error) {
            showMessage(registerForm, "Không thể kết nối tới server.", "error");
            getCaptchas();
        }
    });
}

async function sendRequestsForgot() {
    const forgotForm = document.querySelector('[data-auth-form="forgot"]');
    if (!forgotForm) return;
    
    forgotForm.addEventListener("submit", async function (even) {
        even.preventDefault();

        const email = document.getElementById("forgotEmail").value.trim();
        const captcha = document.getElementById("forgotCaptcha").value.trim().toLowerCase();

        try {
            const result = await forgotUser(email, captcha);
            const message = result["message"];
            if (message === "Captcha không chính xác.") {
                showMessage(forgotForm, "Captcha không chính xác.", "error");
                getCaptchas();
            } else if (message == "Không kiểm tra được email.") {
                showMessage(forgotForm, "Không kiểm tra được email.", "error");;
                getCaptchas();
            } else if (message == "Email không tồn tại.") {
                showMessage(forgotForm, "Email không tồn tại.", "error");;
                getCaptchas();
            } else if (message == "Đã cấp lại mật khẩu.") {
                showMessage(forgotForm, "Đã cấp lại mật khẩu.", "success");;
                getCaptchas();
            } else {
                showMessage(forgotForm, "Đã xảy ra lỗi", "error");;
                getCaptchas();
            }
        } catch (error) {
            showMessage(forgotForm, "Không thể kết nối tới server.", "error");
            getCaptchas();
        }
    });
}

function showMessage(form, message, type = "error") {
    const messageElement = form.querySelector("[data-form-message]");
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `form-message ${type}`;
}

function resetFormMessage(form) {
    const messageElement = form.querySelector("[data-form-message]");
    if (!messageElement) return;

    messageElement.textContent = "";
    messageElement.className = "form-message";
}

function setFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const errorBox = document.querySelector(`[data-error-for="${inputId}"]`);

    if (input) input.classList.add("is-invalid");
    if (errorBox) errorBox.textContent = message;
}

function clearFieldErrors(form) {
    form.querySelectorAll(".field-message").forEach(item => item.textContent = "");
    form.querySelectorAll(".form-control").forEach(input => input.classList.remove("is-invalid", "is-valid"));
}

function getModeFromPath() {
    const path = window.location.pathname.toLowerCase();
    if (path.includes("register")) return "register";
    if (path.includes("forgot")) return "forgot";
    return "login";
}

function setupAuthSwitcher() {
    const stage = document.querySelector("#authStage");
    if (!stage) return;

    const switchButtons = document.querySelectorAll("[data-auth-switch]");
    const allowedModes = ["login", "register", "forgot"];
    const initialMode = allowedModes.includes(document.body.dataset.initialAuth)
        ? document.body.dataset.initialAuth
        : getModeFromPath();

    const setMode = (mode, shouldUpdateUrl = true) => {
        const safeMode = allowedModes.includes(mode) ? mode : "login";
        const isRegister = safeMode === "register";
        const isForgot = safeMode === "forgot";

        stage.classList.toggle("register-mode", isRegister);
        stage.classList.toggle("forgot-mode", isForgot);

        document.querySelectorAll(".nav-login").forEach((link) => link.classList.toggle("active", safeMode === "login"));
        document.querySelectorAll(".nav-register").forEach((link) => link.classList.toggle("active", safeMode === "register"));

        document.querySelectorAll("[data-auth-form]").forEach(resetFormMessage);

        if (shouldUpdateUrl) {
            const nextUrl = safeMode === "register" ? "/register" : safeMode === "forgot" ? "/forgot-password" : "/login";
            window.history.pushState({ authMode: safeMode }, "", nextUrl);
        }
    };

    setMode(initialMode, false);

    switchButtons.forEach((button) => {
        button.addEventListener("click", () => {
            const mode = button.dataset.authSwitch;
            setMode(mode, true);
        });
    });

    window.addEventListener("popstate", () => setMode(getModeFromPath(), false));
}

document.addEventListener("DOMContentLoaded", () => {
    getCaptchas();
    togglePassword();
    sendRequestsLogin();
    sendRequestsRegister();
    sendRequestsForgot();
    setupAuthSwitcher();
});
