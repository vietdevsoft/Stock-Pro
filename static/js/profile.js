async function getUserProfile() {
    const response = await fetch("/users/profile", {
        method: "GET",
        credentials: "same-origin"
    });

    return await response.json();
}


function formatDateTime(dateString) {
    if (!dateString) return "";

    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}


function getRoleName(roleId) {
    if (roleId === 1) return "Admin";
    if (roleId === 2) return "Thành viên";
    if (roleId === 3) return "Quản lý";
    return "";
}


function getStatusText(status) {
    if (status === "active") return "Đã xác thực";
    if (status === "inactive") return "Chưa kích hoạt";
    if (status === "blocked") return "Đã khóa";
    return status || "";
}


function getAvatarLetter(fullName) {
    const name = (fullName || "").trim();
    return name ? name.charAt(0).toUpperCase() : "U";
}


function setAvatarImage(element, imageUrl) {
    if (!element || !imageUrl) return;

    element.textContent = "";
    element.style.backgroundImage = `url("${imageUrl}")`;
    element.style.backgroundSize = "cover";
    element.style.backgroundPosition = "center";
}


function setFallbackAvatarLetter(element, fullName) {
    if (!element || element.style.backgroundImage) return;
    element.textContent = getAvatarLetter(fullName);
}


function getProfileAvatarElements() {
    return [
        document.getElementById("sidebarAvatar"),
        ...document.querySelectorAll(".user-avatar"),
        document.getElementById("largeAvatar")
    ].filter(Boolean);
}


function showToast(message, type = "success") {
    let container = document.getElementById("profileToastContainer");

    if (!container) {
        container = document.createElement("div");
        container.id = "profileToastContainer";
        container.className = "profile-toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `profile-toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(function () {
        toast.remove();
    }, 3000);
}


async function loadUserProfile() {
    try {
        const result = await getUserProfile();

        if (!result.success) {
            console.error(result.message);
            window.location.replace("/login");
            return;
        }

        const user = result.data;
        const avatars = getProfileAvatarElements();

        avatars.forEach(function (avatar) {
            if (user.avatar_url) {
                setAvatarImage(avatar, user.avatar_url);
                return;
            }

            setFallbackAvatarLetter(avatar, user.full_name);
        });

        const fields = {
            sidebarFullName: user.full_name || "",
            sidebarEmail: user.email || "",
            profileFullName: user.full_name || "",
            profilePhoneNumber: user.phone_number || "",
            profileEmail: user.email || "",
            profileCreatedAt: formatDateTime(user.created_at),
            profileStatus: getStatusText(user.status),
            profileRole: getRoleName(user.role_id)
        };

        Object.entries(fields).forEach(function ([id, value]) {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        const headerUserName = document.querySelector(".user-name");
        if (headerUserName) headerUserName.textContent = user.full_name || "";
    } catch (error) {
        console.error("Lỗi lấy thông tin user:", error);
        window.location.replace("/login");
    }
}


function moveCursorToEnd(element) {
    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    range.selectNodeContents(element);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
}


function setupAccountTabs() {
    const tabButtons = document.querySelectorAll(".tab-btn[data-tab]");
    const panels = document.querySelectorAll(".tab-panel");
    const sidebar = document.querySelector(".account-sidebar");
    const sidebarToggle = document.getElementById("sidebarToggle");

    function setActiveTab(tabId, updateHash = true) {
        tabButtons.forEach(function (button) {
            button.classList.toggle("active", button.dataset.tab === tabId);
        });

        panels.forEach(function (panel) {
            panel.classList.toggle("active", panel.id === tabId);
        });

        if (updateHash) history.replaceState(null, "", `#${tabId}`);
        if (window.innerWidth <= 1040 && sidebar) sidebar.classList.remove("open");
    }

    tabButtons.forEach(function (button) {
        button.addEventListener("click", function () {
            setActiveTab(button.dataset.tab);
        });
    });

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", function () {
            sidebar.classList.toggle("open");
        });
    }

    const initialTab = window.location.hash.replace("#", "");
    if (initialTab && document.getElementById(initialTab)) {
        setActiveTab(initialTab, false);
    }
}


function setupProfileActions() {
    const changeAvatarBtn = document.getElementById("changeAvatarBtn");
    const avatarInput = document.getElementById("avatarInput");
    const actionBtn = document.getElementById("editProfileBtn");
    const fullNameElement = document.getElementById("profileFullName");
    const phoneNumberElement = document.getElementById("profilePhoneNumber");
    const fieldWrappers = document.querySelectorAll("[data-editable-info]");

    if (!changeAvatarBtn || !avatarInput || !actionBtn || !fullNameElement || !phoneNumberElement || fieldWrappers.length === 0) {
        console.error("Không tìm thấy phần tử chỉnh sửa profile");
        return;
    }

    let mode = "view";
    let selectedAvatarFile = null;
    let avatarPreviewUrl = "";
    let originalInfo = {
        full_name: "",
        phone_number: ""
    };

    const editableFields = [fullNameElement, phoneNumberElement];
    const avatarElements = getProfileAvatarElements();

    function setMode(nextMode) {
        mode = nextMode;
        actionBtn.textContent = mode === "view" ? "Chỉnh sửa thông tin" : "Cập nhật thông tin";
    }

    function setInfoEditing(enabled) {
        fieldWrappers.forEach(function (wrapper) {
            wrapper.classList.toggle("is-editing", enabled);
            wrapper.setAttribute("aria-disabled", String(!enabled));
        });

        editableFields.forEach(function (field) {
            field.contentEditable = String(enabled);
            field.textContent = field.textContent.trim();
            if (!enabled) field.blur();
        });
    }

    function clearAvatarPreview() {
        if (!avatarPreviewUrl) return;
        URL.revokeObjectURL(avatarPreviewUrl);
        avatarPreviewUrl = "";
    }

    function rememberInfo() {
        originalInfo = {
            full_name: fullNameElement.textContent.trim(),
            phone_number: phoneNumberElement.textContent.trim()
        };
    }

    function restoreInfo() {
        fullNameElement.textContent = originalInfo.full_name;
        phoneNumberElement.textContent = originalInfo.phone_number;
    }

    fieldWrappers.forEach(function (wrapper) {
        wrapper.addEventListener("click", function () {
            if (mode !== "info") return;

            const field = wrapper.querySelector("[contenteditable]");
            if (!field) return;

            field.focus();
            moveCursorToEnd(field);
        });
    });

    editableFields.forEach(function (field) {
        field.addEventListener("keydown", function (event) {
            if (event.key !== "Enter") return;

            event.preventDefault();
            actionBtn.click();
        });

        field.addEventListener("paste", function (event) {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
        });
    });

    changeAvatarBtn.addEventListener("click", function () {
        avatarInput.value = "";
        avatarInput.click();
    });

    avatarInput.addEventListener("change", function () {
        const file = avatarInput.files[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            showToast("File được chọn không phải là ảnh.", "error");
            return;
        }

        if (mode === "info") restoreInfo();

        selectedAvatarFile = file;
        clearAvatarPreview();
        avatarPreviewUrl = URL.createObjectURL(file);

        avatarElements.forEach(function (avatar) {
            setAvatarImage(avatar, avatarPreviewUrl);
        });

        setInfoEditing(false);
        setMode("avatar");
    });

    async function saveInfo() {
        const payload = {
            full_name: fullNameElement.textContent.trim(),
            phone_number: phoneNumberElement.textContent.trim()
        };

        if (!payload.full_name || !payload.phone_number) {
            showToast("Họ tên và số điện thoại không được để trống.", "error");
            return;
        }

        actionBtn.disabled = true;

        try {
            const response = await fetch("/users/update-infomation", {
                method: "POST",
                credentials: "same-origin",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const result = await response.json();

            if (!result.success) {
                showToast(result.message || "Cập nhật thông tin thất bại.", "error");
                return;
            }

            setInfoEditing(false);
            setMode("view");
            rememberInfo();

            const sidebarFullName = document.getElementById("sidebarFullName");
            const headerUserName = document.querySelector(".user-name");
            if (sidebarFullName) sidebarFullName.textContent = payload.full_name;
            if (headerUserName) headerUserName.textContent = payload.full_name;

            avatarElements.forEach(function (avatar) {
                setFallbackAvatarLetter(avatar, payload.full_name);
            });

            showToast(result.message || "Cập nhật thông tin thành công.");
        } catch (error) {
            console.error("Lỗi cập nhật thông tin:", error);
            showToast("Cập nhật thông tin thất bại.", "error");
        } finally {
            actionBtn.disabled = false;
        }
    }

    async function saveAvatar() {
        if (!selectedAvatarFile) return;

        const formData = new FormData();
        formData.append("avatar", selectedAvatarFile);
        actionBtn.disabled = true;

        try {
            const response = await fetch("/users/avatar", {
                method: "POST",
                credentials: "same-origin",
                body: formData
            });
            const result = await response.json();

            if (!result.success) {
                showToast(result.message || "Cập nhật avatar thất bại.", "error");
                return;
            }

            if (result.data?.avatar_url) {
                avatarElements.forEach(function (avatar) {
                    setAvatarImage(avatar, result.data.avatar_url);
                });
            }

            selectedAvatarFile = null;
            clearAvatarPreview();
            setMode("view");
            showToast(result.message || "Cập nhật avatar thành công.");
        } catch (error) {
            console.error("Lỗi cập nhật avatar:", error);
            showToast("Cập nhật avatar thất bại.", "error");
        } finally {
            actionBtn.disabled = false;
        }
    }

    actionBtn.addEventListener("click", async function () {
        if (mode === "view") {
            rememberInfo();
            setInfoEditing(true);
            setMode("info");
            fullNameElement.focus();
            moveCursorToEnd(fullNameElement);
            return;
        }

        if (mode === "avatar") {
            await saveAvatar();
            return;
        }

        await saveInfo();
    });

    setInfoEditing(false);
    setMode("view");
}


async function logoutUser() {
    const logoutBtn = document.querySelector("[data-open-logout]");
    if (!logoutBtn) return;

    logoutBtn.addEventListener("click", async function () {
        const response = await fetch("/auths/logout", {
            method: "POST",
            credentials: "same-origin"
        });

        const result = await response.json();
        if (result.success) window.location.replace("/");
    });
}


document.addEventListener("DOMContentLoaded", async function () {
    await loadUserProfile();
    setupAccountTabs();
    setupProfileActions();
    await logoutUser();
});
