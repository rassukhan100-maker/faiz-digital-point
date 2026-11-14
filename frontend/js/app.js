document.addEventListener("DOMContentLoaded", () => {
    const passwordInput = document.getElementById("password");
    const togglePassword = document.getElementById("togglePassword");
    const loginForm = document.getElementById("loginForm");
    const loginMessage = document.getElementById("loginMessage");

    if (!passwordInput || !togglePassword || !loginForm || !loginMessage) {
        console.error("Login page elements are missing.");
        return;
    }

    // Show / Hide Password
    togglePassword.addEventListener("click", () => {
        const isPassword = passwordInput.type === "password";

        passwordInput.type = isPassword ? "text" : "password";
        togglePassword.textContent = isPassword ? "Hide" : "Show";
    });

    // Admin Login
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const username = document.getElementById("username").value.trim();
        const password = passwordInput.value;
        const submitButton = loginForm.querySelector('button[type="submit"]');

        if (!username || !password) {
            loginMessage.textContent = "Please enter username and password.";
            return;
        }

        submitButton.disabled = true;
        loginMessage.textContent = "Checking login details...";

        try {
            console.log("Sending login request...");

            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            console.log("Login API response:", data);

            if (!response.ok || !data.success) {
                loginMessage.textContent =
                    data.message || "Login failed.";
                return;
            }

            if (!data.token || !data.admin) {
                loginMessage.textContent =
                    "Invalid server response. Please contact administrator.";
                return;
            }

            sessionStorage.setItem("adminToken", data.token);
            sessionStorage.setItem("adminUsername", data.admin.username);

            loginMessage.textContent = "Login successful! Opening dashboard...";

            window.location.href = "/dashboard.html";

        } catch (error) {
            console.error("Login Error:", error);

            loginMessage.textContent =
                "Unable to connect to server. Check server and try again.";

        } finally {
            submitButton.disabled = false;
        }
    });
});