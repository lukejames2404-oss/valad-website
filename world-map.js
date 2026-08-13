// <world-map> — scroll-driven map: whole world, then zooms into London →
// Jersey → Luxembourg. Grey grained land on white; the focused place's own
// geography fills blue and a pill label sits above its dot.
(function () {
  const LIBS = [
    { src: "https://unpkg.com/d3@7.9.0/dist/d3.min.js", integrity: "sha384-CjloA8y00+1SDAUkjs099PVfnY2KmDC2BZnws9kh8D/lX1s46w6EPhpXdqMfjK6i", test: () => window.d3 },
    { src: "https://unpkg.com/topojson-client@3.1.0/dist/topojson-client.min.js", integrity: "sha384-Ukv1p/xTma6P4/2bY5KzWBw+ydSpXmhCMtyciIQVDJ1RmOxtCYNMF1uXT9T63H67", test: () => window.topojson }
  ];
  const load = (l) => new Promise((res, rej) => {
    if (l.test()) return res();
    let s = document.querySelector('script[src="' + l.src + '"]');
    if (!s) {
      s = document.createElement("script");
      s.src = l.src; s.integrity = l.integrity; s.crossOrigin = "anonymous";
      document.head.appendChild(s);
    }
    const t = setInterval(() => { if (l.test()) { clearInterval(t); res(); } }, 40);
    setTimeout(() => { clearInterval(t); l.test() ? res() : rej(new Error("lib timeout " + l.src)); }, 12000);
  });

  let cache = null;
  const geo = async () => {
    if (!cache) {
      const topo = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json").then((r) => r.json());
      cache = window.topojson.feature(topo, topo.objects.countries).features;
    }
    return cache;
  };

  // approximate Greater London boundary — the highlighted area for the London stop
  const GREATER_LONDON = {
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: [[
        [-0.510, 51.478], [-0.492, 51.560], [-0.400, 51.618], [-0.290, 51.663],
        [-0.150, 51.691], [-0.010, 51.678], [0.108, 51.652], [0.222, 51.598],
        [0.302, 51.540], [0.330, 51.487], [0.212, 51.424], [0.118, 51.354],
        [-0.010, 51.302], [-0.150, 51.292], [-0.290, 51.320], [-0.420, 51.390],
        [-0.510, 51.478]
      ]]
    }
  };

  const STOPS = [
    { name: "World", lon: -25, lat: 22, k: 140 },
    { name: "London", lon: -0.1247, lat: 51.5142, k: 21000, region: "_london",
      addr: ["71–75 Shelton Street", "Covent Garden", "London WC2H 9JQ"] },
    { name: "Jersey", lon: -2.1105, lat: 49.1835, k: 46000, region: "Jersey",
      addr: ["44 Esplanade", "St Helier", "Jersey JE4 9WG"] },
    { name: "Luxembourg", lon: 6.1296, lat: 49.5936, k: 11000, region: "Luxembourg",
      addr: ["2 Rue Eugène Ruppert", "L-2453 Luxembourg"] }
  ];
  const PINS = STOPS.slice(1);

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  let noiseTile = null;
  const noise = () => {
    if (noiseTile) return noiseTile;
    const N = 160;
    const c = document.createElement("canvas");
    c.width = N; c.height = N;
    const g = c.getContext("2d");
    const img = g.createImageData(N, N);
    for (let i = 0; i < N * N; i++) {
      const v = Math.random();
      img.data[i * 4] = 0; img.data[i * 4 + 1] = 0; img.data[i * 4 + 2] = 0;
      img.data[i * 4 + 3] = v > 0.55 ? Math.round(18 + Math.random() * 32) : 0;
    }
    g.putImageData(img, 0, 0);
    noiseTile = c;
    return c;
  };

  class WorldMap extends HTMLElement {
    connectedCallback() {
      if (this._done) return;
      this._done = true;
      this.style.display = "block";
      this.style.position = "relative";
      this.style.width = "100%";
      if (this.hasAttribute("fill")) this.style.height = "100%";
      else this.style.aspectRatio = this.getAttribute("aspect") || "1 / 1";
      this.render();
    }
    disconnectedCallback() {
      if (this._onScroll) window.removeEventListener("scroll", this._onScroll);
      if (this._onResize) window.removeEventListener("resize", this._onResize);
      if (this._io) this._io.disconnect();
      if (this._loop) cancelAnimationFrame(this._loop);
    }
    progress() {
      const host = this.closest("[data-map-scroll]");
      if (!host) return 0;
      const r = host.getBoundingClientRect();
      const span = r.height - window.innerHeight;
      if (span <= 0) return 0;
      return clamp(-r.top / span, 0, 1);
    }
    view(p) {
      const n = STOPS.length - 1;
      const t = clamp(p, 0, 1) * n;
      const i = Math.min(Math.floor(t), n - 1);
      const raw = t - i;
      const f = ease(clamp((raw - 0.08) / 0.78, 0, 1));
      const a = STOPS[i], b = STOPS[i + 1];
      const c = window.d3.geoInterpolate([a.lon, a.lat], [b.lon, b.lat])(f);
      const k = Math.exp(Math.log(a.k) * (1 - f) + Math.log(b.k) * f);
      return { lon: c[0], lat: c[1], k, focus: f < 0.5 ? i : i + 1 };
    }
    async render() {
      try {
        for (const l of LIBS) await load(l);
        const feats = await geo();
        const d3 = window.d3;
        const ink = this.getAttribute("ink") || "#141414";
        const land = this.getAttribute("land") || "#D2D2CE";
        const sea = this.getAttribute("sea") || "#FFFFFF";
        const blue = this.getAttribute("accent") || "#2C63F0";
        const bRgb = [parseInt(blue.slice(1, 3), 16), parseInt(blue.slice(3, 5), 16), parseInt(blue.slice(5, 7), 16)];

        const byName = {};
        feats.forEach((f) => { if (f.properties && f.properties.name) byName[f.properties.name] = f; });
        PINS.forEach((p) => {
          p.shape = p.region === "_london" ? GREATER_LONDON : byName[p.region] || null;
        });

        const canvas = document.createElement("canvas");
        canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block";
        const ctx = canvas.getContext("2d");
        const layer = document.createElement("canvas");
        const lctx = layer.getContext("2d");

        const labelWrap = document.createElement("div");
        labelWrap.style.cssText = "position:absolute;inset:0;pointer-events:none";
        const labels = PINS.map((c) => {
          const el = document.createElement("div");
          el.style.cssText = "position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;gap:3px;align-items:center;padding:7px 11px 8px;border-radius:6px;background:#F0F0ED;box-shadow:0 1px 0 rgba(20,20,20,.06);opacity:0;transition:opacity 300ms ease,background 300ms ease;white-space:nowrap;font-family:'Saans','Saans Fallback',Helvetica,Arial,sans-serif;color:" + ink;
          const name = document.createElement("div");
          name.textContent = c.name;
          name.style.cssText = "font-size:15.5px;letter-spacing:0;line-height:1";
          const addr = document.createElement("div");
          addr.textContent = (c.addr || []).join(" · ");
          addr.style.cssText = "font-size:12px;letter-spacing:0;line-height:1.25;opacity:0;transition:opacity 300ms ease;color:rgba(20,20,20,.55)";
          el.append(name, addr);
          labelWrap.appendChild(el);
          return { el, addr };
        });

        this.replaceChildren(canvas, labelWrap);

        const proj = d3.geoMercator();
        let w = 0, h = 0, dpr = 1;

        const measure = () => {
          const r = this.getBoundingClientRect();
          const nw = Math.max(1, Math.round(r.width)), nh = Math.max(1, Math.round(r.height));
          dpr = Math.min(2, window.devicePixelRatio || 1);
          STOPS[0].k = nw / 3.4;
          if (nw === w && nh === h) return;
          w = nw; h = nh;
          canvas.width = w * dpr; canvas.height = h * dpr;
          layer.width = w * dpr; layer.height = h * dpr;
          proj.translate([w / 2, h / 2]);
        };

        const pins = PINS.map((c) => ({ c, xy: [-9999, -9999], near: 0, glow: 0 }));
        this._cur = this.progress();

        const paint = () => {
          lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          lctx.clearRect(0, 0, w, h);
          const gp = d3.geoPath(proj, lctx);
          lctx.beginPath();
          feats.forEach((f) => gp(f));
          lctx.fillStyle = land;
          lctx.fill();

          // the focused geography itself turns blue
          pins.forEach((pin) => {
            if (!pin.c.shape || pin.glow < 0.02) return;
            lctx.save();
            lctx.globalAlpha = clamp(pin.glow, 0, 1);
            lctx.beginPath();
            gp(pin.c.shape);
            lctx.fillStyle = blue;
            lctx.fill();
            lctx.globalAlpha = clamp(pin.glow, 0, 1) * 0.5;
            lctx.lineWidth = 1;
            lctx.strokeStyle = blue;
            lctx.stroke();
            lctx.restore();
          });

          lctx.save();
          lctx.globalCompositeOperation = "destination-out";
          const diag = Math.hypot(w, h) / 2;
          const g = lctx.createRadialGradient(w / 2, h / 2, diag * 0.08, w / 2, h / 2, diag);
          g.addColorStop(0, "rgba(0,0,0,0)");
          g.addColorStop(0.62, "rgba(0,0,0,0)");
          g.addColorStop(0.84, "rgba(0,0,0,.28)");
          g.addColorStop(0.95, "rgba(0,0,0,.7)");
          g.addColorStop(1, "rgba(0,0,0,1)");
          lctx.fillStyle = g;
          lctx.fillRect(0, 0, w, h);
          lctx.restore();

          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          if (sea !== "transparent") { ctx.fillStyle = sea; ctx.fillRect(0, 0, w, h); }
          ctx.drawImage(layer, 0, 0, w, h);

          pins.forEach((pin) => {
            const [x, y] = pin.xy;
            if (!isFinite(x) || x < -200 || x > w + 200 || y < -200 || y > h + 200) return;
            const a = clamp(pin.glow, 0, 1);
            const r = 4.5 + 1.5 * a;
            ctx.beginPath();
            ctx.arc(x, y, r + 3, 0, 6.2832);
            ctx.fillStyle = "rgba(255,255,255," + (0.7 + 0.3 * a).toFixed(2) + ")";
            ctx.fill();
            ctx.beginPath();
            ctx.arc(x, y, r, 0, 6.2832);
            ctx.fillStyle = a > 0.35
              ? "rgb(" + bRgb[0] + "," + bRgb[1] + "," + bRgb[2] + ")"
              : "rgba(20,20,20,.55)";
            ctx.fill();
          });
        };

        const frame = () => {
          measure();
          const target = this.progress();
          this._cur += (target - this._cur) * 0.11;
          if (Math.abs(target - this._cur) < 0.0004) this._cur = target;
          const v = this.view(this._cur);
          proj.center([v.lon, v.lat]).scale(v.k);
          pins.forEach((pin, idx) => {
            pin.xy = proj([pin.c.lon, pin.c.lat]) || [-9999, -9999];
            pin.near = clamp(1 - Math.abs(Math.log(v.k / pin.c.k)) / 1.6, 0, 1);
            pin.glow += (pin.near - pin.glow) * 0.14;
            const l = labels[idx];
            l.el.style.left = pin.xy[0] + "px";
            l.el.style.top = (pin.xy[1] - 16) + "px";
            l.el.style.opacity = pin.near > 0.22 ? 1 : 0;
            l.addr.style.opacity = pin.near > 0.72 ? 1 : 0;
          });
          paint();
          this._loop = requestAnimationFrame(frame);
        };

        const start = () => { if (!this._loop) this._loop = requestAnimationFrame(frame); };
        const stop = () => { if (this._loop) { cancelAnimationFrame(this._loop); this._loop = 0; } };
        this._io = new IntersectionObserver((entries) => {
          entries[entries.length - 1].isIntersecting ? start() : stop();
        }, { rootMargin: "20% 0px" });
        this._io.observe(this);
        this._onResize = () => { w = 0; };
        window.addEventListener("resize", this._onResize);
        measure();
        paint();
        start();
      } catch (e) {
        this.replaceChildren();
      }
    }
  }
  if (!customElements.get("world-map")) customElements.define("world-map", WorldMap);
})();
