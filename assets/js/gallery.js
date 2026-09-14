(function () {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");

  if (!lightbox || !lightboxImg || !closeBtn) return;

  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      lightboxImg.src = item.getAttribute("href");
      lightboxCaption.textContent = item.dataset.caption || "";
      lightbox.hidden = false;
    });
  });

  function close() {
    lightbox.hidden = true;
    lightboxImg.src = "";
  }

  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") close();
  });
})();
