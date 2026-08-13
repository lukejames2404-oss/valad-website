// <contact-offices-map> — Valad Contact page map: London, Manchester, Madrid. Grained grey land on white; red dots mark
// the offices; hovering one stipples that jurisdiction red, pulses a halo and
// opens a small white address card.
(function () {
  const LIBS = [
    { src: "https://unpkg.com/d3@7.9.0/dist/d3.min.js", test: () => window.d3 },
    { src: "https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js", test: () => window.topojson }
  ];
  const load = (l) => new Promise((res, rej) => {
    if (l.test()) return res();
    let s = document.querySelector('script[src="' + l.src + '"]');
    if (!s) { s = document.createElement("script"); s.src = l.src; s.crossOrigin = "anonymous"; document.head.appendChild(s); }
    const t = setInterval(() => { if (l.test()) { clearInterval(t); res(); } }, 40);
    setTimeout(() => { clearInterval(t); l.test() ? res() : rej(new Error("lib timeout")); }, 12000);
  });

  let cache = null;
  const geo = async () => {
    if (!cache) {
      const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json").then((r) => r.json());
      cache = window.topojson.feature(topo, topo.objects.countries).features;
    }
    return cache;
  };

  // Jersey is too small to read at this scale — an enlarged blob around the isle
  const JERSEY_BLOB = { type: "Feature", geometry: { type: "Polygon", coordinates: [[
    [-2.42, 49.05], [-2.42, 49.31], [-2.22, 49.40], [-1.96, 49.40],
    [-1.80, 49.31], [-1.80, 49.05], [-2.02, 48.98], [-2.24, 48.98], [-2.42, 49.05]
  ]] } };

  const OFFICES = [
    { name: "London", lon: -0.1247, lat: 51.5142, region: "United Kingdom",
      addr: ["71–75 Shelton Street", "Covent Garden", "London WC2H 9JQ"] },
    { name: "Jersey", lon: -2.1105, lat: 49.1835, region: "_jersey",
      addr: ["44 Esplanade", "St Helier", "Jersey JE4 9WG"] },
    { name: "Luxembourg", lon: 6.1296, lat: 49.5936, region: "Luxembourg",
      addr: ["2 Rue Eugène Ruppert", "L-2453 Luxembourg"] }
  ];

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  const grain = (hex, density, lo, hi) => {
    const N = 150;
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    const c = document.createElement("canvas");
    c.width = N; c.height = N;
    const x = c.getContext("2d");
    const img = x.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const on = Math.random() < density;
      img.data[i * 4] = r; img.data[i * 4 + 1] = g; img.data[i * 4 + 2] = b;
      img.data[i * 4 + 3] = on ? Math.round(lo + Math.random() * (hi - lo)) : 0;
    }
    x.putImageData(img, 0, 0);
    return c;
  };

  class OfficesMap extends HTMLElement {
    connectedCallback() {
      if (this._done) return;
      this._done = true;
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      this.style.height = "100%";
      // Same deferral as offices-map.js. Contact is short enough that the map
      // is on screen at load, so this does not save the work — but an observer
      // callback lands after first paint, which keeps ~590ms of library load
      // and topology parsing off the critical path. The page becomes
      // interactive first and the map fills in a moment later.
      if (!("IntersectionObserver" in window)) return this.render();
      this._bootIO = new IntersectionObserver((entries) => {
        if (!entries[entries.length - 1].isIntersecting) return;
        this._bootIO.disconnect();
        this._bootIO = null;
        this.render();
      }, { rootMargin: "150% 0px" });
      this._bootIO.observe(this);
    }
    disconnectedCallback() {
      if (this._bootIO) { this._bootIO.disconnect(); this._bootIO = null; }
      if (this._loop) cancelAnimationFrame(this._loop);
      if (this._onResize) window.removeEventListener("resize", this._onResize);
    }
    async render() {
      try {
        for (const l of LIBS) await load(l);
        const feats = await geo();
        const d3 = window.d3;
        const red = this.getAttribute("accent") || "#BAD2FF";
        const land = this.getAttribute("land") || "#C6C6C2";

        const byName = {};
        feats.forEach((f) => { if (f.properties && f.properties.name) byName[f.properties.name] = f; });
        OFFICES.forEach((o) => { o.shape = o.region === "_jersey" ? JERSEY_BLOB : byName[o.region] || null; });

        const landPat = grain(land, 0.5, 26, 132);
        const redPat = grain(red, 0.75, 90, 240);

        const canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;mask-image:linear-gradient(to right,transparent 0%,#000 14%,#000 86%,transparent 100%),linear-gradient(to bottom,transparent 0%,#000 13%,#000 84%,transparent 100%);-webkit-mask-image:linear-gradient(to right,transparent 0%,#000 14%,#000 86%,transparent 100%),linear-gradient(to bottom,transparent 0%,#000 13%,#000 84%,transparent 100%);mask-composite:intersect;-webkit-mask-composite:source-in";
        const ctx = canvas.getContext("2d");
        const layer = document.createElement("canvas");
        const lctx = layer.getContext("2d");

        const wrap = document.createElement("div");
        wrap.style.cssText = "position:absolute;inset:0;pointer-events:none";
        const cards = OFFICES.map((o) => {
          const el = document.createElement("div");
          el.style.cssText = "position:absolute;width:172px;padding:18px 20px 20px;background:#FFFFFF;border:1px solid rgba(20,20,20,.07);border-radius:6px;box-shadow:0 10px 34px rgba(20,20,20,.10);opacity:0;transform:translateY(6px);transition:opacity 260ms ease,transform 260ms ease;font-family:'Saans','Saans Fallback',Helvetica,Arial,sans-serif";
          const name = document.createElement("div");
          name.textContent = o.name;
          name.style.cssText = "font-size:20px;line-height:1.1;letter-spacing:0;color:#141414";
          const addr = document.createElement("div");
          addr.textContent = o.addr.join(", ");
          addr.style.cssText = "margin-top:12px;font-size:12px;line-height:1.55;letter-spacing:0;color:rgba(20,20,20,.62)";
          el.append(name, addr);
          wrap.appendChild(el);
          return el;
        });

        this.replaceChildren(canvas, wrap);

        const proj = d3.geoMercator();
        let w = 0, h = 0, dpr = 1;
        const measure = () => {
          const r = this.getBoundingClientRect();
          const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
          dpr = Math.min(2, window.devicePixelRatio || 1);
          if (nw === w && nh === h) return false;
          w = nw; h = nh;
          canvas.width = w * dpr; canvas.height = h * dpr;
          layer.width = w * dpr; layer.height = h * dpr;
          proj.translate([w / 2, h / 2]).center([2, 50.5]).scale(Math.max(240, nw * 1.9));
          return true;
        };

        const pins = OFFICES.map((o) => ({ o, xy: [-9999, -9999], glow: 0 }));
        let hover = -1, t0 = performance.now(), dirty = true;

        const paintLand = () => {
          lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          lctx.clearRect(0, 0, w, h);
          const gp = d3.geoPath(proj, lctx);
          lctx.beginPath();
          feats.forEach((f) => gp(f));
          lctx.fillStyle = lctx.createPattern(landPat, "repeat");
          lctx.fill();
          pins.forEach((pin) => {
            if (!pin.o.shape || pin.glow < 0.02) return;
            lctx.save();
            lctx.globalAlpha = clamp(pin.glow, 0, 1);
            lctx.beginPath();
            gp(pin.o.shape);
            lctx.fillStyle = lctx.createPattern(redPat, "repeat");
            lctx.fill();
            lctx.restore();
          });
          lctx.save();
          lctx.globalCompositeOperation = "destination-out";
          const diag = Math.hypot(w, h) / 2;
          const g = lctx.createRadialGradient(w / 2, h / 2, diag * 0.08, w / 2, h / 2, diag);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(0.55, "rgba(0,0,0,0)");
          g.addColorStop(0.8, "rgba(0,0,0,.3)");
          g.addColorStop(0.93, "rgba(0,0,0,.72)");
          g.addColorStop(1, "rgba(0,0,0,1)");
          lctx.fillStyle = g;
          lctx.fillRect(0, 0, w, h);
          lctx.restore();
        };

        const paint = (now) => {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          ctx.drawImage(layer, 0, 0, w, h);
          const pulse = 0.5 + 0.5 * Math.sin((now - t0) / 620);
          pins.forEach((pin) => {
            const [x, y] = pin.xy;
            if (!isFinite(x)) return;
            const a = clamp(pin.glow, 0, 1);
            if (a > 0.02) {
              const R = (18 + 10 * pulse) * a;
              const g = ctx.createRadialGradient(x, y, 1, x, y, R);
              g.addColorStop(0, "rgba(186,210,255," + (0.55 * a).toFixed(3) + ")");
              g.addColorStop(1, "rgba(186,210,255,0)");
              ctx.fillStyle = g;
              ctx.beginPath();
              ctx.arc(x, y, R, 0, 6.2832);
              ctx.fill();
            }
            ctx.beginPath();
            ctx.arc(x, y, 5, 0, 6.2832);
            ctx.fillStyle = red;
            ctx.fill();
          });
        };

        const place = (i) => {
          const el = cards[i], [x, y] = pins[i].xy;
          const cw = 172 + 40, ch = el.offsetHeight || 108;
          let left = x - cw - 18, top = y - ch - 14;
          // Preferred position is up-left of the pin. Flip to the other side
          // when that would clip, then clamp to the map box — without the
          // clamp the right-most pin (Luxembourg) pushed its card off-screen
          // on narrow viewports.
          if (left < 8) left = x + 20;
          if (left + cw > w - 8) left = Math.max(8, Math.min(x - cw - 18, w - cw - 8));
          if (left < 8) left = 8;
          if (top < 8) top = y + 20;
          if (top + ch > h - 8) top = Math.max(8, h - ch - 8);
          el.style.left = Math.round(left) + "px";
          el.style.top = Math.round(top) + "px";
        };

        const frame = (now) => {
          if (measure()) dirty = true;
          let anyGlow = false;
          pins.forEach((pin, i) => {
            pin.xy = proj([pin.o.lon, pin.o.lat]) || [-9999, -9999];
            const target = hover === i ? 1 : 0;
            const next = pin.glow + (target - pin.glow) * 0.14;
            if (Math.abs(next - pin.glow) > 0.0015) dirty = true;
            pin.glow = next;
            if (pin.glow > 0.002) anyGlow = true;
            cards[i].style.opacity = hover === i ? "1" : "0";
            cards[i].style.transform = hover === i ? "translateY(0)" : "translateY(6px)";
            if (hover === i) place(i);
          });
          if (dirty) { paintLand(); dirty = false; paint(now); }
          else if (anyGlow) { paint(now); }
          this._loop = requestAnimationFrame(frame);
        };

        const hit = (ev) => {
          const r = canvas.getBoundingClientRect();
          const mx = ev.clientX - r.left, my = ev.clientY - r.top;
          let found = -1;
          pins.forEach((pin, i) => {
            if (Math.hypot(pin.xy[0] - mx, pin.xy[1] - my) < 24) found = i;
          });
          if (found !== hover) { hover = found; dirty = true; }
          canvas.style.cursor = found >= 0 ? "pointer" : "default";
        };
        canvas.addEventListener("mousemove", hit);
        canvas.addEventListener("mouseleave", () => { hover = -1; dirty = true; });

        this._onResize = () => { w = 0; };
        window.addEventListener("resize", this._onResize);
        measure();
        paintLand();
        this._loop = requestAnimationFrame(frame);
      } catch (e) {
        this.replaceChildren();
      }
    }
  }
  if (!customElements.get("contact-offices-map")) customElements.define("contact-offices-map", OfficesMap);
})();
