/* RL Tuprio portfolio: theme toggle, mobile menu, active nav, scroll reveal, project galleries.
   No dependencies. */
(function () {
  "use strict";

  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------- Theme ---------- */
  var themeBtn = document.getElementById("theme");
  var themeTimer;

  function isDark() {
    var attr = root.getAttribute("data-theme");
    if (attr) return attr === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function syncThemeLabel() {
    if (themeBtn) {
      themeBtn.setAttribute("aria-label", isDark() ? "Switch to light mode" : "Switch to dark mode");
    }
  }

  if (themeBtn) {
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      if (!reduceMotion.matches) {
        /* Fade colours across the page for a moment instead of snapping */
        root.classList.add("theme-anim");
        clearTimeout(themeTimer);
        themeTimer = setTimeout(function () { root.classList.remove("theme-anim"); }, 400);
      }
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("theme", next); } catch (e) {}
      syncThemeLabel();
    });
    syncThemeLabel();
  }

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.getElementById("menu");
  var nav = document.getElementById("nav");

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    nav.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener("click", function () {
      setMenu(menuBtn.getAttribute("aria-expanded") !== "true");
    });
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && menuBtn.getAttribute("aria-expanded") === "true") {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia("(min-width: 760px)").addEventListener("change", function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Sticky header shadow + active section ---------- */
  var header = document.querySelector(".site-header");
  var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll("a[href^='#']")) : [];
  var sections = navLinks.map(function (a) {
    return document.getElementById(a.getAttribute("href").slice(1));
  });
  var activeIndex = -2;
  var ticking = false;

  function setActive(i) {
    if (i === activeIndex) return;
    activeIndex = i;
    navLinks.forEach(function (a, n) {
      if (n === i) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
  }

  function update() {
    ticking = false;
    if (header) header.classList.toggle("is-stuck", window.scrollY > 8);

    var line = (header ? header.offsetHeight : 64) + window.innerHeight * 0.3;
    var current = -1;
    sections.forEach(function (s, n) {
      if (s && s.getBoundingClientRect().top <= line) current = n;
    });
    /* Short last section: highlight it once the page bottom is reached */
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2) {
      current = sections.length - 1;
    }
    setActive(current);
  }

  function requestUpdate() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", requestUpdate, { passive: true });
  window.addEventListener("resize", requestUpdate);
  update();

  /* ---------- Scroll reveal ---------- */
  /* Elements get data-reveal only when motion is allowed and IntersectionObserver exists,
     so content is never hidden for no-JS or reduced-motion visitors. */
  var revealTargets = [
    "#about .portrait",
    "#about .about-copy",
    "#about .totals > div",
    ".section > h2",
    ".rows .row",
    ".project .shot",
    ".project .project-body",
    ".skill-cols h3",
    ".skills li",
    ".contact .lead",
    ".contact .mail",
    ".contact .actions"
  ].join(",");

  function startReveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll(revealTargets));
    var pending = els.length;
    if (!pending) return;

    var io = new IntersectionObserver(function (entries) {
      var shown = entries
        .filter(function (e) { return e.isIntersecting; })
        .sort(function (a, b) {
          return (a.target.compareDocumentPosition(b.target) & Node.DOCUMENT_POSITION_FOLLOWING) ? -1 : 1;
        });
      /* Items that arrive together are staggered by a small step */
      shown.forEach(function (entry, i) {
        entry.target.style.transitionDelay = Math.min(i, 6) * 80 + "ms";
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });

    els.forEach(function (el) {
      el.setAttribute("data-reveal", "");
      io.observe(el);
      /* Keyboard users tabbing into a not-yet-revealed block see it immediately */
      el.addEventListener("focusin", function () {
        el.style.transitionDelay = "0ms";
        el.classList.add("is-visible");
        io.unobserve(el);
      });
    });
  }

  if ("IntersectionObserver" in window && !reduceMotion.matches) startReveal();

  /* ---------- Project galleries ---------- */
  document.querySelectorAll(".shot[data-gallery]").forEach(function (shot) {
    var sources = shot.getAttribute("data-gallery").split("|").filter(Boolean);
    var label = shot.getAttribute("data-alt") || "Project screenshot";
    var main = shot.querySelector("img");
    if (!main || sources.length < 2) return;

    var strip = document.createElement("div");
    strip.className = "thumbs";
    strip.setAttribute("role", "group");
    strip.setAttribute("aria-label", label + "s");

    var swapId = 0;
    var currentSrc = sources[0];

    /* Fade out, load the next screenshot in the background, swap, fade back in */
    function show(src, alt) {
      if (src === currentSrc) return;
      currentSrc = src;

      if (reduceMotion.matches) {
        main.src = src;
        main.alt = alt;
        return;
      }

      var id = ++swapId;
      var faded = false;
      var loaded = false;

      function finish() {
        if (id !== swapId || !faded || !loaded) return;
        main.src = src;
        main.alt = alt;
        requestAnimationFrame(function () {
          requestAnimationFrame(function () { main.classList.remove("is-fading"); });
        });
      }

      main.classList.add("is-fading");
      setTimeout(function () { faded = true; finish(); }, 220);

      var pre = new Image();
      pre.onload = pre.onerror = function () { loaded = true; finish(); };
      pre.src = src;
    }

    sources.forEach(function (src, i) {
      var b = document.createElement("button");
      b.type = "button";
      b.setAttribute("aria-label", "Show screenshot " + (i + 1) + " of " + sources.length);
      b.setAttribute("aria-current", i === 0 ? "true" : "false");

      var t = document.createElement("img");
      t.src = src;
      t.alt = "";
      t.loading = "lazy";
      t.addEventListener("error", function () { b.remove(); });
      b.appendChild(t);

      b.addEventListener("click", function () {
        show(src, label + " " + (i + 1));
        strip.querySelectorAll("button").forEach(function (other) {
          other.setAttribute("aria-current", other === b ? "true" : "false");
        });
      });

      strip.appendChild(b);
    });

    shot.appendChild(strip);
  });

  /* ---------- Footer year ---------- */
  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();


function scrollToSection(event, sectionId) {
  event.preventDefault();

  const section = document.getElementById(sectionId);

  if (section) {
    section.scrollIntoView({
      behavior: "smooth",
      block: "start"
    });
  }
}
