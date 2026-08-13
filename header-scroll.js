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
