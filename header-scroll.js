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

  var FROM = 2;      /* v as the band enters — scale 3, full drift */
  var TO = 0;        /* v once it has settled — scale 1, no drift  */
  var ticking = false;

  function paint() {
    ticking = false;
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
