async function loadTasks() {

    const response = await fetch("/task");
    const data = await response.json();
    if(!response.ok){
    alert("Task title is required");
    return;
}
    const tasksDiv = document.getElementById("tasks");

    tasksDiv.innerHTML = "";

    data.task.forEach(task => {

        tasksDiv.innerHTML += `
            <div>
                <h3>${task.title}</h3>
                <p>Status: ${task.status}</p>
                <p>Assigned: ${task.assigned_to}</p>

                <button onclick="deleteTask(${task.id})">
                    Delete
                </button>

                <hr>
            </div>
        `;
    });
}

document
.getElementById("taskForm")
.addEventListener("submit", async function(e){

    e.preventDefault();

    const title =
        document.getElementById("title").value;

    const assigned_to =
        document.getElementById("assigned_to").value;

    await fetch("/task", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            title,
            assigned_to
        })
    });

    loadTasks();

    this.reset();
});

async function deleteTask(id){

    await fetch(`/task/${id}`, {
        method: "DELETE"
    });

    loadTasks();
}

loadTasks();


const description =
    document.getElementById("description").value;