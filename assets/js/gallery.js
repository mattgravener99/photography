(function () {
  const lightbox = document.getElementById("lightbox");
  const lightboxImg = document.getElementById("lightbox-img");
  const lightboxCaption = document.getElementById("lightbox-caption");
  const closeBtn = document.getElementById("lightbox-close");
  const prevBtn = document.getElementById("lightbox-prev");
  const nextBtn = document.getElementById("lightbox-next");
  const likeBtn = document.getElementById("like-button");
  const likeCount = document.getElementById("like-count");

  if (!lightbox || !lightboxImg || !closeBtn) return;

  const items = Array.from(document.querySelectorAll(".gallery-item"));
  let currentIndex = -1;

  function storageAvailable() {
    try {
      const testKey = "__storage_test__";
      window.localStorage.setItem(testKey, "1");
      window.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  const hasStorage = storageAvailable();

  function likeKey(file) {
    return `photosite_like_${file}`;
  }

  function countKey(file) {
    return `photosite_like_count_${file}`;
  }

  function getLikeState(file) {
    if (!hasStorage || !file) return { liked: false, count: 0 };
    const liked = window.localStorage.getItem(likeKey(file)) === "1";
    const countRaw = window.localStorage.getItem(countKey(file));
    const count = countRaw ? parseInt(countRaw, 10) || 0 : 0;
    return { liked, count };
  }

  function setLikeState(file, liked) {
    if (!hasStorage || !file) return { liked, count: 0 };
    const current = getLikeState(file);
    let nextCount = current.count;
    if (liked && !current.liked) nextCount += 1;
    if (!liked && current.liked) nextCount = Math.max(0, nextCount - 1);
    window.localStorage.setItem(likeKey(file), liked ? "1" : "0");
    window.localStorage.setItem(countKey(file), String(nextCount));
    return { liked, count: nextCount };
  }

  function renderLike(file) {
    if (!likeBtn || !likeCount) return;
    const state = getLikeState(file);
    likeBtn.classList.toggle("liked", state.liked);
    likeBtn.setAttribute("aria-pressed", String(state.liked));
    likeCount.textContent = String(state.count);
  }

  function openAt(index) {
    if (index < 0 || index >= items.length) return;
    currentIndex = index;
    const item = items[currentIndex];
    lightboxImg.src = item.getAttribute("href");
    lightboxCaption.textContent = item.dataset.caption || "";
    lightbox.hidden = false;

    if (prevBtn) prevBtn.disabled = currentIndex === 0;
    if (nextBtn) nextBtn.disabled = currentIndex === items.length - 1;

    renderLike(item.dataset.file);
  }

  function close() {
    lightbox.hidden = true;
    lightboxImg.src = "";
    currentIndex = -1;
  }

  function showPrev() {
    if (currentIndex > 0) openAt(currentIndex - 1);
  }

  function showNext() {
    if (currentIndex < items.length - 1) openAt(currentIndex + 1);
  }

  items.forEach((item, index) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      openAt(index);
    });
  });

  closeBtn.addEventListener("click", close);
  if (prevBtn) prevBtn.addEventListener("click", showPrev);
  if (nextBtn) nextBtn.addEventListener("click", showNext);

  if (likeBtn) {
    likeBtn.addEventListener("click", () => {
      if (currentIndex === -1) return;
      const file = items[currentIndex].dataset.file;
      const current = getLikeState(file);
      setLikeState(file, !current.liked);
      renderLike(file);
    });
  }

  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) close();
  });

  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") close();
    if (event.key === "ArrowLeft") showPrev();
    if (event.key === "ArrowRight") showNext();
  });
})();
