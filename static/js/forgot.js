document
.getElementById("forgotForm")
.addEventListener("submit", async function(e){

    e.preventDefault();

    const username =
        document.getElementById("username").value;

    const new_password =
        document.getElementById("new_password").value;

    const response = await fetch(
        "/forgot-password",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username,
                new_password
            })
        }
    );

    const data = await response.json();

    alert(data.message || data.error);
}); 