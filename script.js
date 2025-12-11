window.onload = () => {
    const loader = document.getElementById("loader");
    const main = document.getElementById("main");

    setTimeout(() => {
        loader.style.opacity = "0";
        loader.style.transition = "0.5s";

        setTimeout(() => {
            loader.style.display = "none";
            main.style.display = "block";
        }, 500);

    }, 1000);  // Loader 1 sec
};
