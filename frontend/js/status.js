document.addEventListener("DOMContentLoaded", async () => {

    const container = document.getElementById("statusContent");

    const params = new URLSearchParams(window.location.search);

    const token = params.get("token");

    if (!token) {

        container.innerHTML = `
            <div class="error-box">
                Invalid QR code. Token number is missing.
            </div>
        `;

        return;
    }


    try {

        const response = await fetch(
            `/api/applications/status/${encodeURIComponent(token)}`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || "Application not found.");
        }


        const completed = data.status === "Completed";

        const updatedDate = data.updatedAt
            ? new Date(data.updatedAt).toLocaleString("en-IN")
            : "-";


        container.innerHTML = `

            <div class="token-box">
                <span>Token Number</span>
                <strong>${escapeHTML(data.tokenNumber)}</strong>
            </div>

            <div class="type-box">
                Application Type:
                <strong>${escapeHTML(data.applicationType)}</strong>
            </div>

            <div class="status-result ${completed ? "completed" : "pending"}">

                <div class="status-icon">
                    ${completed ? "✓" : "!"}
                </div>

                <h3>
                    ${completed ? "APPLICATION COMPLETED" : "APPLICATION UNCOMPLETED"}
                </h3>

                <p>
                    ${
                        completed
                        ? "Your application has been marked as completed."
                        : "Your application is still being processed."
                    }
                </p>

            </div>

            <p class="updated-text">
                Last Updated: ${escapeHTML(updatedDate)}
            </p>

        `;

    } catch (error) {

        container.innerHTML = `
            <div class="error-box">
                ${escapeHTML(error.message)}
            </div>
        `;

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

});