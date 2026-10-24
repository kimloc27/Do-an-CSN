
"use strict";

// ========================================
// 1. CẤU HÌNH VÀ DỮ LIỆU
// ========================================

const KEYS = {
    users: "edumeet_users",
    current: "edumeet_current_user",
    slots: "edumeet_slots",
    bookings: "edumeet_bookings"
};

function readData(key, fallback = []) {
    try {
        const value = localStorage.getItem(key);
        return value === null ? fallback : JSON.parse(value);
    } catch (error) {
        return fallback;
    }
}

function saveData(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function getUsers() {
    return readData(KEYS.users, []);
}

function getSlots() {
    return readData(KEYS.slots, []);
}

function getBookings() {
    return readData(KEYS.bookings, []);
}

function getCurrentUser() {
    return readData(KEYS.current, null);
}

function makeId() {
    return "id-" + Date.now().toString(36) +
        Math.random().toString(36).slice(2, 8);
}

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function todayString() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function formatDate(date) {
    if (!date) return "";

    const [year, month, day] = date.split("-");
    return `${day}/${month}/${year}`;
}

// Chuyển ngày và giờ thành thời điểm cụ thể.
// Dùng giờ địa phương của máy tính.
function getSlotStart(slot) {
    if (!slot || !slot.date || !slot.start) return NaN;

    const dateTime = new Date(`${slot.date}T${slot.start}:00`);
    return dateTime.getTime();
}

// Chỉ cho đăng ký khi giờ bắt đầu vẫn ở trong tương lai.
function isFutureSlot(slot) {
    const startTime = getSlotStart(slot);

    return Number.isFinite(startTime) &&
        startTime > Date.now();
}

function showMessage(id, message, success = false) {
    const element = document.getElementById(id);
    if (!element) return;

    element.textContent = message;
    element.classList.toggle("success", success);
}

function showToast(message) {
    const toast = document.getElementById("toast");

    if (!toast) {
        alert(message);
        return;
    }

    toast.textContent = message;
    toast.style.display = "block";

    clearTimeout(showToast.timer);

    showToast.timer = setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

// ========================================
// 2. KHỞI TẠO DỮ LIỆU MẪU
// ========================================

function initializeData() {
    let users = getUsers();

    // Tài khoản sinh viên dùng thử.
   if (!users.some(user =>
    user.email.toLowerCase() === "demo@gmail.com"
)) {
        users.push({
            id: "demo-student",
            name: "Sinh viên Demo",
            email: "demo@gmail.com",
            password: "123456",
            role: "student"
        });

        saveData(KEYS.users, users);
    }

    // Tạo tài khoản giảng viên mẫu để thử nghiệm.
    if (!users.some(user =>
        user.email.toLowerCase() === "giangvien@gmail.com"
    )) {
        users.push({
            id: "demo-lecturer",
            name: "Nguyễn Văn Minh",
            email: "giangvien@gmail.com",
            password: "123456",
            role: "lecturer"
        });

        saveData(KEYS.users, users);
    }

    // Chỉ tạo lịch mẫu khi chưa có dữ liệu lịch.
    if (localStorage.getItem(KEYS.slots) === null) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const dayAfter = new Date();
        dayAfter.setDate(dayAfter.getDate() + 2);

        function toDateString(date) {
            return [
                date.getFullYear(),
                String(date.getMonth() + 1).padStart(2, "0"),
                String(date.getDate()).padStart(2, "0")
            ].join("-");
        }

        saveData(KEYS.slots, [
            {
                id: makeId(),
                lecturerEmail: "giangvien@gmail.com",
                lecturerName: "Nguyễn Văn Minh",
                department: "Khoa Công nghệ thông tin",
                subject: "Lập trình Web",
                date: toDateString(tomorrow),
                start: "08:00",
                end: "09:00",
                place: "Phòng B204",
                mode: "Trực tiếp"
            },
            {
                id: makeId(),
                lecturerEmail: "giangvien@gmail.com",
                lecturerName: "Nguyễn Văn Minh",
                department: "Khoa Công nghệ thông tin",
                subject: "Cơ sở dữ liệu",
                date: toDateString(tomorrow),
                start: "09:30",
                end: "10:30",
                place: "Google Meet",
                mode: "Trực tuyến"
            },
            {
                id: makeId(),
                lecturerEmail: "giangvien@gmail.com",
                lecturerName: "Nguyễn Văn Minh",
                department: "Khoa Công nghệ thông tin",
                subject: "Cấu trúc dữ liệu",
                date: toDateString(dayAfter),
                start: "14:00",
                end: "15:00",
                place: "Phòng A103",
                mode: "Trực tiếp"
            }
        ]);
    }

    if (localStorage.getItem(KEYS.bookings) === null) {
        saveData(KEYS.bookings, []);
    }
}

// ========================================
// 3. ĐĂNG NHẬP VÀ ĐĂNG KÝ
// ========================================

function switchAuth(tab) {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (!loginForm || !registerForm) return;

    loginForm.classList.toggle("hidden", tab !== "login");
    registerForm.classList.toggle("hidden", tab !== "register");

    document.querySelectorAll(".auth-tab").forEach(button => {
        button.classList.toggle("active", button.dataset.auth === tab);
    });
}

function goToDashboard(user) {
    // Lưu phiên đăng nhập hiện tại.
    saveData(KEYS.current, {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
    });

    if (user.role === "lecturer") {
        window.location.href = "html/giang-vien.html";
    } else {
        window.location.href = "html/sinh-vien.html";
    }
}

function initAuthPage() {
    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");

    if (!loginForm || !registerForm) return;

    document.querySelectorAll(".auth-tab").forEach(button => {
        button.addEventListener("click", () => {
            switchAuth(button.dataset.auth);
        });
    });

    loginForm.addEventListener("submit", event => {
        event.preventDefault();

        const email = document.getElementById("login-email")
            .value.trim().toLowerCase();

        const password = document.getElementById("login-password").value;

        const user = getUsers().find(item =>
            item.email.toLowerCase() === email &&
            item.password === password
        );

        if (!user) {
            showMessage(
                "login-message",
                "Email hoặc mật khẩu không chính xác."
            );
            return;
        }

        goToDashboard(user);
    });

    registerForm.addEventListener("submit", event => {
        event.preventDefault();

        const name = document.getElementById("register-name")
            .value.trim();

        const role = document.getElementById("register-role").value;

        const email = document.getElementById("register-email")
            .value.trim().toLowerCase();

        const password = document.getElementById("register-password").value;

        if (!name || !role || !email || password.length < 6) {
            showMessage(
                "register-message",
                "Vui lòng nhập đầy đủ thông tin. Mật khẩu cần ít nhất 6 ký tự."
            );
            return;
        }

        const users = getUsers();

        if (users.some(item => item.email.toLowerCase() === email)) {
            showMessage("register-message", "Email này đã được đăng ký.");
            return;
        }

        const user = {
            id: makeId(),
            name,
            email,
            password,
            role
        };

       users.push(user);
saveData(KEYS.users, users);

// Đăng ký xong thì quay về giao diện đăng nhập.
registerForm.reset();

showMessage(
    "register-message",
    "Đăng ký thành công! Vui lòng đăng nhập bằng tài khoản vừa tạo.",
    true
);

// Chuyển sang tab đăng nhập.
switchAuth("login");

// Điền sẵn email vừa đăng ký để thuận tiện đăng nhập.
document.getElementById("login-email").value = email;
document.getElementById("login-password").value = "";
    });
}

// ========================================
// 4. KIỂM TRA TÀI KHOẢN VÀ ĐĂNG XUẤT
// ========================================

function requireRole(role) {
    const user = getCurrentUser();

    if (!user || user.role !== role) {
        localStorage.removeItem(KEYS.current);
        window.location.replace("../index.html");
        return null;
    }

    return user;
}

function logout() {
    localStorage.removeItem(KEYS.current);
    window.location.replace("../index.html");
}
// ========================================
// POPUP THÔNG BÁO ĐĂNG KÝ / HỦY LỊCH
// Tự động đóng sau 5 giây
// ========================================

let bookingPopupTimer = null;

function showBookingPopup(title, message, type = "success") {
    const popup = document.getElementById("booking-popup");
    const icon = document.getElementById("booking-popup-icon");
    const titleElement = document.getElementById("booking-popup-title");
    const messageElement = document.getElementById("booking-popup-message");

    // Nếu trang chưa có popup thì dùng thông báo dự phòng.
    if (!popup || !icon || !titleElement || !messageElement) {
        alert(title + "\n" + message);
        return;
    }

    // Hủy bộ đếm cũ nếu người dùng vừa thực hiện thao tác khác.
    clearTimeout(bookingPopupTimer);

    titleElement.textContent = title;
    messageElement.textContent = message;

    if (type === "success") {
        icon.textContent = "✓";
        icon.style.background = "#e4f8ec";
        icon.style.color = "#16834a";
    } else {
        icon.textContent = "!";
        icon.style.background = "#fff0e8";
        icon.style.color = "#d65b28";
    }

    // Hiện popup.
    popup.classList.remove("hidden");

    // Tự động đóng sau 5 giây.
    bookingPopupTimer = setTimeout(() => {
        popup.classList.add("hidden");
        bookingPopupTimer = null;
    }, 5000);
}

function initBookingPopup() {
    const popup = document.getElementById("booking-popup");
    const closeButton = document.getElementById("booking-popup-close");
    const okButton = document.getElementById("booking-popup-ok");

    function closePopup() {
        clearTimeout(bookingPopupTimer);
        bookingPopupTimer = null;

        if (popup) {
            popup.classList.add("hidden");
        }
    }

    // Đóng khi bấm nút X.
    closeButton?.addEventListener("click", closePopup);

    // Đóng khi bấm nút OK.
    okButton?.addEventListener("click", closePopup);

    // Đóng khi bấm ra ngoài hộp thông báo.
    popup?.addEventListener("click", function (event) {
        if (event.target === popup) {
            closePopup();
        }
    });
}
// ========================================
// 5. GIAO DIỆN SINH VIÊN
// ========================================

function initStudentPage() {
    const slotGrid = document.getElementById("slot-grid");
    if (!slotGrid) return;

    const user = requireRole("student");
    if (!user) return;

    document.getElementById("student-user-name").textContent = user.name;
    document.getElementById("student-welcome-name").textContent = user.name;

    document.getElementById("logout-btn").addEventListener("click", logout);

    document.getElementById("search-input")
        .addEventListener("input", renderStudentPage);

    document.getElementById("day-filter")
        .addEventListener("change", renderStudentPage);

    renderStudentPage();
}

function renderStudentPage() {
    const user = getCurrentUser();

    if (!user || user.role !== "student") return;

    const slots = getSlots();
    const bookings = getBookings();

    const search = document.getElementById("search-input")
        .value.trim().toLowerCase();

    const selectedDate = document.getElementById("day-filter").value;

    // Một lịch chỉ được một sinh viên đăng ký.
    const bookedSlotIds = new Set(
        bookings.map(booking => booking.slotId)
    );

    const availableSlots = slots.filter(slot =>
        !bookedSlotIds.has(slot.id) &&
        isFutureSlot(slot)
    );

    const myBookings = bookings.filter(booking =>
        booking.studentEmail === user.email
    );

    document.getElementById("available-count").textContent =
        availableSlots.length;

    document.getElementById("booked-count").textContent =
        myBookings.length;

    document.getElementById("lecturer-count").textContent =
        new Set(availableSlots.map(slot => slot.lecturerEmail)).size;

    const filteredSlots = availableSlots.filter(slot => {
        const searchableText = [
            slot.lecturerName,
            slot.department,
            slot.subject,
            slot.place,
            slot.mode
        ].join(" ").toLowerCase();

        return searchableText.includes(search) &&
            (!selectedDate || slot.date === selectedDate);
    });

    const slotGrid = document.getElementById("slot-grid");

    slotGrid.innerHTML = filteredSlots.map(slot => `
        <article class="slot-card">
            <span class="tag">${escapeHTML(slot.mode)}</span>
            <h3>${escapeHTML(slot.subject)}</h3>
            <p><b>Giảng viên:</b> ${escapeHTML(slot.lecturerName)}</p>
            <p><b>Khoa:</b> ${escapeHTML(slot.department)}</p>
            <p><b>Ngày:</b> ${formatDate(slot.date)}</p>
            <p><b>Thời gian:</b> ${escapeHTML(slot.start)} - ${escapeHTML(slot.end)}</p>
            <p><b>Địa điểm:</b> ${escapeHTML(slot.place)}</p>
            <button type="button" class="btn btn-primary"
                data-book="${escapeHTML(slot.id)}">
                Đăng ký lịch
            </button>
        </article>
    `).join("");

    document.getElementById("empty-slots")
        .classList.toggle("hidden", filteredSlots.length !== 0);

    slotGrid.querySelectorAll("[data-book]").forEach(button => {
        button.addEventListener("click", () => {
            bookSlot(button.dataset.book);
        });
    });

    const bookingContainer = document.getElementById("my-bookings");

    bookingContainer.innerHTML = myBookings.map(booking => {
        const slot = slots.find(item => item.id === booking.slotId);

        if (!slot) return "";

        return `
            <article class="booking-card">
                <span class="tag booked">Đã đăng ký</span>
                <h3>${escapeHTML(slot.subject)}</h3>
                <p><b>Giảng viên:</b> ${escapeHTML(slot.lecturerName)}</p>
                <p><b>Ngày:</b> ${formatDate(slot.date)}</p>
                <p><b>Thời gian:</b> ${escapeHTML(slot.start)} - ${escapeHTML(slot.end)}</p>
                <p><b>Địa điểm:</b> ${escapeHTML(slot.place)}</p>
                <button type="button" class="btn btn-outline"
                    data-cancel="${escapeHTML(slot.id)}">
                    Hủy lịch
                </button>
            </article>
        `;
    }).join("");

    document.getElementById("empty-bookings")
        .classList.toggle("hidden", myBookings.length !== 0);

    bookingContainer.querySelectorAll("[data-cancel]").forEach(button => {
        button.addEventListener("click", () => {
            cancelBooking(button.dataset.cancel);
        });
    });
}

// Hàm đăng ký lịch đã sửa.

function bookSlot(slotId) {
    const user = getCurrentUser();

    if (!user || user.role !== "student") {
        showToast("Vui lòng đăng nhập bằng tài khoản sinh viên.");
        return;
    }

    const profile = getStudentProfile(user.email);

    // Kiểm tra hồ sơ sinh viên
    if (
        !profile ||
        !profile.studentCode ||
        !profile.studentName ||
        !profile.studentClass ||
        !profile.studentMajor ||
        !profile.studentPhone
    ) {
        document.getElementById("profile-required-modal")
            ?.classList.remove("hidden");
        return;
    }

    const slot = getSlots().find(item => item.id === slotId);

    if (!slot) {
        showToast("Không tìm thấy lịch. Hãy tải lại trang.");
        return;
    }

    if (!isFutureSlot(slot)) {
        showToast("Lịch đã bắt đầu hoặc đã qua giờ.");
        renderStudentPage();
        return;
    }

    if (getBookings().some(item => item.slotId === slotId)) {
        showToast("Lịch này đã có người đăng ký.");
        renderStudentPage();
        return;
    }

    // Mở popup nhập nội dung tư vấn
    const modal = document.getElementById("consultation-modal");
    const contentInput = document.getElementById("consultation-content");
    const form = document.getElementById("consultation-form");

    if (!modal || !contentInput || !form) {
        showToast("Không tìm thấy popup nhập nội dung tư vấn.");
        return;
    }

    contentInput.value = "";
    modal.classList.remove("hidden");
    contentInput.focus();

    // Xác nhận nội dung và đăng ký lịch
    form.onsubmit = function (event) {
        event.preventDefault();

        const content = contentInput.value.trim();

        if (!content) {
            showToast("Vui lòng nhập nội dung cần tư vấn.");
            contentInput.focus();
            return;
        }

        const latestBookings = getBookings();

        if (latestBookings.some(item => item.slotId === slotId)) {
            modal.classList.add("hidden");
            showToast("Lịch này vừa được người khác đăng ký.");
            renderStudentPage();
            return;
        }

        latestBookings.push({
            id: makeId(),
            slotId: slotId,
            studentEmail: user.email.toLowerCase(),
            studentName: user.name,
            studentCode: profile.studentCode,
            studentClass: profile.studentClass,
            studentMajor: profile.studentMajor,
            studentPhone: profile.studentPhone,
            consultationContent: content
        });

        saveData(KEYS.bookings, latestBookings);

        modal.classList.add("hidden");

        showBookingPopup(
            "Đăng ký thành công!",
            "Bạn đã đăng ký lịch tư vấn với giảng viên thành công.",
            "success"
        );

        renderStudentPage();
    };
}

function initProfileRequiredModal() {
    const modal = document.getElementById("profile-required-modal");

    document.getElementById("profile-required-close")
        ?.addEventListener("click", () => {
            modal?.classList.add("hidden");
        });

    document.getElementById("profile-required-cancel")
        ?.addEventListener("click", () => {
            modal?.classList.add("hidden");
        });

    // Mở trang thông tin sinh viên.
    document.getElementById("profile-required-fill")
        ?.addEventListener("click", () => {
            modal?.classList.add("hidden");

            document.getElementById("open-student-profile-btn")
                ?.click();
        });

    modal?.addEventListener("click", event => {
        if (event.target === modal) {
            modal.classList.add("hidden");
        }
    });
}

function initConsultationModal() {
    const modal = document.getElementById("consultation-modal");
    const closeButton = document.getElementById("consultation-close");
    const cancelButton = document.getElementById("consultation-cancel");

    function closeModal() {
        modal?.classList.add("hidden");
    }

    closeButton?.addEventListener("click", closeModal);
    cancelButton?.addEventListener("click", closeModal);

    modal?.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });
}

function cancelBooking(slotId) {
    const user = getCurrentUser();

    if (!user || user.role !== "student") return;

    const slot = getSlots().find(item => item.id === slotId);

    if (!slot || !isFutureSlot(slot)) {
        showToast("Không thể hủy lịch đã bắt đầu hoặc đã qua.");
        return;
    }

    const bookings = getBookings();

    const updatedBookings = bookings.filter(booking =>
        !(booking.slotId === slotId &&
          booking.studentEmail === user.email)
    );

   saveData(KEYS.bookings, updatedBookings);

showBookingPopup(
    "Đã hủy lịch!",
    "Lịch tư vấn của bạn đã được hủy thành công.",
    "success"
);

renderStudentPage();
}

// ========================================
// 6. GIAO DIỆN GIẢNG VIÊN
// ========================================

function initLecturerPage() {
    const form = document.getElementById("add-slot-form");
    if (!form) return;

    const user = requireRole("lecturer");
    if (!user) return;

    document.getElementById("lecturer-user-name").textContent = user.name;
    document.getElementById("lecturer-welcome-name").textContent = user.name;

    const logoutButton =
    document.getElementById("logout-btn") ||
    document.getElementById("lecturer-logout-btn");

if (logoutButton) {
    logoutButton.addEventListener("click", logout);
}

    document.getElementById("slot-date").min = todayString();

    form.addEventListener("submit", addSlot);

    renderLecturerSlots();
}

function addSlot(event) {
    event.preventDefault();

    const user = getCurrentUser();

    if (!user || user.role !== "lecturer") {
        showMessage("add-slot-message", "Vui lòng đăng nhập bằng tài khoản giảng viên.");
        return;
    }

    const department = document.getElementById("lecturer-department")
        .value.trim();

    const subject = document.getElementById("slot-subject")
        .value.trim();

    const date = document.getElementById("slot-date").value;
    const start = document.getElementById("slot-start").value;
    const end = document.getElementById("slot-end").value;

    const place = document.getElementById("slot-place").value.trim();
    const mode = document.getElementById("slot-mode").value;

    if (!department || !subject || !date || !start || !end || !place) {
        showMessage("add-slot-message", "Vui lòng điền đầy đủ thông tin.");
        return;
    }

    if (date < todayString() || start >= end) {
        showMessage(
            "add-slot-message",
            "Ngày không hợp lệ hoặc giờ kết thúc phải sau giờ bắt đầu."
        );
        return;
    }

    const newStart = new Date(`${date}T${start}:00`).getTime();

    if (!Number.isFinite(newStart) || newStart <= Date.now()) {
        showMessage(
            "add-slot-message",
            "Giờ bắt đầu phải nằm trong tương lai."
        );
        return;
    }

    const slots = getSlots();

    const hasOverlap = slots.some(slot =>
        slot.lecturerEmail === user.email &&
        slot.date === date &&
        start < slot.end &&
        end > slot.start
    );

    if (hasOverlap) {
        showMessage(
            "add-slot-message",
            "Khung giờ này bị trùng với lịch bạn đã tạo."
        );
        return;
    }

    slots.push({
        id: makeId(),
        lecturerEmail: user.email,
        lecturerName: user.name,
        department,
        subject,
        date,
        start,
        end,
        place,
        mode
    });

    saveData(KEYS.slots, slots);

    document.getElementById("add-slot-form").reset();
    document.getElementById("slot-date").min = todayString();

    showMessage("add-slot-message", "Thêm lịch thành công!", true);
    renderLecturerSlots();
}

function renderLecturerSlots() {
    const user = getCurrentUser();

    if (!user || user.role !== "lecturer") return;

    const slots = getSlots()
        .filter(slot => slot.lecturerEmail === user.email)
        .sort((a, b) =>
            `${a.date}T${a.start}`.localeCompare(`${b.date}T${b.start}`)
        );

    const bookings = getBookings();
    const container = document.getElementById("lecturer-slot-list");

    container.innerHTML = slots.map(slot => {
        const booking = bookings.find(item => item.slotId === slot.id);

       const studentInfo = booking
    ? `<div class="student-booking">
        <b>Nội dung cần tư vấn:</b>
        <p>${escapeHTML(
            booking.consultationContent || "Chưa có nội dung"
        )}</p>

        <button type="button"
            class="btn btn-outline"
            data-toggle-student="${escapeHTML(booking.id)}">
            Xem thông tin sinh viên
        </button>

        <div id="student-info-${escapeHTML(booking.id)}" class="hidden">
            <hr>
            <b>Thông tin sinh viên</b>
            <p><b>Họ tên:</b> ${escapeHTML(booking.studentName)}</p>
            <p><b>Email:</b> ${escapeHTML(booking.studentEmail)}</p>
            <p><b>Mã sinh viên:</b> ${escapeHTML(booking.studentCode || "Chưa cập nhật")}</p>
            <p><b>Lớp:</b> ${escapeHTML(booking.studentClass || "Chưa cập nhật")}</p>
            <p><b>Ngành học:</b> ${escapeHTML(booking.studentMajor || "Chưa cập nhật")}</p>
            <p><b>Số điện thoại:</b> ${escapeHTML(booking.studentPhone || "Chưa cập nhật")}</p>
        </div>
       </div>`
    : "<p>Chưa có sinh viên đăng ký.</p>";
      const deleteButton = `
    <button type="button" class="btn btn-outline"
        data-delete="${escapeHTML(slot.id)}">
        Xóa lịch
    </button>
`;

        return `
            <article class="lecturer-slot-card">
                <span class="tag ${booking ? "booked" : ""}">
                    ${booking ? "Đã có người đăng ký" : "Còn trống"}
                </span>
                <h3>${escapeHTML(slot.subject)}</h3>
                <p><b>Khoa:</b> ${escapeHTML(slot.department)}</p>
                <p><b>Ngày:</b> ${formatDate(slot.date)}</p>
                <p><b>Thời gian:</b> ${escapeHTML(slot.start)} - ${escapeHTML(slot.end)}</p>
                <p><b>Địa điểm:</b> ${escapeHTML(slot.place)}</p>
                <p><b>Hình thức:</b> ${escapeHTML(slot.mode)}</p>
                ${studentInfo}
                ${deleteButton}
            </article>
        `;
    }).join("");

    document.getElementById("lecturer-empty")
        .classList.toggle("hidden", slots.length > 0);

    container.querySelectorAll("[data-delete]").forEach(button => {
        button.addEventListener("click", () => {
            deleteSlot(button.dataset.delete);
        });
    });
    container.querySelectorAll("[data-toggle-student]").forEach(button => {
    button.addEventListener("click", () => {
        const bookingId = button.dataset.toggleStudent;
        const info = document.getElementById(
            "student-info-" + bookingId
        );

        if (!info) return;

        const isHidden = info.classList.contains("hidden");

        info.classList.toggle("hidden");
        button.textContent = isHidden
            ? "Ẩn thông tin"
            : "Xem thông tin sinh viên";
    });
});
}

function deleteSlot(slotId) {
    const user = getCurrentUser();

    if (!user || user.role !== "lecturer") return;

    const slots = getSlots();

    const slot = slots.find(item =>
        item.id === slotId &&
        item.lecturerEmail === user.email
    );

    if (!slot) {
        showBookingPopup(
            "Xóa lịch không thành công!",
            "Không tìm thấy lịch cần xóa.",
            "error"
        );
        return;
    }

    if (getBookings().some(booking => booking.slotId === slotId)) {
        showBookingPopup(
            "Xóa lịch không thành công!",
            "Lịch này đã có sinh viên đăng ký nên không thể xóa.",
            "error"
        );
        return;
    }

    if (!confirm("Bạn có chắc muốn xóa lịch này không?")) return;

    saveData(
        KEYS.slots,
        slots.filter(item => item.id !== slotId)
    );

    showBookingPopup(
        "Xóa lịch thành công!",
        "Khung giờ tư vấn đã được xóa.",
        "success"
    );

    renderLecturerSlots();
}
// ========================================
// MENU AVATAR VÀ ĐỔI MẬT KHẨU
// ========================================

function initChangePasswordForm() {
    const menuButton = document.getElementById("profile-menu-btn");
    const dropdown = document.getElementById("profile-dropdown");
    const openButton = document.getElementById("open-password-btn");
    const closeButton = document.getElementById("close-password-btn");
    const modal = document.getElementById("password-modal");
    const form = document.getElementById("change-password-form");

    const user = getCurrentUser();
    // Hiển thị tên và email tài khoản đăng nhập
if (user) {
    const accountName = document.getElementById("account-login-name");
    const accountEmail = document.getElementById("account-login-email");

    if (accountName) {
        accountName.textContent = user.name;
    }

    if (accountEmail) {
        accountEmail.textContent = user.email;
    }
}

    // Hiển thị tên và avatar theo tài khoản.
    if (user) {
        const nameElement = document.getElementById(
            user.role === "lecturer"
                ? "lecturer-user-name"
                : "student-user-name"
        );

        if (nameElement) {
            nameElement.textContent = user.name;
        }

        const avatar = document.getElementById("profile-avatar");

        if (avatar) {
            avatar.src =
                "https://ui-avatars.com/api/?name=" +
                encodeURIComponent(user.name) +
                "&background=635bdf&color=fff&size=96";
            avatar.alt = "Avatar của " + user.name;
        }
    }
    // Tải ảnh đại diện từ máy tính
const avatarInput = document.getElementById("avatar-upload");
const avatarImage = document.getElementById("profile-avatar");
const studentInfoAvatar = document.getElementById("student-info-avatar");

if (user) {
    const nameElement = document.getElementById(
        user.role === "lecturer"
            ? "lecturer-user-name"
            : "student-user-name"
    );

    if (nameElement) {
        nameElement.textContent = user.name;
    }

    const key = "edumeet_avatar_" + user.email.toLowerCase();
    const savedAvatar = localStorage.getItem(key);

    const defaultAvatar =
        "https://ui-avatars.com/api/?name=" +
        encodeURIComponent(user.name) +
        "&background=0866b5&color=fff&size=96";

    const currentAvatar = savedAvatar || defaultAvatar;

    if (avatarImage) avatarImage.src = currentAvatar;

    // Hiển thị cùng ảnh ở trang thông tin sinh viên
    if (studentInfoAvatar) {
        studentInfoAvatar.src = currentAvatar;
    }
}

if (avatarInput && user) {
    avatarInput.addEventListener("change", function () {
        const file = avatarInput.files[0];

        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("Vui lòng chọn ảnh JPG, PNG hoặc WEBP.");
            avatarInput.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            alert("Ảnh không được vượt quá 2 MB.");
            avatarInput.value = "";
            return;
        }

        const reader = new FileReader();

        reader.onload = function () {
            try {
                const key = "edumeet_avatar_" + user.email.toLowerCase();

                localStorage.setItem(key, reader.result);

                if (avatarImage) avatarImage.src = reader.result;
                if (studentInfoAvatar) {
                    studentInfoAvatar.src = reader.result;
                }

                alert("Cập nhật ảnh đại diện thành công!");
            } catch (error) {
                alert("Không thể lưu ảnh. Bộ nhớ trình duyệt có thể đã đầy.");
            }

            avatarInput.value = "";
        };

        reader.readAsDataURL(file);
    });
}

   // Mở hoặc đóng menu avatar.
if (menuButton && dropdown) {
    menuButton.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        dropdown.classList.toggle("hidden");
    });

    dropdown.addEventListener("click", function (event) {
        event.stopPropagation();
    });

    document.addEventListener("click", function () {
        dropdown.classList.add("hidden");
    });
}

    // Mở cửa sổ đổi mật khẩu.
    if (openButton && modal) {
        openButton.addEventListener("click", function () {
            dropdown?.classList.add("hidden");
            modal.classList.remove("hidden");
            document.getElementById("change-password-message").textContent = "";
        });
    }

    // Đóng cửa sổ đổi mật khẩu.
    function closeModal() {
        if (!modal) return;

        modal.classList.add("hidden");
        form?.reset();

        const message = document.getElementById("change-password-message");
        if (message) message.textContent = "";
    }

    closeButton?.addEventListener("click", closeModal);

    modal?.addEventListener("click", function (event) {
        if (event.target === modal) {
            closeModal();
        }
    });

    // Xử lý đổi mật khẩu.
    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();

            const currentUser = getCurrentUser();

            if (!currentUser) {
                showMessage(
                    "change-password-message",
                    "Vui lòng đăng nhập lại."
                );
                return;
            }

            const currentPassword =
                document.getElementById("current-password").value;

            const newPassword =
                document.getElementById("new-password").value;

            const confirmPassword =
                document.getElementById("confirm-password").value;

            const users = getUsers();

            const userIndex = users.findIndex(item =>
                item.email.toLowerCase() ===
                currentUser.email.toLowerCase()
            );

            if (userIndex === -1 ||
                users[userIndex].password !== currentPassword) {
                showMessage(
                    "change-password-message",
                    "Mật khẩu hiện tại không chính xác."
                );
                return;
            }

            if (newPassword.length < 6) {
                showMessage(
                    "change-password-message",
                    "Mật khẩu mới phải có ít nhất 6 ký tự."
                );
                return;
            }

            if (newPassword !== confirmPassword) {
                showMessage(
                    "change-password-message",
                    "Mật khẩu xác nhận không khớp."
                );
                return;
            }

            if (newPassword === currentPassword) {
                showMessage(
                    "change-password-message",
                    "Mật khẩu mới phải khác mật khẩu hiện tại."
                );
                return;
            }

            users[userIndex].password = newPassword;
            saveData(KEYS.users, users);

            showMessage(
                "change-password-message",
                "Đổi mật khẩu thành công!",
                true
            );

            form.reset();

            setTimeout(closeModal, 1200);
        });
    }
}
// ========================================
// HỒ SƠ SINH VIÊN
// ========================================

function getStudentProfileKey(email) {
    return "edumeet_student_profile_" + email.toLowerCase();
}

function getStudentProfile(email) {
    return readData(getStudentProfileKey(email), null);
}


function initStudentProfilePage() {
    const openButton = document.getElementById("open-student-profile-btn");
    const profilePage = document.getElementById("student-profile-page");
    const backButton = document.getElementById("back-to-dashboard");
    const dropdown = document.getElementById("profile-dropdown");
    const form = document.getElementById("student-profile-form");

    if (!openButton || !profilePage || !backButton || !form) return;

    const user = getCurrentUser();
    if (!user || user.role !== "student") return;

    const fields = {
        studentCode: "profile-student-code",
        studentName: "profile-student-name",
        dob: "profile-student-dob",
        gender: "profile-student-gender",
        studentClass: "profile-student-class",
        studentMajor: "profile-student-major",
        studentPhone: "profile-student-phone",
        birthplace: "profile-student-birthplace",
        nationality: "profile-student-nationality",
        email: "profile-student-email",
        address: "profile-student-address"
    };

    const dashboardSections = [
        document.querySelector(".welcome-row"),
        document.querySelector(".stats-grid"),
        ...document.querySelectorAll(".section-block")
    ].filter(section => section && section !== profilePage);

    function fillProfile(profile = {}) {
        Object.entries(fields).forEach(([key, id]) => {
            const input = document.getElementById(id);
            if (input) {
                input.value = profile[key] ?? "";
            }
        });

        // Lấy thông tin mặc định từ tài khoản đăng nhập.
        if (!profile.studentName) {
            document.getElementById(fields.studentName).value = user.name;
        }

        if (!profile.email) {
            document.getElementById(fields.email).value = user.email;
        }

        if (!profile.nationality) {
            document.getElementById(fields.nationality).value = "Việt Nam";
        }
    }

    // Tải hồ sơ đã lưu.
    fillProfile(getStudentProfile(user.email) || {});

    // Mở hồ sơ.
    openButton.addEventListener("click", () => {
        fillProfile(getStudentProfile(user.email) || {});
        dashboardSections.forEach(section =>
            section.classList.add("hidden")
        );
        profilePage.classList.remove("hidden");
        dropdown?.classList.add("hidden");
        window.scrollTo(0, 0);
    });

    // Quay lại trang chính.
    backButton.addEventListener("click", () => {
        profilePage.classList.add("hidden");
        dashboardSections.forEach(section =>
            section.classList.remove("hidden")
        );
        window.scrollTo(0, 0);
    });

    // Lưu hồ sơ.
    form.addEventListener("submit", event => {
        event.preventDefault();

        const savedProfile = {
            studentEmail: user.email.toLowerCase()
        };

        Object.entries(fields).forEach(([key, id]) => {
            const input = document.getElementById(id);
            if (input) {
                savedProfile[key] = input.value.trim();
            }
        });

        if (
            !savedProfile.studentCode ||
            !savedProfile.studentClass ||
            !savedProfile.studentMajor ||
            !savedProfile.studentPhone ||
            !savedProfile.studentName
        ) {
            showMessage(
                "student-profile-message",
                "Vui lòng nhập đầy đủ các thông tin bắt buộc."
            );
            return;
        }

        saveData(getStudentProfileKey(user.email), savedProfile);

        showMessage(
            "student-profile-message",
            "Lưu thông tin sinh viên thành công!",
            true
        );
    });
}

// ========================================
// 7. KHỞI CHẠY
// ========================================

initializeData();
initAuthPage();
initStudentPage();
initLecturerPage();
initChangePasswordForm();
initBookingPopup();
initStudentProfilePage();
initProfileRequiredModal();
initConsultationModal();