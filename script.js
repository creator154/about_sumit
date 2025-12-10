// loader + show main
window.addEventListener("load", () => {
  // progress visual already animates via CSS; keep a short delay for effect
  setTimeout(() => {
    const loader = document.querySelector(".loading");
    const main = document.querySelector(".main");
    if (loader) loader.style.opacity = "0";
    setTimeout(() => {
      if (loader) loader.style.display = "none";
      if (main) main.style.display = "block";
    }, 500);
  }, 2200);
});

// auto year in footer
document.addEventListener("DOMContentLoaded", () => {
  const y = new Date().getFullYear();
  const el = document.getElementById("year");
  if (el) el.textContent = y;
});
