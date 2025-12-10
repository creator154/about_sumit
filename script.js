window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loader").style.opacity = "0";
        setTimeout(() => {
            document.getElementById("loader").style.display = "none";
            document.getElementById("main").style.display = "block";
        }, 400);
    }, 2000);
});
