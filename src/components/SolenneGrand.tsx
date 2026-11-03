import { useEffect, useRef, useState } from "react";
import skyMorning from "@/assets/Pastel_Sunrise_Misty_Sky.png.asset.json";
import skyNight from "@/assets/Misty_Blue_Milky_Way_Night_Sky.png.asset.json";
import hotelMorning from "@/assets/The_Olive_Grand_Hotel_at_Dawn.png.asset.json";
import hotelNight from "@/assets/Dusk_at_The_Olive_Grand_Hotel.png.asset.json";
import room1 from "@/assets/Luxury_Hotel_Room_Overlooking_Misty_Mountains.png.asset.json";
import suite2 from "@/assets/suite_2.jpg.asset.json";
import suite3 from "@/assets/suite_3.jpg.asset.json";
import suite4 from "@/assets/suite_4.jpg.asset.json";

const SINK = 240, RISE = 820, DEPTH = 0.27;
type View = "home" | "rooms" | "reserve";
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

const ROOMS = [
  { name: "Dawn Deluxe Room", line: "Bright, calm and generous at 38 m².", price: "$320", img: room1.url, alt: "Deluxe room with a wide window over misty mountains" },
  { name: "Olive Terrace Suite", line: "Private terrace overlooking the gardens.", price: "$540", img: suite2.url, alt: "Suite lounge opening onto a garden terrace" },
  { name: "Moonlit Executive Suite", line: "Separate lounge, soaking tub and city views.", price: "$780", img: suite3.url, alt: "Executive suite with a moonlit view" },
  { name: "The Solenne Residence", line: "Our presidential suite with butler service.", price: "$1,450", img: suite4.url, alt: "Spacious residence lounge with valley views" },
];

const VERT = `#version 300 es
in vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
const FRAG = `#version 300 es
precision highp float;uniform vec2 R;uniform float T,S,K,P;out vec4 o;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<5;i++){v+=a*n(p);p=m*p+vec2(3.1,1.7);a*=.5;}return v;}
void main(){vec2 uv=gl_FragCoord.xy/R;uv.y=1.-uv.y;float t=T*.05;vec2 q=uv*vec2(R.x/R.y,1.)*2.5;
vec2 w=vec2(fbm(q+vec2(t,0.)),fbm(q+vec2(0.,-t)+5.2));float d=fbm(q+1.8*w+vec2(t*1.5,0.));
float low=smoothstep(.55,1.,uv.y)*(.55+.6*d);
float side=(smoothstep(.2,0.,uv.x)+smoothstep(.8,1.,uv.x))*.2*d*(1.-P);
float wisps=smoothstep(.55,.85,d)*.18*smoothstep(.2,.5,uv.y)*smoothstep(.9,.6,uv.y)*(1.-P);
if(P>.5)low*=smoothstep(.75,1.,uv.y);
float rest=min(1.,low+side+wisps);
float front=1.02-S*.68;float rise=smoothstep(front,front+.18,uv.y+.12*(d-.5));
float haze=S*(.3+.46*d);float a=max(rest,max(rise*.97*S,haze));
vec3 c=mix(mix(vec3(.79,.78,.71),vec3(.97,.93,.84),d),mix(vec3(.15,.19,.29),vec3(.40,.45,.57),d),K);
float g=smoothstep(.42,0.,distance(uv,vec2(.72,.74)))*K*(1.-S)*(1.-P);c=mix(c,vec3(.86,.55,.27),g*.6);a=max(a,g*.35);
o=vec4(c*a,a);}`;

function Logo() {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true">
      {Array.from({ length: 12 }, (_, i) => (
        <path key={i} d="M18.3 3.5h3.4l.9 8.4h-5.2Z" transform={`rotate(${i * 30} 20 20)`} />
      ))}
      <circle cx="20" cy="20" r="6" />
    </svg>
  );
}

export default function SolenneGrand() {
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [view, setView] = useState<View>("home");
  const [night, setNight] = useState(true); // which hotel set is shown
  const [target, setTarget] = useState(true);
  const [menu, setMenu] = useState(false);
  const st = useRef({ k: 1, k0: 1, start: -1, target: true, queued: null as boolean | null, s: 0, view: "home" as View });

  // hash routing
  useEffect(() => {
    const read = () => {
      const h = location.hash.slice(1);
      const v: View = h === "rooms" || h === "reserve" ? h : "home";
      setView(v); st.current.view = v; setMenu(false); window.scrollTo(0, 0);
    };
    read();
    addEventListener("hashchange", read);
    return () => removeEventListener("hashchange", read);
  }, []);

  // clock + fog
  useEffect(() => {
    const el = root.current!, cv = canvas.current!;
    const gl = cv.getContext("webgl2", { premultipliedAlpha: true, alpha: true });
    let prog: WebGLProgram | null = null, U: Record<string, WebGLUniformLocation | null> = {};
    if (gl) {
      const sh = (t: number, s: string) => { const x = gl.createShader(t)!; gl.shaderSource(x, s); gl.compileShader(x); return x; };
      prog = gl.createProgram()!;
      gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog); gl.useProgram(prog);
      const b = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      for (const n of ["R", "T", "S", "K", "P"]) U[n] = gl.getUniformLocation(prog, n);
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    }
    const resize = () => {
      const w = Math.min(960, innerWidth); cv.width = w; cv.height = Math.round(w * innerHeight / innerWidth);
    };
    resize(); addEventListener("resize", resize);
    let raf = 0; const t0 = performance.now();
    const frame = (now: number) => {
      const s = st.current; let y = 0, surge = 0, dip = 0, k = s.k, k2 = s.k;
      if (s.start >= 0) {
        const d = now - s.start, to = s.target ? 1 : 0;
        if (d < SINK) { const x = d / SINK; y = x * x * (3 - 2 * x) * DEPTH; }
        else { setNight(s.target); y = Math.pow(1 - Math.min(1, (d - SINK) / RISE), 3.4) * DEPTH; }
        surge = smooth(0, SINK * 0.92, d) * (1 - smooth(SINK + 70, SINK + RISE * 0.92, d));
        dip = smooth(30, 190, d) * (1 - smooth(330, 720, d));
        k = s.k0 + (to - s.k0) * smooth(120, 520, d);
        k2 = s.k0 + (to - s.k0) * smooth(340, 760, d);
        if (d >= SINK + RISE) {
          s.k = to; s.start = -1; k = k2 = to; y = 0;
          if (s.queued !== null && s.queued !== s.target) { const q = s.queued; s.queued = null; go(q); }
          s.queued = null;
        }
      }
      if (s.view !== "home") y = 0;
      s.s = surge;
      el.style.setProperty("--k", String(k)); el.style.setProperty("--k2", String(k2));
      el.style.setProperty("--dip", String(dip)); el.style.setProperty("--sink", `${y * innerHeight}px`);
      if (gl && prog) {
        gl.viewport(0, 0, cv.width, cv.height); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform2f(U.R, cv.width, cv.height); gl.uniform1f(U.T, (now - t0) / 1000);
        gl.uniform1f(U.S, surge); gl.uniform1f(U.K, k); gl.uniform1f(U.P, s.view === "home" ? 0 : 1);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(raf); removeEventListener("resize", resize); };
  }, []);

  function go(toNight: boolean) {
    const s = st.current;
    setTarget(toNight);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      s.k = toNight ? 1 : 0; s.target = toNight; s.start = -1; setNight(toNight); return;
    }
    s.k0 = s.k; s.target = toNight; s.start = performance.now();
  }
  function choose(toNight: boolean) {
    const s = st.current;
    if (s.start >= 0) { if (toNight !== s.target) s.queued = toNight; return; }
    if (toNight === (s.k === 1)) return;
    go(toNight);
  }

  const links: [View, string][] = [["home", "Home"], ["rooms", "Rooms & Suites"], ["reserve", "Reserve"]];

  return (
    <div ref={root} className="sg">
      <div className="sky" aria-hidden="true">
        <img src={skyMorning.url} alt="" />
        <img className="night" src={skyNight.url} alt="" />
      </div>
      <canvas id="fog" ref={canvas} aria-hidden="true" />

      <div className="ui">
        <nav className="navbar" aria-label="Main">
          <a href="#home" className="logo"><Logo /> Solenne Grand</a>
          <div className="links">
            {links.map(([v, l]) => <a key={v} href={`#${v}`} aria-current={view === v ? "page" : undefined}>{l}</a>)}
          </div>
          <a href="#reserve" className="cta">Book Your Stay</a>
          <button className="menu-btn" onClick={() => setMenu(true)} aria-label="Open menu">Menu</button>
        </nav>
        {menu && (
          <div className="mobile-menu" role="dialog" aria-label="Menu">
            <button onClick={() => setMenu(false)} aria-label="Close menu">Close</button>
            {links.map(([v, l]) => <a key={v} href={`#${v}`}>{l}</a>)}
          </div>
        )}

        <main>
          {view === "home" && <Home night={night} target={target} choose={choose} />}
          {view !== "home" && (
            <div style={{ position: "fixed", bottom: 20, left: 0, right: 0, zIndex: 4, display: "flex", justifyContent: "center", padding: "0 16px" }}>
              <Toggle target={target} choose={choose} compact />
            </div>
          )}
          {view === "rooms" && <Rooms />}
          {view === "reserve" && <Reserve />}
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Toggle({ target, choose, compact }: { target: boolean; choose: (n: boolean) => void; compact?: boolean }) {
  return (
    <div className="toggle" role="group" aria-label="Time of day" style={compact ? { height: 64 } : undefined}>
      <button className="tog-morning" aria-pressed={!target} onClick={() => choose(false)}>
        <span><b>Morning</b></span><span><small>Breakfast on the Terrace</small></span>
      </button>
      <button className="tog-night" aria-pressed={target} onClick={() => choose(true)}>
        <span><b>Night</b></span><span><small>Dinner by Candlelight</small></span>
      </button>
    </div>
  );
}

function Home({ night, target, choose }: { night: boolean; target: boolean; choose: (n: boolean) => void }) {
  return (
    <>
      <section className="hero" aria-label="Welcome">
        <div className="hero-clip" style={{ position: "fixed", zIndex: -1 }} aria-hidden="true">
          <div className="home">
            <img className={night ? "" : "is-on"} src={hotelMorning.url} alt="Solenne Grand at dawn" />
            <img className={night ? "is-on" : ""} src={hotelNight.url} alt="Solenne Grand lit at dusk" />
          </div>
          <div className="tilt" style={{ position: "absolute" }} />
        </div>
        <h1 className="headline serif">
          Where Every Stay<br />
          <span className="m">Feels Like</span> Home
        </h1>
        <div className="bottom">
          <Toggle target={target} choose={choose} />
          <p className="caption">Five-star comfort, spa and fine dining, wrapped in morning light and quiet nights.</p>
        </div>
      </section>
      <section className="wrap">
        <div className="panel card" style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}>
          <h2 className="serif">Welcome to Solenne Grand</h2>
          <p>Nestled between olive gardens and open sky, Solenne Grand is a five-star retreat where quiet luxury meets warm hospitality. From sunrise breakfasts to candlelit dinners, every hour here is designed to be savoured.</p>
        </div>
      </section>
      <section className="wrap" aria-label="Highlights">
        <div className="grid3">
          {[["Still Water Spa", "Massage, hydrotherapy and a heated stone pool."], ["Ember Table", "Seasonal tasting menus by our award-winning chef."], ["Skyline Pool & Lounge", "Rooftop pool with sunset cocktails."]].map(([t, d]) => (
            <div key={t} className="panel card"><h3>{t}</h3><p>{d}</p></div>
          ))}
        </div>
      </section>
      <section className="wrap" aria-label="Guest reviews">
        <div className="grid3">
          {[["The most peaceful stay of my life.", "Aanya R."], ["Breakfast on the terrace was unforgettable.", "Daniel M."], ["Dinner by candlelight, perfect service.", "Priya & Arjun"]].map(([q, a]) => (
            <figure key={a} className="panel card">
              <blockquote className="serif" style={{ fontSize: 26, lineHeight: 1.25 }}>“{q}”</blockquote>
              <figcaption className="acc" style={{ marginTop: 12 }}>{a}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </>
  );
}

function Rooms() {
  return (
    <section className="wrap" style={{ paddingBottom: 140 }}>
      <div className="panel card" style={{ textAlign: "center", marginBottom: 28 }}>
        <h1 className="serif" style={{ fontSize: "clamp(36px,4vw,60px)" }}>Rooms &amp; Suites</h1>
        <p>Four ways to stay, each with a view worth waking up for.</p>
      </div>
      <div className="grid2">
        {ROOMS.map((r) => (
          <article key={r.name} className="panel room">
            <img src={r.img} alt={r.alt} loading="lazy" />
            <div className="body">
              <h3 className="serif" style={{ fontSize: 30 }}>{r.name}</h3>
              <p>{r.line}</p>
              <div className="row">
                <span><span className="acc" style={{ fontWeight: 600 }}>From {r.price}</span> <span className="soft">/ night</span></span>
                <a href="#reserve" className="cta">Reserve</a>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function Reserve() {
  const [f, setF] = useState({ name: "", email: "", in: "", out: "", guests: "2", room: ROOMS[0].name, notes: "" });
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });
  const submit = () => {
    if (!f.name.trim()) return setMsg({ ok: false, t: "Please enter your name." });
    if (!/^\S+@\S+\.\S+$/.test(f.email)) return setMsg({ ok: false, t: "Please enter a valid email." });
    if (!f.in || !f.out) return setMsg({ ok: false, t: "Please choose check-in and check-out dates." });
    if (f.out <= f.in) return setMsg({ ok: false, t: "Check-out must be after check-in." });
    setMsg({ ok: true, t: "Thank you, we'll confirm your stay shortly." });
  };
  return (
    <section className="wrap" style={{ paddingBottom: 140 }}>
      <h1 className="serif" style={{ fontSize: "clamp(36px,4vw,60px)", textAlign: "center", marginBottom: 24 }}>Plan Your Stay</h1>
      <div className="grid2" style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr)" }}>
        <div className="panel card">
          <div className="fields">
            <label>Name<input value={f.name} onChange={set("name")} autoComplete="name" /></label>
            <label>Email<input type="email" value={f.email} onChange={set("email")} autoComplete="email" /></label>
            <label>Check-in<input type="date" value={f.in} onChange={set("in")} /></label>
            <label>Check-out<input type="date" value={f.out} onChange={set("out")} /></label>
            <label>Guests<input type="number" min={1} max={8} value={f.guests} onChange={set("guests")} /></label>
            <label>Room type<select value={f.room} onChange={set("room")}>{ROOMS.map((r) => <option key={r.name}>{r.name}</option>)}</select></label>
            <label className="full">Special requests<textarea rows={3} value={f.notes} onChange={set("notes")} /></label>
            <div className="full"><button className="cta" onClick={submit}>Request Reservation</button></div>
            {msg && <p className="full" role="status" style={{ color: msg.ok ? "var(--acc)" : "var(--ink)", fontWeight: 600 }}>{msg.t}</p>}
          </div>
        </div>
        <aside className="panel card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <h3>Contact</h3>
          <p>Solenne Grand, 12 Garden Crest Road</p>
          <p>+1 (555) 014-2200</p>
          <p>stay@solennegrand.com</p>
          <p>Check-in 3 PM · Check-out 11 AM</p>
        </aside>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="panel" style={{ borderRadius: 0, borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
      <div className="wrap" style={{ display: "flex", flexWrap: "wrap", gap: 24, justifyContent: "space-between", alignItems: "center", paddingBottom: 110 }}>
        <a href="#home" className="logo"><Logo /> Solenne Grand</a>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="#home" className="soft">Home</a><a href="#rooms" className="soft">Rooms &amp; Suites</a><a href="#reserve" className="soft">Reserve</a>
        </div>
        <div className="soft" style={{ fontSize: 14 }}>
          12 Garden Crest Road · +1 (555) 014-2200<br />© 2026 Solenne Grand
        </div>
      </div>
    </footer>
  );
}
