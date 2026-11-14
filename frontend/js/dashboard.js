document.addEventListener("DOMContentLoaded", () => {

    const API = "/api/applications";

    const token = sessionStorage.getItem("adminToken");
    const adminName = sessionStorage.getItem("adminUsername");

    if (!token) {
        window.location.href = "/";
        return;
    }

    document.getElementById("adminName").textContent =
        adminName || "Admin";


    const form = document.getElementById("applicationForm");
    const table = document.getElementById("applicationsTable");
    const message = document.getElementById("formMessage");
    const saveBtn = document.getElementById("saveBtn");

    let applications = [];
    let editingId = null;


    // Set today's date by default.
    const today = new Date();
    const localToday = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    document.getElementById("applicationDate").value = localToday;


    async function apiRequest(url, options = {}) {

        const response = await fetch(url, {
            ...options,
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
                ...(options.headers || {})
            }
        });

        const data = await response.json();

        if (response.status === 401) {
            sessionStorage.clear();
            window.location.href = "/";
            throw new Error("Session expired. Please login again.");
        }

        if (!response.ok || data.success === false) {
            throw new Error(data.message || "Request failed.");
        }

        return data;
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


    function formatDate(value) {
        if (!value) return "-";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) return "-";

        return date.toLocaleDateString("en-IN");
    }


    function showMessage(text, type = "success") {
        message.textContent = text;
        message.className = `message ${type}`;
    }


    async function loadApplications() {

        try {
            const data = await apiRequest(API);

            applications = data.applications || [];

            renderApplications();
            updateStats();

        } catch (error) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-row">
                        ${escapeHTML(error.message)}
                    </td>
                </tr>
            `;
        }
    }


    function updateStats() {

        document.getElementById("totalCount").textContent =
            applications.length;

        document.getElementById("completedCount").textContent =
            applications.filter(a => a.status === "Completed").length;

        document.getElementById("pendingCount").textContent =
            applications.filter(a => a.status !== "Completed").length;
    }


    function renderApplications() {

        const query = document.getElementById("searchInput")
            .value.trim().toLowerCase();

        const filtered = applications.filter(app => {

            return [
                app.tokenNumber,
                app.studentName,
                app.enrollmentNumber,
                app.mobile
            ].some(value =>
                String(value || "").toLowerCase().includes(query)
            );
        });


        if (!filtered.length) {
            table.innerHTML = `
                <tr>
                    <td colspan="8" class="empty-row">
                        No applications found.
                    </td>
                </tr>
            `;
            return;
        }


        table.innerHTML = filtered.map(app => {

            const completed = app.status === "Completed";

            return `
                <tr>

                    <td>
                        <strong>${escapeHTML(app.tokenNumber)}</strong>
                    </td>

                    <td>${escapeHTML(app.studentName)}</td>

                    <td>${escapeHTML(app.enrollmentNumber)}</td>

                    <td>
                        <span class="type-badge">
                            ${escapeHTML(app.applicationType)}
                        </span>
                    </td>

                    <td>${formatDate(app.applicationDate)}</td>

                    <td>₹${Number(app.amount || 0).toLocaleString("en-IN")}</td>

                    <td>
                        <span class="status-badge ${completed ? "completed" : "pending"}">
                            ${completed ? "Completed" : "Uncompleted"}
                        </span>
                    </td>

                    <td>
                        <div class="action-buttons">

                            <button class="action-btn print-btn"
                                data-action="print"
                                data-id="${app._id}">
                                Print
                            </button>

                            <button class="action-btn status-btn"
                                data-action="status"
                                data-id="${app._id}">
                                ${completed ? "Mark Uncompleted" : "Mark Completed"}
                            </button>

                            <button class="action-btn edit-btn"
                                data-action="edit"
                                data-id="${app._id}">
                                Edit
                            </button>

                            <button class="action-btn delete-btn"
                                data-action="delete"
                                data-id="${app._id}">
                                Delete
                            </button>

                        </div>
                    </td>

                </tr>
            `;

        }).join("");
    }


    // SAVE OR UPDATE APPLICATION
    form.addEventListener("submit", async event => {

        event.preventDefault();

        const payload = {
            applicationType: document.getElementById("applicationType").value,
            studentName: document.getElementById("studentName").value.trim(),
            fatherName: document.getElementById("fatherName").value.trim(),
            mobile: document.getElementById("mobile").value.trim(),
            enrollmentNumber: document.getElementById("enrollmentNumber").value.trim(),
            dateOfBirth: document.getElementById("dateOfBirth").value || null,
            course: document.getElementById("course").value.trim(),
            semester: document.getElementById("semester").value.trim(),
            year: document.getElementById("year").value.trim(),
            applicationDate: document.getElementById("applicationDate").value,
            amount: Number(document.getElementById("amount").value)
        };


        try {

            saveBtn.disabled = true;
            saveBtn.textContent = editingId
                ? "Updating..."
                : "Saving...";


            let result;

            if (editingId) {

                result = await apiRequest(`${API}/${editingId}`, {
                    method: "PUT",
                    body: JSON.stringify(payload)
                });

            } else {

                result = await apiRequest(API, {
                    method: "POST",
                    body: JSON.stringify(payload)
                });

            }


            showMessage(
                `${result.message} Token: ${result.application.tokenNumber}`,
                "success"
            );

            editingId = null;

            form.reset();
            document.getElementById("applicationDate").value = localToday;

            saveBtn.textContent = "Save Application";

            await loadApplications();

        } catch (error) {

            showMessage(error.message, "error");

        } finally {

            saveBtn.disabled = false;

            if (!editingId) {
                saveBtn.textContent = "Save Application";
            }
        }
    });


    // SEARCH
    document.getElementById("searchInput")
        .addEventListener("input", renderApplications);


    // LOGOUT
    document.getElementById("logoutBtn").addEventListener("click", () => {

        sessionStorage.clear();
        window.location.href = "/";

    });


    // TABLE ACTIONS
    table.addEventListener("click", async event => {

        const button = event.target.closest("button[data-action]");

        if (!button) return;

        const id = button.dataset.id;
        const action = button.dataset.action;

        const app = applications.find(item => item._id === id);

        if (!app) return;


        if (action === "print") {
            printApplication(app);
            return;
        }


        if (action === "status") {

            const newStatus = app.status === "Completed"
                ? "Uncompleted"
                : "Completed";

            try {

                await apiRequest(`${API}/${id}/status`, {
                    method: "PATCH",
                    body: JSON.stringify({ status: newStatus })
                });

                await loadApplications();

            } catch (error) {
                alert(error.message);
            }

            return;
        }


        if (action === "delete") {

            if (!confirm(`Delete application ${app.tokenNumber}?`)) {
                return;
            }

            try {

                await apiRequest(`${API}/${id}`, {
                    method: "DELETE"
                });

                await loadApplications();

            } catch (error) {
                alert(error.message);
            }

            return;
        }


        if (action === "edit") {

            editingId = id;

            document.getElementById("applicationType").value =
                app.applicationType || "";

            document.getElementById("studentName").value =
                app.studentName || "";

            document.getElementById("fatherName").value =
                app.fatherName || "";

            document.getElementById("mobile").value =
                app.mobile || "";

            document.getElementById("enrollmentNumber").value =
                app.enrollmentNumber || "";

            document.getElementById("dateOfBirth").value =
                app.dateOfBirth ? String(app.dateOfBirth).slice(0, 10) : "";

            document.getElementById("course").value =
                app.course || "";

            document.getElementById("semester").value =
                app.semester || "";

            document.getElementById("year").value =
                app.year || "";

            document.getElementById("applicationDate").value =
                app.applicationDate
                    ? String(app.applicationDate).slice(0, 10)
                    : localToday;

            document.getElementById("amount").value =
                app.amount ?? 0;

            saveBtn.textContent = "Update Application";

            window.scrollTo({ top: 0, behavior: "smooth" });

        }

    });


    // PRINT BOTH SLIPS SIDE BY SIDE
    function printApplication(app) {

        if (!app.qrCodeDataUrl) {
            alert(
                "QR code is not available for this application. " +
                "This may be an older record created before QR generation was added."
            );
            return;
        }


        const printWindow = window.open("", "_blank");

        if (!printWindow) {
            alert("Please allow pop-ups for this website to print slips.");
            return;
        }


        const logoURL = `${window.location.origin}/assets/logo.png`;

        const safe = escapeHTML;

        const statusText = app.status === "Completed"
            ? "Completed"
            : "Uncompleted";

        const yearText = app.year || app.semester || "-";

        const dateText = formatDate(app.applicationDate);

        const dobText = formatDate(app.dateOfBirth);

        const amountText =
            `₹ ${Number(app.amount || 0).toLocaleString("en-IN")} /-`;


        const printHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${safe(app.tokenNumber)} - FAIZ DIGITAL POINT</title>

<style>

* {
    box-sizing: border-box;
}

html, body {
    margin: 0;
    padding: 0;
    font-family: Arial, Helvetica, sans-serif;
    color: #071e46;
}

body {
    background: white;
}

.sheet {
    width: 297mm;
    height: 210mm;
    display: grid;
    grid-template-columns: 1fr 1fr;
    margin: 0 auto;
    overflow: hidden;
    position: relative;
}

.slip {
    height: 210mm;
    padding: 7mm 6mm 8mm;
    position: relative;
    overflow: hidden;
    background: white;
    border-bottom: 5mm solid #092b5c;
}

.student-slip {
    border-right: 1px dashed #172b49;
}

.header {
    height: 39mm;
    display: flex;
    align-items: center;
    gap: 4mm;
    border-bottom: 1mm solid #0b2b59;
    margin-bottom: 5mm;
}

.logo {
    width: 32%;
    height: 34mm;
    object-fit: contain;
}

.brand {
    flex: 1;
    text-align: center;
}

.brand h1 {
    font-size: 19pt;
    line-height: 1.1;
    margin: 0;
    font-weight: 900;
    white-space: nowrap;
}

.brand p {
    font-size: 11pt;
    font-weight: bold;
    font-style: italic;
    margin: 3mm 0 0;
}

.office-label {
    font-size: 17pt;
    font-weight: 900;
    background: #082958;
    color: white;
    padding: 5mm 3mm;
    border-radius: 5mm;
    text-align: center;
}

.section-title {
    background: #092d60;
    color: white;
    border-radius: 5mm;
    padding: 3mm 2mm;
    font-size: 17pt;
    text-align: center;
    font-weight: 900;
    margin: 0 0 4mm;
}

.token-box {
    background: #c6dcfb;
    border-radius: 4mm;
    padding: 3mm 2mm;
    text-align: center;
    color: black;
    font-size: 21pt;
    font-weight: bold;
    margin-bottom: 4mm;
}

.token-box strong {
    font-size: 28pt;
    letter-spacing: 1px;
}

.type-box {
    background: #092d60;
    color: white;
    border-radius: 15mm;
    padding: 3mm;
    margin: 0 auto 4mm;
    width: 84%;
    font-size: 17pt;
    font-weight: bold;
    text-align: center;
}

.qr-area {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 88mm;
    margin: 0 auto;
    position: relative;
}

.qr-area img {
    width: 77mm;
    height: 77mm;
    object-fit: contain;
}

.scan-text {
    text-align: center;
    background: #092d60;
    color: white;
    border-radius: 4mm;
    font-size: 13pt;
    font-weight: bold;
    padding: 3mm 2mm;
    margin: 2mm auto 5mm;
    width: 88%;
}

.student-footer {
    font-size: 12pt;
    font-weight: bold;
    font-style: italic;
    text-align: center;
    margin-top: 5mm;
}

.office-slip .header {
    padding-right: 1mm;
}

.office-slip .brand h1 {
    font-size: 17pt;
}

.office-slip .brand p {
    font-size: 10pt;
}

.office-slip .logo {
    width: 27%;
}

.office-slip .section-title {
    margin-top: 4mm;
}

.details {
    width: 100%;
    border-collapse: collapse;
    border: 0.6mm solid #092d60;
    border-radius: 4mm;
    overflow: hidden;
    color: #071e46;
    font-size: 13pt;
}

.details td {
    padding: 3.1mm 3mm;
    border: 0.3mm solid #9caec8;
}

.details td:first-child {
    width: 48%;
    font-weight: bold;
}

.details tr:nth-child(even) {
    background: #e7f0fc;
}

.office-note {
    background: #c6dcfb;
    padding: 5mm;
    margin-top: 5mm;
    text-align: center;
    font-size: 15pt;
    font-weight: bold;
    font-style: italic;
    border-radius: 4mm;
}

.bottom-wave {
    position: absolute;
    bottom: 0;
    left: 0;
    height: 4mm;
    width: 100%;
    background: #092d60;
}

@page {
    size: A4 landscape;
    margin: 0;
}

@media print {
    html, body {
        width: 297mm;
        height: 210mm;
        margin: 0;
        padding: 0;
    }

    .sheet {
        margin: 0;
        page-break-after: avoid;
        break-after: avoid;
    }
}

/* 112mm wide thermal roll: both copies remain side-by-side. */
@media print and (max-width: 120mm) {
    @page {
        size: 112mm 80mm;
        margin: 0;
    }

    html, body {
        width: 112mm;
        height: 80mm;
    }

    .sheet {
        width: 112mm;
        height: 80mm;
        grid-template-columns: 1fr 1fr;
    }

    .slip {
        height: 80mm;
        padding: 2mm;
        border-bottom-width: 1.5mm;
    }

    .header {
        height: 12mm;
        gap: 1mm;
        margin-bottom: 1.5mm;
    }

    .logo {
        height: 10mm;
        width: 27%;
    }

    .brand h1,
    .office-slip .brand h1 {
        font-size: 6pt;
    }

    .brand p,
    .office-slip .brand p {
        font-size: 4.5pt;
        margin-top: 1mm;
    }

    .office-label {
        font-size: 6pt;
        padding: 1mm;
        border-radius: 1mm;
    }

    .section-title {
        font-size: 6pt;
        padding: 1.5mm;
        margin-bottom: 1.5mm;
        border-radius: 1.5mm;
    }

    .token-box {
        font-size: 7pt;
        padding: 1.5mm;
        margin-bottom: 1.5mm;
        border-radius: 1.5mm;
    }

    .token-box strong {
        font-size: 9pt;
    }

    .type-box {
        font-size: 6pt;
        padding: 1.5mm;
        margin-bottom: 1mm;
    }

    .qr-area {
        height: 30mm;
    }

    .qr-area img {
        width: 27mm;
        height: 27mm;
    }

    .scan-text {
        font-size: 5pt;
        padding: 1mm;
        margin: 1mm auto;
    }

    .student-footer {
        font-size: 5pt;
        margin-top: 1mm;
    }

    .details {
        font-size: 5.1pt;
    }

    .details td {
        padding: 1.15mm 0.8mm;
    }

    .office-note {
        font-size: 5.5pt;
        padding: 1.5mm;
        margin-top: 1.5mm;
    }

    .office-slip .logo {
        width: 23%;
    }
}

</style>
</head>

<body>

<div class="sheet">

    <!-- STUDENT COPY -->

    <section class="slip student-slip">

        <header class="header">

            <img class="logo" src="${logoURL}" alt="FDP Logo">

            <div class="brand">
                <h1>FAIZ DIGITAL POINT</h1>
                <p>Your Digital Service Partner</p>
            </div>

        </header>


        <div class="section-title">
            STUDENT APPLICATION TOKEN
        </div>


        <div class="token-box">
            Token No. :
            <strong>${safe(app.tokenNumber)}</strong>
        </div>


        <div class="type-box">
            ${safe(app.applicationType.toUpperCase())} APPLICATION
        </div>


        <div class="qr-area">
            <img src="${app.qrCodeDataUrl}" alt="Student QR Code">
        </div>


        <div class="scan-text">
            Scan to Check Application Status
        </div>


        <div class="student-footer">
            Keep this slip safe for future reference.
        </div>

        <div class="bottom-wave"></div>

    </section>


    <!-- OFFICE COPY -->

    <section class="slip office-slip">

        <header class="header">

            <img class="logo" src="${logoURL}" alt="FDP Logo">

            <div class="brand">
                <h1>FAIZ DIGITAL POINT</h1>
                <p>Your Digital Service Partner</p>
            </div>

            <div class="office-label">
                OFFICE<br>COPY
            </div>

        </header>


        <div class="section-title">
            STUDENT APPLICATION RECORD
        </div>


        <div class="token-box">
            Token No. :
            <strong>${safe(app.tokenNumber)}</strong>
        </div>


        <table class="details">

            <tr>
                <td>Application Type :</td>
                <td>${safe(app.applicationType)}</td>
            </tr>

            <tr>
                <td>Name :</td>
                <td>${safe(app.studentName)}</td>
            </tr>

            <tr>
                <td>Registration No. :</td>
                <td>${safe(app.enrollmentNumber)}</td>
            </tr>

            <tr>
                <td>Father Name :</td>
                <td>${safe(app.fatherName || "-")}</td>
            </tr>

            <tr>
                <td>Date of Birth :</td>
                <td>${safe(dobText)}</td>
            </tr>

            <tr>
                <td>Course :</td>
                <td>${safe(app.course)}</td>
            </tr>

            <tr>
                <td>Mobile No. :</td>
                <td>${safe(app.mobile)}</td>
            </tr>

            <tr>
                <td>Year :</td>
                <td>${safe(yearText)}</td>
            </tr>

            <tr>
                <td>Amount :</td>
                <td>${safe(amountText)}</td>
            </tr>

            <tr>
                <td>Date :</td>
                <td>${safe(dateText)}</td>
            </tr>

        </table>


        <div class="office-note">
            ● &nbsp; For Office Records Only
        </div>

        <div class="bottom-wave"></div>

    </section>

</div>


<script>

window.addEventListener("load", function () {

    const images = Array.from(document.images);

    Promise.all(
        images.map(image => {

            if (image.complete && image.naturalWidth > 0) {
                return Promise.resolve();
            }

            return new Promise(resolve => {

                image.addEventListener("load", resolve, { once: true });
                image.addEventListener("error", resolve, { once: true });

            });

        })
    ).then(() => {

        window.focus();
        window.print();

    });

});

window.addEventListener("afterprint", function () {
    window.close();
});

</script>

</body>
</html>
`;


        printWindow.document.open();
        printWindow.document.write(printHTML);
        printWindow.document.close();

    }


    // Initial load
    loadApplications();

});