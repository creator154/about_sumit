window.addEventListener("load", () => {
    setTimeout(() => {
        document.querySelector(".loading").style.opacity = "0";
        setTimeout(() => {
            document.querySelector(".loading").style.display = "none";
            document.querySelector(".main").style.display = "block";
        }, 500);
    }, 2500);
});
