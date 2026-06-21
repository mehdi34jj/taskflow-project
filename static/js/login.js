async function login() {

    const API = window.location.port === '5000' ? '' : 'http://127.0.0.1:5000';

    const username =
        document.getElementById("username").value;

    const password =
        document.getElementById("password").value;

    const response = await fetch(`${API}/login`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            username,
            password
        })
    });

    const data = await response.json();

    document.getElementById("result").innerText =
        data.message;

    if (data.success) {
        localStorage.setItem("username", username);
        sessionStorage.setItem("ca_user", JSON.stringify({
            name: username.charAt(0).toUpperCase() + username.slice(1),
            email: username + "@taskflow.com"
        }));
        window.location.href = "/dashboard";
    }
}
