const stories = [
  { before: "media/lotus-before.jpg?v=2", after: "media/lotus-after.jpg?v=2" },
  { before: "media/night-before.jpg?v=3", after: "media/night-after.jpg?v=3" },
  { before: "media/fortnite-before.jpg?v=2", after: "media/fortnite-after.jpg?v=2" },
  { before: "media/coast-before.jpg?v=2", after: "media/coast-after.jpg?v=2" }
];

const compare = document.querySelector("[data-compare]");
if (compare) {
  const base = compare.querySelector(".base");
  const grade = compare.querySelector(".grade");
  const split = compare.querySelector(".split");
  const rail = compare.querySelector(".rail i");
  const frame = compare.querySelector(".frame");
  let value = 56;

  function paint() {
    grade.style.clipPath = "inset(0 0 0 " + value + "%)";
    split.style.left = value + "%";
    split.setAttribute("aria-valuenow", String(Math.round(value)));
    rail.style.width = value + "%";
  }

  function setStory(index) {
    const story = stories[index];
    if (base.dataset.story === String(index)) return;
    base.dataset.story = String(index);
    frame.style.opacity = "0.35";
    setTimeout(() => {
      base.src = story.before;
      grade.src = story.after;
      base.alt = "Picture before the color look";
      grade.alt = "Picture after the color look";
      base.style.filter = "none";
      grade.style.filter = "none";
      frame.style.opacity = "1";
    }, 180);
    document.querySelectorAll("[data-pane]").forEach((pane) => {
      pane.classList.toggle("on", pane.dataset.pane === String(index));
    });
    document.querySelectorAll("[data-chapter]").forEach((button) => {
      button.classList.toggle("on", button.dataset.chapter === String(index));
    });
  }

  function fromPointer(clientX) {
    const rect = frame.getBoundingClientRect();
    value = Math.min(92, Math.max(8, ((clientX - rect.left) / rect.width) * 100));
    paint();
  }

  frame.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    window.getSelection()?.removeAllRanges();
    frame.setPointerCapture(event.pointerId);
    fromPointer(event.clientX);
  });
  frame.addEventListener("dragstart", (event) => event.preventDefault());
  frame.addEventListener("selectstart", (event) => event.preventDefault());
  frame.addEventListener("pointermove", (event) => {
    if (frame.hasPointerCapture(event.pointerId)) fromPointer(event.clientX);
  });
  split.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") value = Math.max(8, value - 4);
    if (event.key === "ArrowRight") value = Math.min(92, value + 4);
    paint();
  });

  const section = document.querySelector(".story");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  frame.style.transition = "opacity 0.35s ease";

  function onScroll() {
    if (window.innerWidth <= 980) return;
    const total = section.offsetHeight - window.innerHeight;
    const progress = Math.min(1, Math.max(0, -section.getBoundingClientRect().top / total));
    setStory(Math.min(stories.length - 1, Math.floor(progress * stories.length)));
  }

  document.querySelectorAll("[data-chapter]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.chapter);
      if (window.innerWidth <= 980) {
        setStory(index);
        return;
      }
      const total = section.offsetHeight - window.innerHeight;
      const top = section.getBoundingClientRect().top + window.scrollY + (total * (index + 0.15)) / stories.length;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
    });
  });

  setStory(0);
  base.dataset.story = "";
  setStory(0);
  paint();
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
}

(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const nativeMotion = window.CSS && CSS.supports && CSS.supports("view-transition-name", "none");
  if (reduced || nativeMotion) return;
  document.addEventListener("click", (event) => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a");
    if (!link || link.target || link.hasAttribute("download")) return;
    let url;
    try { url = new URL(link.href, location.href); } catch (error) { return; }
    if (url.origin !== location.origin) return;
    if (url.pathname === location.pathname && url.search === location.search) return;
    event.preventDefault();
    document.body.classList.add("page-leave");
    window.setTimeout(() => { location.href = link.href; }, 280);
  });
})();

const toggle = document.querySelector(".nav-toggle");
if (toggle) {
  toggle.addEventListener("click", () => {
    const nav = document.querySelector(".nav");
    const open = nav.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
}

(function () {
  const stage = document.querySelector("[data-tilt]");
  if (!stage) return;
  const card = stage.querySelector(".panel-tilt-card");
  if (!card) return;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = () => window.innerWidth <= 980;

  function reset() {
    card.style.transform = "rotateX(0deg) rotateY(0deg) translateZ(0)";
    card.style.setProperty("--shine-x", "50%");
    card.style.setProperty("--shine-y", "40%");
  }

  if (reduced) {
    reset();
    return;
  }

  stage.addEventListener("pointermove", (event) => {
    if (mobile()) {
      reset();
      return;
    }
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    const rotateY = (x - 0.5) * 20;
    const rotateX = (0.5 - y) * 16;
    card.style.transform =
      "rotateX(" + rotateX.toFixed(2) + "deg) rotateY(" + rotateY.toFixed(2) + "deg) translateZ(22px)";
    card.style.setProperty("--shine-x", (x * 100).toFixed(1) + "%");
    card.style.setProperty("--shine-y", (y * 100).toFixed(1) + "%");
  });
  stage.addEventListener("pointerleave", reset);
  window.addEventListener("resize", () => {
    if (mobile()) reset();
  });
})();

