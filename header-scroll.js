/* ============================================================================
   Valad — header scroll state
   ----------------------------------------------------------------------------
   Every page opens with a hero the fixed bar sits on top of, and the bar has no
   plate while it is over that hero: it takes its background, blur and hairline
   only once the page has moved past it.

   This file owns one thing — the `r-header--solid` class that marks which of
   those two states the bar is in. Two things read it:

     · Portfolio, News, About and Contact, which have no header script of their
       own and get their whole plate from the class (see valad-system.css).
     · `r-header--hero-dark`, which inverts the wordmark, links and pill on a
       page whose hero is a dark photograph and has to stop doing so the moment
       the bar takes its plate.

   It runs on the homepage and Careers too, even though their own DCLogic
   components already paint the plate inline. The two do not fight: an inline
   declaration beats the class rule, so on those pages the class is read only
   as the state flag the second bullet needs. Without it, `:not(.r-header--solid)`
   would be permanently true there and the inversion would never switch off.

   The state is a class rather than an inline style because the DC runtime
   rewrites inline style attributes on re-render but preserves classes.
   ========================================================================== */
(function () {
  var header = document.querySelector(".r-header");
  if (!header) return;

  /* Most pages trip at a fixed offset — the same 60px the homepage and Careers
     components use, so a visitor moving between pages sees the bar solidify at
     the same moment.

     A page whose opening is taller than one screen can name the element the bar
     should hold out for instead, with `data-header-trip`. About does: its values
     scroller is several screens of full-bleed photography and reads as one
     continuous opening, so the bar stays clear of it until "How we think
     differently" arrives rather than plating over the imagery after 60px. */
  var TRIP = 60;
  var tripEl = document.querySelector("[data-header-trip]");
  var solid = null;

  function frame() {
    var next;
    if (tripEl) {
      next = tripEl.getBoundingClientRect().top <= header.offsetHeight;
    } else {
      next = (window.pageYOffset || document.documentElement.scrollTop || 0) > TRIP;
    }
    if (next === solid) return;
    solid = next;
    header.classList.toggle("r-header--solid", next);
  }

  window.addEventListener("scroll", frame, { passive: true });
  window.addEventListener("resize", frame);
  frame();
})();

/* ============================================================================
   Mobile nav open state
   ----------------------------------------------------------------------------
   The overlay was originally a pure CSS checkbox hack — `.r-navtoggle:checked
   ~ .r-nav` — specifically so the open/close state would survive a re-render
   with no script involved at all. That held while the checkbox itself was
   never touched by anything the runtime diffs. It stopped holding once the
   overlay's own content grew a real, sizeable subtree under it (the mobile
   sub-nav, below): the checkbox is a sibling of that subtree, and growing it
   is apparently enough to make the runtime's post-mount pass replace the
   checkbox along with it rather than patch around it. A replaced checkbox
   starts from the authored markup, which carries no `checked` attribute — so
   a visitor who has just opened the menu can find it silently closed under
   them a few hundred milliseconds later, mid-read.

   The fix moves the state itself off the checkbox and onto `data-nav-open` on
   `<html>` — the one node in the page no runtime re-render ever replaces,
   because replacing it would mean replacing the document. The checkbox is
   still there and still drives `:checked`-based CSS as a fallback (every rule
   below is `:is(.r-navtoggle:checked ~ X, html[data-nav-open] X)`, not a
   replacement of the old selector), so a page that never runs this script —
   blocked, or JS off — still opens and closes exactly as before. Where this
   script does run, `<html>`'s attribute is what actually holds.

   Purely a mirror, not a second trigger: an earlier version of this also
   intercepted the label's own click to call `setOpen()` directly, on the
   assumption that `preventDefault()` there would suppress the native
   label-activates-its-control behaviour and leave one path to the state
   change. It does not, reliably — label activation is a separate step from
   the click's default action in at least one engine this runs on, so the
   native toggle fired anyway. That put two writers on the same click: the
   native toggle flipped the checkbox and fired `change` first, this mirrored
   that onto `<html>`, and then the click handler's own `setOpen(!isOpen())`
   read the value *that same handler had just caused* and flipped it straight
   back — open and closed inside one tap, net effect nothing. Listening only
   to `change` means there is exactly one thing that ever decides the state:
   whatever the checkbox's native activation already resolved to. */
(function () {
  document.addEventListener("change", function (e) {
    if (e.target.classList && e.target.classList.contains("r-navtoggle")) {
      document.documentElement.toggleAttribute("data-nav-open", e.target.checked);
      /* Closing the overlay resets it to the top level, so reopening never
         lands mid-drill inside whichever sub-panel was last looked at —
         `data-nav-sub` is set by the mobile nav module further down and is
         cleared here rather than there because this is the one place that
         sees the overlay close. */
      if (!e.target.checked) document.documentElement.removeAttribute("data-nav-sub");
    }
  });
})();

/* ============================================================================
   Closing CTA band — scroll-linked zoom and drift
   ----------------------------------------------------------------------------
   valad.io's four renders are not placed at a fixed size. Reading the same four
   boxes at successive scroll positions returns scale 3.0, then 1.85, then 1.0:
   they start blown up and settle as the band travels up the viewport, which is
   what stops the plate reading as four photographs pasted onto paper.

   Progress is measured on the band's own travel — 0 when its top edge is at the
   bottom of the viewport, 1 once it has risen to the top — so the settle is tied
   to the band rather than to absolute page position, and every page's band
   behaves the same regardless of how much sits above it.

   Both of valad.io's channels are reproduced now. An earlier pass wrote only the
   zoom, on the grounds that the per-box drift had been read from two samples and
   the curve would have to be guessed. It does not: the drift is not a curve of
   its own. Sampling a page held before the band, all four boxes report offsets
   that are exact multiples of the same value the scale carries —

     scale(3)  with  A translateY(-200px), B translateX(-60px) translateY(-30px),
                     C translateX(40px) translateY(60px), D translateY(71px)

   — which is (1 + v) and (multiplier x v) at v = 2. So there is one driver, not
   two, and the multipliers are a fixed per-box constant. Those constants live in
   valad-system.css next to the geometry they belong to; this writes v.

   v runs from 2 on approach to 0 at rest, eased so most of the settle happens
   early. Writes one custom property on the band and lets CSS compose both
   channels, so the work per frame is a single style write on one element, and a
   band that never gets the property renders at rest. */
(function () {
  var bands = [].slice.call(document.querySelectorAll(".r-cta-band"));
  if (!bands.length) return;

  /* Held at rest for anyone who has asked for less motion — the renders are
     part of the composition, the zoom is not. */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  /* Below 810 the renders are held still. That is pinned in responsive.css
     rather than branched on here — `.r-cta-band { --cta-v: 0 !important }` in
     the mobile block outranks what this writes inline, so the breakpoint owns
     the decision and nothing stale survives a resize. This keeps computing
     either way; it is one rect read and one property write on one element. */

  var FROM = 2;      /* v as the band enters — scale 3, full drift */
  var TO = 0;        /* v once it has settled — scale 1, no drift  */
  var ticking = false;

  /* The DC runtime tears down and re-renders the tree after its first paint,
     re-keying elements rather than mutating them in place (documented in the
     wipe module above) — a `bands` reference captured before that settles
     points at a detached node forever after, and every future frame writes
     `--cta-v` to an element nothing reads from. The band never animates, but
     nothing throws, so it fails silent. Cheap enough to check every frame: one
     `isConnected` read per band, and a full re-query only on the rare frame
     where that has gone stale. */
  function ensureBands() {
    for (var i = 0; i < bands.length; i++) {
      if (!bands[i].isConnected) {
        bands = [].slice.call(document.querySelectorAll(".r-cta-band"));
        return;
      }
    }
  }

  function paint() {
    ticking = false;
    ensureBands();
    var vh = window.innerHeight || document.documentElement.clientHeight;
    /* A zero-height viewport is reachable — a collapsed or backgrounded panel
       reports one, and so does a document measured before layout. Dividing by
       it yields NaN, `scale(NaN)` is an invalid transform, and the figures drop
       out of the composition entirely rather than degrading. Leaving the
       property unset instead lets the CSS fall back to the resting scale. */
    if (!vh) return;
    for (var i = 0; i < bands.length; i++) {
      var b = bands[i];
      var r = b.getBoundingClientRect();
      /* Only a band that has left upward is skipped. A band still below the
         fold has to be written too, at the full FROM: it is the state valad.io
         holds a page in before you reach the band, and leaving the property
         unset there resolves to rest instead, so the figures popped from
         scale 1 to scale 3 the instant the top edge crossed the fold and then
         shrank back. Clamping p at 0 below the fold makes the approach the
         start of the settle rather than a jump into it. */
      if (r.bottom < 0) continue;
      /* 0 while the top edge is still at the fold, 1 once it reaches the top. */
      var p = 1 - r.top / vh;
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      /* Ease out so most of the settle happens early and the last stretch is
         almost still, which is how valad.io's reads. */
      var eased = 1 - Math.pow(1 - p, 3);
      b.style.setProperty("--cta-v", (FROM + (TO - FROM) * eased).toFixed(4));
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  paint();
})();

/* ============================================================================
   Header menus
   ----------------------------------------------------------------------------
   Two of the bar's items open a panel instead of navigating: About and
   Portfolio. Both are the same full-width mega panel on the same grid, built
   from one set of data and one set of styles, so the pair reads as a single
   system rather than as two menus that happen to sit next to each other. Both
   are built here rather than written into the markup because the header is
   inline on all twenty-one pages with no include between them — one copy here
   is one thing to change.

   Nothing is bound to a trigger and nothing is written onto it. The DC runtime
   re-renders the bar after this file runs and replaces the nav anchors
   wholesale: a listener attached to the About link is dropped, and so are any
   attributes or child nodes added to it. A first pass did exactly that and the
   link simply navigated, because by click time the decorated node was gone.

   So clicks are delegated from `document`, a trigger is matched by its href —
   which is authored markup and survives the re-render — and the open state
   lives on the root element, as `data-mega="open"` for the shared bar plating
   and `data-mega-id` for the caret, where CSS can read it without touching the
   link at all. aria is re-applied by an observer for the same reason.

   Both links keep their href, so with the script blocked or JS off About still
   goes to about.html and Portfolio to portfolio.html. Off below 810, where the
   bar hands its navigation to the burger overlay and a second layer would be
   two menus at once.
   ========================================================================== */
(function () {
  var mq = window.matchMedia && window.matchMedia("(min-width: 810px)");
  if (!mq) return;

  var header = document.getElementById("siteHeader") || document.querySelector(".r-header");
  if (!header || !header.parentNode) return;

  /* 18px line marks on a 24 grid, 1.3 stroke — the weight the rest of the
     site's iconography uses. */
  var I = {
    overview:   'M3 7l9-4 9 4-9 4-9-4zM3 12l9 4 9-4M3 17l9 4 9-4',
    leadership: 'M12 12a4 4 0 100-8 4 4 0 000 8zM4 21c0-4 3.6-6 8-6s8 2 8 6',
    careers:    'M3 8h18v12H3zM9 8V5h6v3M3 13h18',
    contact:    'M3 6h18v12H3zM3 7l9 6 9-6',
    development:'M4 21V8l9-4v17M13 21V11l7 3v7M7 12h2M7 16h2M16 16h2',
    investment: 'M4 19h16M6 16V9M11 16V5M16 16v-6M20 16v-9',
    asset:      'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM4 7.5l8 4.5 8-4.5M12 12v9',
    portfolio:  'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    /* A disc cut into segments — the pie the word "sectors" already means, and
       the one glyph here that is not a box, so it reads apart from the Assets
       grid sitting directly above it. */
    sectors:    'M21 12a9 9 0 11-9-9v9h9z',
    /* Two linked rings — the partnership mark, distinct from the single-box
       icons around it. */
    partners:   'M8 15a4 4 0 100-8 4 4 0 000 8zM16 17a4 4 0 100-8 4 4 0 000 8zM10.5 9.5l3-1M10.5 14.5l3 1'
  };

  /* Panel contents are data so each menu's shape is one thing to read and edit. */
  var GROUPS = [
    { label: "Company", items: [
      { t: "Overview", d: "Who we are, and how we invest", href: "about.html", i: I.overview },
      { t: "Leadership", d: "The team behind the platform", href: "leadership.html", i: I.leadership },
      { t: "Careers", d: "Join the team building the platform", href: "careers.html", i: I.careers },
      { t: "Our Partners", d: "The firms we work alongside", href: "partners.html", i: I.partners }
    ]},
    { label: "What we do", items: [
      { t: "Development Management", d: "Origination, planning and delivery", href: "development-management.html", i: I.development },
      { t: "Investment Management", d: "Value-add, opportunistic and core-plus", href: "investment-management.html", i: I.investment }
    ]}
  ];
  /* The image is the story's own slot, never a slot picked by eye: the news
     index, the article page and the homepage rail all read one slot per story,
     so quoting it here is what keeps the panel's photo the story's photo when
     any of those is re-shot. This ran news-img-1 under a news-img-2 headline
     once already. */
  var FEATURE = {
    label: "Featured",
    img: "assets/slots/news-img-5.webp",
    head: "Valad Advances Its On-Chain Real Estate Credit Strategy",
    href: "on-chain-real-estate-private-credit-tokenisation.html"
  };

  /* Our Sectors is the homepage's pinned sector scroller, so it is addressed
     page-and-fragment rather than as a bare `#sectorScroll` — from any of the
     other twenty pages a bare fragment has nothing to match and only scrolls to
     the top of wherever you already are. */
  var PORTFOLIO_GROUPS = [
    { label: "Explore", items: [
      { t: "Our Assets", d: "Assets across the UK and Europe", href: "portfolio.html", i: I.portfolio },
      { t: "Our Sectors", d: "The five sectors we operate in", href: "index.html#sectorScroll", i: I.sectors }
    ]}
  ];
  /* The lead asset story rather than the one About runs — the panels share a
     shape, not a card, and two identical features either side of the bar would
     read as one menu rendered twice. */
  var PORTFOLIO_FEATURE = {
    label: "Featured",
    img: "assets/slots/news-lead-img.webp",
    head: "Valad Progresses Co-Living Opportunity in Canary Wharf",
    href: "co-living-canary-wharf-london.html"
  };

  var ARROW = '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
            + '<path d="M4 12L12 4M12 4H6M12 4v6" stroke="#141414" stroke-width="1.3" '
            + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* One row — icon box, title with the arrow at the far edge, description
     indented to the title. Shared, so the dropdown's rows are the mega panel's
     rows and there is one set of styles for both. */
  function itemHTML(it) {
    return '<a class="r-mega-item" href="' + esc(it.href) + '">'
         + '<span class="r-mega-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" '
         + 'aria-hidden="true"><path d="' + it.i + '" stroke="#141414" stroke-width="1.3" '
         + 'stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
         + '<span class="r-mega-head">' + esc(it.t) + ARROW + '</span>'
         + '<span class="r-mega-desc">' + esc(it.d) + '</span></a>';
  }

  function megaHTML(groups, feature) {
    var html = '<div class="r-mega-inner"><div>';
    groups.forEach(function (g) {
      html += '<div class="r-mega-group"><div class="r-mega-label">' + esc(g.label)
            + '</div><div class="r-mega-items">';
      g.items.forEach(function (it) { html += itemHTML(it); });
      html += "</div></div>";
    });
    html += '</div><div class="r-mega-feature"><div class="r-mega-feature-label">'
          + esc(feature.label) + '</div><a class="r-mega-feature-card" href="' + esc(feature.href) + '">'
          + '<span class="r-mega-feature-img"><img loading="lazy" decoding="async" src="'
          + esc(feature.img) + '" alt=""></span><span class="r-mega-feature-head">'
          + esc(feature.head) + "</span></a></div></div>";
    return html;
  }

  var MENUS = [
    { id: "aboutMega", href: "about.html", cls: "r-mega",
      html: megaHTML(GROUPS, FEATURE) },
    { id: "portfolioMenu", href: "portfolio.html", cls: "r-mega",
      html: megaHTML(PORTFOLIO_GROUPS, PORTFOLIO_FEATURE) }
  ];

  /* Only menus whose trigger is actually in this page's bar get built.

     Direct children only — the same correction the caret rule in
     valad-system.css needed, and for the same reason. As a descendant
     selector this matched anything inside `.r-nav` pointing at those hrefs,
     which since the mobile sub-panels landed includes two of their own rows:
     "Overview" links to about.html and "Our Assets" to portfolio.html. The
     click handler read either one as the bar's trigger, called
     `preventDefault()` and tried to drill into a panel that is not a sibling
     of it — so the row did nothing at all and the page never opened. */
  MENUS = MENUS.filter(function (m) {
    m.sel = '.r-header .r-nav > a[href="' + m.href + '"]';
    return !!document.querySelector(m.sel);
  });
  if (!MENUS.length) return;

  /* This module is built to run more than once. The runtime re-executes the
     whole file after its render pass, and that pass discards the panels and
     scrim inserted here — they are siblings of the header inside the subtree
     it owns, not nodes it knows to keep. The second execution rebuilding
     them is what makes the dropdown work at all; it is not redundant work.

     So nothing here is guarded by "has this run before" — an earlier attempt
     at that killed the desktop menu outright, because the run that got
     blocked was the only one whose panels survived. What must not happen
     twice is narrower: the document-level listeners at the bottom. Those are
     registered once, behind `data-mega-bound`, since a second capture-phase
     click handler would toggle the same menu open and shut inside one event
     and read as the click having done nothing.

     Rebuilt by id rather than appended blindly, so a run that finds its
     panel still standing replaces it instead of leaving two behind. And
     because the listeners outlive any single run, they must never close over
     a node this run created — `panelOf`/`scrimOf` resolve by id at call
     time, so a handler registered on the first pass still finds whatever the
     latest pass built. */
  function scrimOf() { return document.getElementById("megaScrim"); }
  function panelOf(m) { return document.getElementById(m.id); }

  /* Additive only — never removes. Removing and re-inserting these is what
     the first attempt at making this idempotent did, and it took the whole
     page down: these nodes are siblings of the header *inside* the subtree
     the runtime is mid-diff over, and pulling one out from under it throws
     `insertBefore: the node before which the new node is to be inserted is
     not a child of this node` out of the runtime itself, which then renders
     the component as an error box instead of the page. (valad-system.css
     documents the same hazard from the other side, and is why the section
     wipe is drawn as a pseudo-element rather than as child divs.)

     So: insert only what is missing. A run that finds its panels still
     standing does nothing at all; a run after the runtime has discarded
     them puts them back. Nothing is ever detached, so the diff is never
     disturbed. */
  function build() {
    /* Re-queried, not the `header` captured when this execution started: by
       the time a click arrives that variable can point at a header the
       runtime has already replaced, whose `parentNode` is null — which made
       an earlier version of this bail out silently and open nothing. */
    var live = document.getElementById("siteHeader") || document.querySelector(".r-header");
    if (!live || !live.parentNode) return;
    if (!scrimOf()) {
      var scrim = document.createElement("div");
      scrim.className = "r-mega-scrim";
      scrim.id = "megaScrim";
      live.parentNode.insertBefore(scrim, live.nextSibling);
    }
    MENUS.forEach(function (m) {
      if (panelOf(m)) return;
      var panel = document.createElement("div");
      panel.className = m.cls;
      panel.id = m.id;
      panel.innerHTML = m.html;
      live.parentNode.insertBefore(panel, live.nextSibling);
    });
  }
  build();

  var root = document.documentElement;
  var openMenu = null;

  function decorate() {
    MENUS.forEach(function (m) {
      var t = document.querySelector(m.sel);
      if (!t) return;
      t.setAttribute("aria-haspopup", "true");
      t.setAttribute("aria-controls", m.id);
      t.setAttribute("aria-expanded", openMenu === m ? "true" : "false");
    });
  }

  function setOpen(next) {
    MENUS.forEach(function (m) {
      var p = panelOf(m);
      if (p && m !== next) p.removeAttribute("data-open");
    });
    openMenu = next || null;
    var scrim = scrimOf();
    if (openMenu) {
      var open = panelOf(openMenu);
      /* The panel this run is asked to open may have been discarded by a
         re-render since the last one; rebuilding gets it back rather than
         opening nothing. */
      if (!open) { build(); open = panelOf(openMenu); scrim = scrimOf(); }
      root.setAttribute("data-mega", "open");
      root.setAttribute("data-mega-id", openMenu.id);
      if (open) open.setAttribute("data-open", "");
      if (scrim) scrim.setAttribute("data-open", "");
    } else {
      root.removeAttribute("data-mega");
      root.removeAttribute("data-mega-id");
      if (scrim) scrim.removeAttribute("data-open");
    }
    decorate();
  }

  /* The document-level listeners are the one part of this module that must
     not be registered twice — see the note on `build()` above. Scoped as a
     block rather than an early return: everything after it (the mobile
     sub-nav, the observer) has to keep running on every execution, for the
     same reason the panels do. */
  var bound = document.documentElement.hasAttribute("data-mega-bound");
  if (!bound) {
  document.documentElement.setAttribute("data-mega-bound", "");

  /* Capture phase. React is mounted on this page and attaches its own listener
     at the root; a bubbling handler on `document` can be beaten to the event,
     which is why a first pass here still navigated. Capture runs before any of
     it. */
  document.addEventListener("click", function (e) {
    /* Back out of a drilled-in panel to the top level. Checked before the
       trigger match below, since the button sits inside a panel that a
       trigger opened. */
    if (!mq.matches && e.target.closest && e.target.closest(".r-nav-back")) {
      e.preventDefault();
      closeMobileSub();
      return;
    }
    var t = e.target.closest ? e.target.closest("a") : null;
    var hit = null;
    if (t) {
      for (var i = 0; i < MENUS.length; i++) {
        if (t.matches(MENUS[i].sel)) { hit = MENUS[i]; break; }
      }
    }
    if (hit) {
      if (!mq.matches) {
        /* Mobile: the parent link pushes into its own panel rather than
           opening a hover one — see openMobileSub below. */
        e.preventDefault();
        openMobileSub(t);
        return;
      }
      e.preventDefault();
      setOpen(openMenu === hit ? null : hit);
      return;
    }
    if (!openMenu) return;
    /* A link inside a panel should not leave it hanging open behind the next
       page, and anything else on the page closes it. */
    var openPanel = panelOf(openMenu);
    if (openPanel && openPanel.contains(e.target)) { if (t) setOpen(null); return; }
    setOpen(null);
  }, true);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && openMenu) {
      var t = document.querySelector(openMenu.sel);
      setOpen(null);
      if (t) t.focus();
    }
  });

  /* Crossing to the burger layout with a panel open would strand it over the
     overlay. */
  var onMQ = function () { if (!mq.matches) setOpen(null); };
  if (mq.addEventListener) mq.addEventListener("change", onMQ);
  else if (mq.addListener) mq.addListener(onMQ);
  }   /* end: bind-once block */

  /* Mobile/tablet sub-nav — the overlay below 810px has no hover surface for
     a panel, so "About" and "Portfolio" have always dropped straight to
     their own page there ("mobile keeps the plain link", above). That was a
     fair trade while the dropdown's extra rows were duplicates of what those
     pages already linked to internally. It stops being one once a row points
     somewhere nothing else on the page reaches — Leadership, Development
     Management, Investment Management and Our Partners are
     all real destinations now, not anchors, so a mobile visitor needs a way
     into them that isn't scrolling to the footer.

     Same markup the desktop panel renders for each — icon, title, arrow,
     description per row, plus the featured card — not a stripped-down link
     list; the dropdown's content is the point.

     Drilled into rather than expanded in place. An accordion was the first
     shape tried here and it is the wrong one at this size: these panels are
     tall (seven rows and a feature card for About), so expanding one in the
     middle of the list pushes "News" and "Contact" far below the fold and
     leaves the visitor scrolling through a menu that no longer shows them
     where they are. Tapping a parent instead replaces the whole overlay with
     that menu — its rows and its feature card, nothing else, with a Back
     control returning to the top level. Same push-and-pop a phone's own
     settings use, and the level you are on is always the only thing on
     screen. The CTA belongs to the top level only: it is a page-level action,
     not part of any one menu, so it goes with the level it was on. */
  var SUBNAVS = [
    { href: "about.html", groups: GROUPS, feature: FEATURE },
    { href: "portfolio.html", groups: PORTFOLIO_GROUPS, feature: PORTFOLIO_FEATURE }
  ];
  var BACK = '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">'
           + '<path d="M13 8H3M7 4L3 8l4 4" stroke="currentColor" stroke-width="1.4" '
           + 'stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function buildMobileSubnav() {
    SUBNAVS.forEach(function (s) {
      var link = document.querySelector('.r-header .r-nav > a[href="' + s.href + '"]');
      if (!link) return;
      link.setAttribute("aria-expanded", "false");
      if (link.nextElementSibling && link.nextElementSibling.classList.contains("r-nav-sub")) return;
      var block = document.createElement("div");
      block.className = "r-nav-sub";
      block.innerHTML = '<button class="r-nav-back" type="button">' + BACK + "<span>Back</span></button>"
                      + megaHTML(s.groups, s.feature);
      link.insertAdjacentElement("afterend", block);
    });
  }
  buildMobileSubnav();

  /* `data-nav-sub` on the root is what the CSS reads to hide the top level —
     the root again, for the same reason `data-nav-open` lives there: it is
     the one node a re-render cannot take out from under this. Re-queries the
     blocks fresh each call rather than caching them, for the same reason
     buildMobileSubnav's own guard exists. */
  function closeMobileSub() {
    document.documentElement.removeAttribute("data-nav-sub");
    document.querySelectorAll(".r-header .r-nav > a[aria-expanded]").forEach(function (a) {
      a.setAttribute("aria-expanded", "false");
    });
    document.querySelectorAll(".r-nav-sub").forEach(function (b) { b.classList.remove("is-open"); });
  }
  function openMobileSub(link) {
    var target = link.nextElementSibling;
    if (!target || !target.classList.contains("r-nav-sub")) return;
    closeMobileSub();
    target.classList.add("is-open");
    link.setAttribute("aria-expanded", "true");
    document.documentElement.setAttribute("data-nav-sub", "");
    /* Arriving at a panel already scrolled to wherever the previous level
       was left is the standard failure of a drill-down built out of one
       scroll container. */
    var nav = document.querySelector(".r-header .r-nav");
    if (nav) nav.scrollTop = 0;
  }

  /* The runtime replaces the nav anchors on re-render, taking the aria with
     them — and the sub-nav blocks just inserted, since they are new siblings
     the runtime's diff does not know about. A MutationObserver watching
     `.r-nav` is the obvious fix and is left in below, but it is a belt on
     top of a stronger guarantee, not the guarantee itself: a re-render that
     lands between this line and the observer's `.observe()` call — the same
     race the wipe module's re-scan and the CTA band's ensureBands() exist
     for elsewhere in this file — leaves nothing watching at all, silently.
     Rebuilding again on the toggle's own click closes that gap outright: by
     the time a visitor has actually opened the burger, whatever re-render
     was going to happen has long since happened, so re-running here always
     sees the DOM that's really on screen. buildMobileSubnav() is written to
     no-op once a link already has its block, so calling it on every open
     costs nothing. */
  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest(".r-navbtn")) buildMobileSubnav();
  });

  /* The runtime replaces the nav anchors on re-render, taking the aria with
     them. Put it back whenever that happens. */
  if (window.MutationObserver) {
    var nav = header.querySelector(".r-nav");
    if (nav) new MutationObserver(function () { decorate(); buildMobileSubnav(); }).observe(nav, { childList: true, subtree: true });
  }
  decorate();
})();

/* ============================================================================
   Dark-to-light section wipe
   ----------------------------------------------------------------------------
   The boundary where a dark section hands over to a light one is drawn as a
   stack of thin bars that fill in as the light section rises: each bar grows
   from its top-left corner, wider and taller together, and the stack runs
   bottom-first so the seam closes upward like a comb.

   Scroll-linked, not a one-shot on intersection. That is the whole character of
   it — hold the wheel still mid-boundary and the bars hold with you, so the
   edge belongs to the page's position rather than to a timer that happens to
   have been started by it.

   Which boundaries get one is read off the page rather than marked up, for the
   same reason the mega-menu is built here: the sections are inline on all
   twenty-one pages with no include between them, and the set of dark-to-light
   seams is already stated by their background colours. Any section that is
   light, and that a dark section ends exactly against, qualifies — so a page
   that gains or reorders sections gets the right seams with no second place to
   update. On the homepage that is the hero into the thesis, and How it works
   into News.

   Everything below the scan is shaped by how the DC runtime arrives at the tree
   this measures. Tracing the homepage from parse:

     +0ms    the authored `<x-dc>` markup, eight sections
     +10ms   nothing — that markup is torn down
     +44ms   eight sections rendered into `#dc-root`, all new elements
     +103ms  eight sections again, but the same elements have moved: the one
             that was Partners is now News, the one that was News is now
             Contact, and About's is gone entirely
     ...     stable from there

   So a class written on News at +44ms is a class on Contact at +103ms, which is
   what the first two attempts at this both did — the runtime patches nodes in
   place and re-keys them rather than replacing them. Nothing here can be built
   once and trusted. `sync` is therefore idempotent and re-runs whenever the set
   of sections changes identity: it strips every element it previously marked,
   including ones that have since become a different section, and rescans.

   The runtime also re-executes this file after its render, so the module runs
   twice per page; the second execution finds the observer already watching and
   leaves.

   Nothing is added to the tree either — the strip is a pseudo-element, which
   the runtime cannot diff and cannot recycle. All this writes is a class and
   eight custom properties. Its geometry is in valad-system.css.
   ========================================================================== */
(function () {
  /* Six bands. Four are visibly mid-flight at any moment, which is the density
     the effect was read at; the two below them have closed and are
     indistinguishable from the section. Changing this means changing the layer
     count in the stylesheet with it. */
  var COUNT = 6;
  /* How far one bar lags the one below it, in progress. Was 0.22, which put
     the six bars at six clearly different lengths at any moment — the edge
     read as a staircase of unequal steps rather than as a single edge being
     drawn. Small enough now that the bars arrive as one line with a slight
     rake to it, which is the difference between a comb closing and a set of
     bars of assorted sizes. */
  var STAGGER = 0.18;

  /* The run is the seam's whole passage through the window: p is 0 as the seam
     crosses the bottom edge and does not reach 1 until it leaves at the top. A
     full viewport of travel rather than the middle two thirds, so the comb is
     never finished while it is still on screen and every frame moves it by a
     fraction of what a shorter run would — which is most of what makes it read
     as smooth rather than as something that snaps and then waits. */
  var START = 1;        /* section top, as a fraction of the viewport, at p = 0 */
  var END = 0;          /*                                    ... and at p = 1 */

  /* Held closed for anyone who has asked for less motion. Returning before the
     class is written leaves every boundary as the hard edge it has always been,
     rather than as a permanently half-drawn comb. */
  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) return;

  /* One page, one watcher, however many times the runtime re-executes this. */
  if (document.documentElement.hasAttribute("data-band-wipe")) return;
  document.documentElement.setAttribute("data-band-wipe", "");

  /* sRGB relative luminance. The site's two families sit far apart — 0.06 for
     the near-blacks, 0.85 and up for paper and white — so anything either side
     of the midpoint separates them, and a section with no background of its own
     resolves transparent and is skipped. */
  function luminance(colour) {
    var n = colour.match(/[\d.]+/g);
    if (!n || n.length < 3) return null;
    if (n.length > 3 && parseFloat(n[3]) < 0.5) return null;
    var v = [];
    for (var i = 0; i < 3; i++) {
      var c = n[i] / 255;
      v.push(c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
    }
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }

  /* The whole run, in progress units: one bar's travel plus the lag stacked up
     behind the topmost. */
  var SPAN = 1 + (COUNT - 1) * STAGGER;
  var hosts = [];
  var scanned = [];
  var ticking = false;
  var pending = false;

  function paint() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    /* A zero-height viewport — a collapsed panel, or a document measured before
       layout — would divide to NaN and take every bar out of the composition.
       Leaving the properties alone holds the last good frame instead. */
    if (!vh) return;

    for (var i = 0; i < hosts.length; i++) {
      var host = hosts[i];
      var p = (START * vh - host.el.getBoundingClientRect().top) / ((START - END) * vh);
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      /* Both ends settle: a strip that is already closed, or has not started,
         is written once and then left alone until it moves off that value. */
      if (p === host.last) continue;
      host.last = p;

      for (var b = 0; b < COUNT; b++) {
        /* Bar 0 is the top of the stack, so the lag is counted from the bottom:
           the last bar leads and the first trails by the full stagger. */
        var t = p * SPAN - (COUNT - 1 - b) * STAGGER;
        if (t < 0) t = 0;
        if (t > 1) t = 1;
        /* Ease out, so a bar arrives rather than stops. Quadratic rather than
           the cubic the closing band settles on: over a run this long a cubic
           spends its first third almost done and the rest crawling, which puts
           four bars at a visible standstill while one moves. The gentler curve
           keeps the whole comb in motion across the passage. At t = 1 this is
           exactly 1, which keeps the closed edge seamless. */
        var eased = 1 - Math.pow(1 - t, 2);
        host.el.style.setProperty("--wipe-p" + b, eased.toFixed(4));
      }
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  function clear(el) {
    el.classList.remove("r-wipe-host");
    el.style.removeProperty("--wipe-from");
    el.style.removeProperty("--wipe-to");
    for (var b = 0; b < COUNT; b++) el.style.removeProperty("--wipe-p" + b);
  }

  /* What ends against a seam, which is not always the section before it.
     About's dark half is a five-screen scroller div, not a section, and on
     every page the runtime wraps each section in a transparent `.sc-host` — so
     the search walks back through preceding siblings and then down into
     whatever they end with, taking the first full-bleed thing that ends at the
     seam and paints a colour of its own. */
  function blockAbove(seamTop, vw, node, depth) {
    if (!node || depth > 4) return null;
    var r = node.getBoundingClientRect();
    if (!r.height) return null;
    if (Math.abs(r.bottom - seamTop) > 2 || r.left > 1 || vw - r.right > 1) return null;
    if (luminance(getComputedStyle(node).backgroundColor) !== null) return node;
    /* A transparent wrapper is not the colour; whatever it closes with is. */
    for (var kid = node.lastElementChild; kid; kid = kid.previousElementSibling) {
      var inner = blockAbove(seamTop, vw, kid, depth + 1);
      if (inner) return inner;
    }
    return null;
  }

  function above(light, seamTop, vw) {
    for (var node = light; node && node !== document.body; node = node.parentElement) {
      for (var prev = node.previousElementSibling; prev; prev = prev.previousElementSibling) {
        var found = blockAbove(seamTop, vw, prev, 0);
        if (found) return found;
      }
    }
    return null;
  }

  function sync() {
    pending = false;
    var sections = document.querySelectorAll("section");

    /* The same elements in the same order means the same seams. Almost every
       call lands here: the observer below hears from the marquee, the chain
       panels and the image slots too, and none of those move a section. */
    if (sections.length === scanned.length) {
      var same = true;
      for (var k = 0; k < sections.length; k++) {
        if (sections[k] !== scanned[k]) { same = false; break; }
      }
      if (same) return;
    }

    /* Marked elements are cleared by the reference held here rather than by
       selector, because an element the runtime has re-keyed is now some other
       section and would otherwise keep a strip that belongs to the seam it used
       to be part of. */
    for (var h = 0; h < hosts.length; h++) clear(hosts[h].el);
    hosts = [];
    scanned = [].slice.call(sections);

    var vw = document.documentElement.clientWidth;

    for (var s = 0; s < sections.length; s++) {
      var light = sections[s];
      var to = getComputedStyle(light).backgroundColor;
      var lightL = luminance(to);
      if (lightL === null || lightL < 0.5) continue;

      /* Full-bleed only, both halves. The bars are drawn across the section
         they belong to, so on an inset section they would run from its left
         edge rather than the page's and read as a graphic sitting in a column
         instead of as the edge between two colours. The width is what the
         effect is made of; a boundary that does not have it is left alone. */
      var lightBox = light.getBoundingClientRect();
      if (lightBox.left > 1 || vw - lightBox.right > 1) continue;

      var dark = above(light, lightBox.top, vw);
      if (!dark) continue;
      var from = getComputedStyle(dark).backgroundColor;
      if (luminance(from) >= 0.5) continue;

      /* Opt-out for a specific seam. `data-no-wipe` on either side of the
         boundary — the dark section handing off or the light one receiving
         it — holds that edge as the hard cut it would be with no script at
         all, without touching the scan for every other seam on the page. */
      if (dark.hasAttribute("data-no-wipe") || light.hasAttribute("data-no-wipe")) continue;

      /* Not under the hero. Every page opens on one, the bar sits over it with
         no plate, and its closing edge is a photograph rather than the flat
         field the bars need to grow out of — a strip of the hero's own base
         colour under a photograph that ends on sky reads as a band ruled across
         the page, which is the one thing this is meant not to do. The opening
         hero is the block that starts at the top of the document; a dark
         section further down is not one. */
      if (dark.getBoundingClientRect().top + (window.pageYOffset || 0) < 1) continue;

      light.style.setProperty("--wipe-from", from);
      light.style.setProperty("--wipe-to", to);
      light.classList.add("r-wipe-host");
      hosts.push({ el: light, last: null });
    }

    if (hosts.length) paint();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(sync);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);

  /* The tree is rebuilt twice before it settles and the second pass is the one
     that moves elements between sections, so watching for it is the only way to
     be sure of scanning the tree that gets painted. Kept on afterwards: it is
     one comparison of eight element references per frame in which something,
     anywhere, changed, and it means a section added later is picked up. */
  if (window.MutationObserver) {
    new MutationObserver(schedule).observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }
  sync();
})();

/* ============================================================================
   Late fragment landing
   ----------------------------------------------------------------------------
   A link that arrives carrying a fragment — the Portfolio menu's Our Sectors is
   `index.html#sectorScroll` — is resolved by the browser at parse, against the
   authored markup. The DC runtime then tears that markup down and renders it
   again, and everything below the target moves: the offset the browser scrolled
   to is now addressing a different part of a much taller page. Arriving at the
   sector scroller this way landed 8,000px past it, in the footer.

   So the fragment is re-applied once the runtime has settled, and kept
   corrected while the page is still growing — images above the target resolve
   their heights late and push it further down as they do. Each pass re-reads
   the target's position rather than trusting the first one.

   It gives the page back the moment the reader touches it. `scroll` is not
   usable as that signal, because this module's own writes raise it; the intent
   events are, so it is the wheel and the keys that stop it rather than the
   result of turning them.
   ========================================================================== */
(function () {
  var id = (location.hash || "").slice(1);
  if (!id) return;

  /* The runtime re-executes this file after its render, so the module runs
     twice per page; the second execution finds the flag and leaves. */
  if (document.documentElement.hasAttribute("data-hash-landed")) return;
  document.documentElement.setAttribute("data-hash-landed", "");

  var live = true;
  ["wheel", "touchstart", "keydown", "pointerdown"].forEach(function (t) {
    window.addEventListener(t, function () { live = false; }, { passive: true, once: true });
  });

  function land() {
    if (!live) return;
    var el = document.getElementById(id);
    if (!el) return;
    var y = el.getBoundingClientRect().top + window.pageYOffset;
    /* A pass that would not move anything is skipped, so a page that already
       landed correctly never has a scroll written to it at all. */
    if (Math.abs(window.pageYOffset - y) > 2) window.scrollTo(0, y);
  }

  /* Through the runtime's two renders — about +44ms and +103ms — and out past
     the point where late images have finished resolving their heights. */
  [0, 60, 140, 260, 420, 650, 900].forEach(function (t) { setTimeout(land, t); });
  window.addEventListener("load", land);
})();

/* ============================================================================
   Reveal backstop
   ----------------------------------------------------------------------------
   Sections across the site are authored with an inline `opacity: 0` and are
   faded in by their page's own DCLogic component, which captures every
   `[data-reveal]` once in componentDidMount. That capture is a snapshot: the
   runtime re-keys the tree shortly after mount (see the wipe module above),
   and a capture taken on the pass that gets discarded leaves the component
   animating detached nodes while the ones actually on screen keep the hidden
   state baked into their markup. The result is not a missing animation, it is
   missing content — Contact shipped with its email address and all three
   office addresses invisible this way, and it is a race, so it reproduces on
   some loads and not others.

   This is the floor under that: re-query the live DOM at a few checkpoints
   and on scroll, and un-hide anything still sitting at zero. It holds no
   references, so there is nothing for a re-render to invalidate; it only ever
   moves an element from invisible to visible, so it cannot fight a component
   that is working correctly; and it lives here, in the one file every page
   already loads, rather than being pasted into each of the twenty-five.

   Pages whose own inline script carries a copy of this are unaffected — both
   do the same idempotent thing. Those copies stay where they also carry
   page-specific work (the two management pages drive their scroll-scrub
   headings from the same block). */
(function () {
  if (document.documentElement.hasAttribute("data-reveal-backstop")) return;
  document.documentElement.setAttribute("data-reveal-backstop", "");

  function reveal() {
    var els = document.querySelectorAll("[data-reveal]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (getComputedStyle(el).opacity === "0") {
        el.style.opacity = "1";
        el.style.transform = "none";
      }
    }
  }

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  if (still && still.matches) { reveal(); return; }

  /* Late enough to let a healthy component run its own staggered fade first —
     the earliest checkpoint is past the delays those use — and repeated,
     because the re-render that causes this does not land at a fixed time. */
  [900, 2000, 3500].forEach(function (t) { setTimeout(reveal, t); });
  window.addEventListener("scroll", reveal, { passive: true });
  window.addEventListener("load", reveal);
})();

/* ============================================================================
   Scroll-scrub headings
   ----------------------------------------------------------------------------
   Headings marked `data-scrub-text` are drawn as a gradient clipped to the
   glyphs, wiped from full ink to dim as the heading crosses the viewport —
   the site's one piece of scroll-linked typography. Each page's own DCLogic
   component implements it, and each one captures the headings the same way
   the reveals were captured: once, in componentDidMount. Same outcome, for
   the same reason — the runtime re-keys the tree after mount, the capture is
   left holding detached nodes, and the headings actually on screen keep the
   flat gradient authored into their markup forever.

   It fails silently and it does not look broken: an unscrubbed heading is
   still a heading, just one that never moves. Measured across the site, the
   inline gradient on every one of them still had the authored whole-number
   stops (`0%`, `16%`) rather than the fractional ones this writes, which is
   what proves no component had touched them.

   Same shape as the reveal backstop above: re-query on every frame, hold no
   references, live in the file every page already loads. A page whose own
   component is working is unaffected — both compute the same value from the
   same rect, so whichever writes last writes the same string. */
(function () {
  if (document.documentElement.hasAttribute("data-scrub-bound")) return;
  document.documentElement.setAttribute("data-scrub-bound", "");

  var still = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = !!(still && still.matches);
  var ticking = false;

  function paint() {
    ticking = false;
    var vh = window.innerHeight || document.documentElement.clientHeight;
    if (!vh) return;
    /* The window the wipe runs over: full ink by the time the heading has
       risen to a quarter of the screen, dim while it is still near the
       bottom. Matches the per-page components this stands in for. */
    var startY = vh * 0.88, endY = vh * 0.24;
    var els = document.querySelectorAll("[data-scrub-text]");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var p = reduced ? 1 : (startY - el.getBoundingClientRect().top) / (startY - endY);
      if (p < 0) p = 0;
      if (p > 1) p = 1;
      var dark = el.getAttribute("data-scrub-dark") || "#141414";
      var dim = el.getAttribute("data-scrub-dim") || "rgba(20,20,20,.16)";
      var a = (p * 100).toFixed(1);
      var b = Math.min(100, p * 100 + 16).toFixed(1);
      el.style.backgroundImage = "linear-gradient(115deg," + dark + " 0%," + dark + " "
        + a + "%," + dim + " " + b + "%," + dim + " 100%)";
    }
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(paint);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  window.addEventListener("load", paint);
  /* Repeated early passes for the same reason the reveal backstop has them:
     the re-render that strands the component's own copy does not land at a
     fixed time, and a heading already on screen at load should not sit dim
     until the first scroll. */
  [0, 300, 900, 2000].forEach(function (t) { setTimeout(paint, t); });
})();

/* ============================================================================
   "Our Assets" picker
   ----------------------------------------------------------------------------
   A list of terms beside a stack of images: the active row shows its
   description and its image, the rest collapse to a muted title. Pointer
   moves select on hover, which is how the reference behaves; keyboard and
   touch select on focus and on tap, so the row is reachable without one.

   Delegated from `document` and resolved by `data-` attribute at event time,
   for the reason every other module in this file now is: the runtime re-keys
   the tree after mount, and anything bound to the nodes present at load is
   bound to nodes that will not be on screen. Bound once — a second set of
   listeners would toggle the same row twice per event. */
(function () {
  if (document.documentElement.hasAttribute("data-assets-bound")) return;
  document.documentElement.setAttribute("data-assets-bound", "");

  function select(row) {
    var section = row.closest("[data-asset-picker]");
    if (!section) return;
    var n = row.getAttribute("data-asset-row");
    if (row.hasAttribute("data-active")) return;
    section.querySelectorAll("[data-asset-row]").forEach(function (r) {
      r.toggleAttribute("data-active", r === row);
    });
    section.querySelectorAll("[data-asset-fig]").forEach(function (f) {
      var on = f.getAttribute("data-asset-fig") === n;
      f.style.opacity = on ? "1" : "0";
      f.style.filter = on ? "blur(0px)" : "blur(20px)";
    });
  }

  function fromEvent(e) {
    var row = e.target.closest && e.target.closest("[data-asset-row]");
    if (row) select(row);
  }

  /* Click, not hover. Hover selection made the list twitchy to read — the
     image and the open description changed under the pointer on the way to
     anywhere else on the page, including while simply scrolling past. A term
     opens when it is chosen and stays open. Keyboard focus still selects, so
     the list is operable without a pointer. */
  document.addEventListener("click", fromEvent);
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var row = e.target.closest && e.target.closest("[data-asset-row]");
    if (!row) return;
    e.preventDefault();
    select(row);
  });
})();
