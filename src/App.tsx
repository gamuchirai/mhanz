import React, { useState, useEffect } from "react";

export default function App() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeNav, setActiveNav] = useState("Home");
  const [likedTracks, setLikedTracks] = useState<Record<string, boolean>>({
    Perfect: true,
    "Dusk Till Dawn": false,
    "Better With You": false,
    "Golden Hour": false,
  });

  const toggleLike = (title: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setLikedTracks((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  useEffect(() => {
    async function testBackend() {
      try {
        const { invoke } = await import("@tauri-apps/api/core");
        await invoke<string>("greet", { name: "Music Lover" });
      } catch {
        // Runs cleanly in browser preview mode
      }
    }
    testBackend();
  }, []);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        boxSizing: "border-box",
        display: "grid",
        gridTemplateColumns: "232px 1fr",
        gridTemplateRows: "1fr 96px",
        background: "#0b0706",
        color: "var(--t)",
        fontFamily: "'Outfit', system-ui, sans-serif",
        fontSize: "14px",
        overflow: "hidden",
      }}
    >
      {/* SVG Icon Symbols definition from demo-ui */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <defs>
          <symbol id="home" viewBox="0 0 24 24">
            <path d="M4 11l8-7 8 7v9a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z" />
          </symbol>
          <symbol id="search" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="6.5" />
            <path d="M16 16l4.5 4.5" />
          </symbol>
          <symbol id="lib" viewBox="0 0 24 24">
            <path d="M5 4v16M10 4v16M15 5l4 15" />
          </symbol>
          <symbol id="heart" viewBox="0 0 24 24">
            <path d="M12 20c-6-4-8-7-8-10a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 10c0 3-2 6-8 10z" />
          </symbol>
          <symbol id="list" viewBox="0 0 24 24">
            <path d="M4 7h10M4 12h10M4 17h5M18 16V6l3 1" />
            <circle cx="16.5" cy="16.5" r="1.8" />
          </symbol>
          <symbol id="disc" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <circle cx="12" cy="12" r="2.5" />
          </symbol>
          <symbol id="user" viewBox="0 0 24 24">
            <circle cx="12" cy="8.5" r="3.5" />
            <path d="M5 20c0-4 3-6 7-6s7 2 7 6" />
          </symbol>
          <symbol id="play" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M7 4.5l13 7.500-13 7.500z" />
          </symbol>
          <symbol id="pause" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M6 4h4.500v16H6zM13.500 4H18v16h-4.500z" />
          </symbol>
          <symbol id="prev" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M6 5h2v14H6zM20 5v14L9 12z" />
          </symbol>
          <symbol id="next" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M16 5h2v14h-2zM4 5l11 7L4 19z" />
          </symbol>
          <symbol id="shuffle" viewBox="0 0 24 24">
            <path d="M4 7h3c6 0 4 10 10 10h3M4 17h3c1.5 0 2.500-.7 3.300-1.700M14 8.700C14.800 7.700 15.800 7 17 7h3M17 4l3 3-3 3M17 14l3 3-3 3" />
          </symbol>
          <symbol id="repeat" viewBox="0 0 24 24">
            <path d="M17 3l3 3-3 3M4 11V9a3 3 0 0 1 3-3h13M7 21l-3-3 3-3M20 13v2a3 3 0 0 1-3 3H4" />
          </symbol>
          <symbol id="vol" viewBox="0 0 24 24">
            <path d="M4 9.500v5h3.500l4.500 4v-13l-4.500 4zM15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11" />
          </symbol>
          <symbol id="bell" viewBox="0 0 24 24">
            <path d="M6 16v-5a6 6 0 0 1 12 0v5l1.500 2h-15zM10 21h4" />
          </symbol>
          <symbol id="spark" viewBox="0 0 24 24">
            <path d="M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800zM19 16l.8 2.200L22 19l-2.200.8L19 22l-.8-2.200L16 19l2.200-.8z" />
          </symbol>
          <symbol id="star" viewBox="0 0 24 24">
            <path fill="currentColor" stroke="none" d="M12 2c.5 5.500 2.500 8.500 8 10-5.500 1.500-7.500 4.500-8 10-.5-5.500-2.500-8.500-8-10 5.500-1.500 7.500-4.500 8-10z" />
          </symbol>
          <symbol id="cl" viewBox="0 0 24 24">
            <path d="M15 5l-7 7 7 7" />
          </symbol>
          <symbol id="cr" viewBox="0 0 24 24">
            <path d="M9 5l7 7-7 7" />
          </symbol>
          <symbol id="cd" viewBox="0 0 24 24">
            <path d="M6 9l6 6 6-6" />
          </symbol>
          <symbol id="plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </symbol>
          <symbol id="dots" viewBox="0 0 24 24">
            <circle fill="currentColor" cx="5" cy="12" r="1.4" />
            <circle fill="currentColor" cx="12" cy="12" r="1.4" />
            <circle fill="currentColor" cx="19" cy="12" r="1.4" />
          </symbol>
        </defs>
      </svg>

      {/* Sidebar */}
      <aside
        style={{
          gridColumn: 1,
          gridRow: "1 / span 2",
          background: "#0b0706",
          borderRight: "1px solid rgba(255,255,255,.05)",
          padding: "28px 16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "6px",
            marginBottom: "28px",
            color: "var(--t)",
          }}
        >
          <svg className="i" width="22" height="22" aria-hidden="true">
            <use href="#star" />
          </svg>
          <span style={{ fontWeight: 300, fontSize: "16px", letterSpacing: ".34em", paddingLeft: ".34em" }}>
            MIDNIGHT
          </span>
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--m)" }}>
          {[
            { id: "Home", icon: "#home" },
            { id: "Search", icon: "#search" },
            { id: "Your Library", icon: "#lib" },
            { id: "Liked Songs", icon: "#heart" },
            { id: "Playlists", icon: "#list" },
            { id: "Albums", icon: "#disc" },
            { id: "Artists", icon: "#user" },
          ].map((item) => {
            const isActive = activeNav === item.id;
            return (
              <a
                key={item.id}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveNav(item.id);
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "11px 14px",
                  borderRadius: "10px",
                  background: isActive ? "linear-gradient(90deg,rgba(240,169,130,.22),rgba(240,169,130,.06))" : "none",
                  color: isActive ? "var(--t)" : "var(--m)",
                  cursor: "pointer",
                }}
              >
                <svg className="i" width="18" height="18" aria-hidden="true">
                  <use href={item.icon} />
                </svg>
                {item.id}
              </a>
            );
          })}
        </nav>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            margin: "34px 14px 10px",
            color: "var(--m)",
            fontSize: "11px",
            letterSpacing: ".14em",
          }}
        >
          <span>YOUR PLAYLISTS</span>
          <button
            aria-label="New playlist"
            style={{ background: "none", border: 0, padding: 0, color: "var(--m)", display: "grid", cursor: "pointer" }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#plus" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--t)" }}>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}>
            <span style={{ width: "36px", height: "36px", borderRadius: "6px", background: "linear-gradient(180deg,#12141e,#2b2230 62%,#5a3630)", flexShrink: 0 }} />
            Late Night Drive
          </a>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}>
            <span style={{ width: "36px", height: "36px", borderRadius: "6px", background: "linear-gradient(160deg,#3a2c26,#15100e)", flexShrink: 0 }} />
            Acoustic Mornings
          </a>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}>
            <span style={{ width: "36px", height: "36px", borderRadius: "6px", background: "linear-gradient(180deg,#2a2a30,#121216)", flexShrink: 0 }} />
            Heartbreak Diaries
          </a>
          <a href="#" style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}>
            <span style={{ width: "36px", height: "36px", borderRadius: "6px", background: "linear-gradient(180deg,#4b2d4d,#dc7650 64%,#190d0b 65%)", flexShrink: 0 }} />
            Good Vibes
          </a>
        </div>

        <a
          href="#"
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderTop: "1px solid var(--l)",
          }}
        >
          <span style={{ width: "36px", height: "36px", borderRadius: "50%", background: "linear-gradient(160deg,#6b5548,#241a16)", flexShrink: 0 }} />
          <span style={{ flex: 1 }}>madebyadah</span>
          <svg className="i" width="16" height="16" style={{ color: "var(--m)" }} aria-hidden="true">
            <use href="#cd" />
          </svg>
        </a>
      </aside>

      {/* Main View Area */}
      <main
        style={{
          gridColumn: 2,
          gridRow: 1,
          minWidth: 0,
          overflowY: "auto",
          overflowX: "hidden",
          padding: "24px 32px 8px",
          display: "flex",
          flexDirection: "column",
          gap: "30px",
          background: "radial-gradient(900px 420px at 72% 0,rgba(214,122,84,.14),transparent 70%),#110c0a",
        }}
      >
        {/* Header */}
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px" }}>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              aria-label="Back"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--l)",
                background: "var(--p)",
                color: "var(--t)",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <svg className="i" width="18" height="18" aria-hidden="true">
                <use href="#cl" />
              </svg>
            </button>
            <button
              aria-label="Forward"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--l)",
                background: "var(--p)",
                color: "var(--t)",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <svg className="i" width="18" height="18" aria-hidden="true">
                <use href="#cr" />
              </svg>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                width: "340px",
                height: "42px",
                boxSizing: "border-box",
                padding: "0 16px",
                borderRadius: "21px",
                border: "1px solid var(--l)",
                background: "var(--p)",
                color: "var(--m)",
              }}
            >
              <svg className="i" width="17" height="17" aria-hidden="true">
                <use href="#search" />
              </svg>
              <input
                placeholder="Search songs, artists, playlists..."
                aria-label="Search songs, artists, playlists"
                style={{
                  flex: 1,
                  minWidth: 0,
                  background: "none",
                  border: 0,
                  outline: 0,
                  color: "var(--t)",
                  font: "inherit",
                  fontSize: "13px",
                }}
              />
            </label>
            <button
              aria-label="Notifications"
              style={{ background: "none", border: 0, padding: "8px", color: "var(--t)", display: "grid", cursor: "pointer" }}
            >
              <svg className="i" width="20" height="20" aria-hidden="true">
                <use href="#bell" />
              </svg>
            </button>
            <button
              aria-label="Ask for a recommendation"
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "50%",
                border: "1px solid var(--accent)",
                background: "rgba(240,169,130,.1)",
                color: "var(--accent)",
                display: "grid",
                placeItems: "center",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <svg className="i" width="18" height="18" aria-hidden="true">
                <use href="#spark" />
              </svg>
            </button>
          </div>
        </header>

        {/* Hero Section */}
        <section style={{ position: "relative", display: "grid", gridTemplateColumns: "276px 1fr", gap: "40px", alignItems: "center" }}>
          {/* Vinyl Disc Background Effect */}
          <div
            style={{
              position: "absolute",
              right: "-150px",
              top: "-30px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "conic-gradient(from 210deg,rgba(255,255,255,.1),transparent 22%,rgba(255,255,255,.06) 50%,transparent 74%,rgba(255,255,255,.1)),repeating-radial-gradient(circle,#0a0706 0 3px,#1b1512 4px 5px)",
              boxShadow: "0 0 0 1px rgba(255,255,255,.04)",
              pointerEvents: "none",
            }}
            aria-hidden="true"
          />

          {/* Album Artwork with Silhouette SVG */}
          <div
            style={{
              position: "relative",
              width: "276px",
              height: "276px",
              borderRadius: "14px",
              overflow: "hidden",
              background: "linear-gradient(180deg,#2f2742 0%,#8a4560 36%,#e0714f 62%,#f4a86a 70%,#150c0a 71%)",
              boxShadow: "0 24px 60px rgba(0,0,0,.55)",
            }}
          >
            <svg
              viewBox="0 0 276 276"
              width="276"
              height="276"
              role="img"
              aria-label="Couple silhouetted on a hill at sunset under a crescent moon"
            >
              <circle cx="205" cy="52" r="11" fill="#f6e3cf" />
              <circle cx="210" cy="48" r="10" fill="#47304f" />
              <path d="M0 205C60 188 120 182 276 202V276H0z" fill="#0f0807" />
              <g fill="#0b0605">
                <path d="M118 196c0-14 6-24 14-24s14 10 14 24z" />
                <circle cx="132" cy="162" r="8" />
                <path d="M150 198c0-12 5-20 12-20s12 8 12 20z" />
                <circle cx="162" cy="170" r="7" />
              </g>
              <g fill="#f2b36b" opacity=".85">
                <circle cx="24" cy="238" r="1.5" />
                <circle cx="48" cy="230" r="1.5" />
                <circle cx="74" cy="242" r="1.5" />
                <circle cx="212" cy="236" r="1.5" />
                <circle cx="238" cy="228" r="1.5" />
                <circle cx="256" cy="244" r="1.5" />
              </g>
            </svg>
          </div>

          {/* Details */}
          <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 }}>
            <div style={{ fontSize: "11px", letterSpacing: ".26em", color: "#e0916c" }}>NOW PLAYING</div>
            <h1
              style={{
                margin: 0,
                fontFamily: "'Cormorant Garamond', Georgia, serif",
                fontWeight: 500,
                fontSize: "104px",
                lineHeight: 1,
                letterSpacing: "-.01em",
              }}
            >
              Perfect
            </h1>
            <div style={{ fontFamily: "'Pinyon Script', cursive", fontSize: "46px", lineHeight: 1.1, color: "#e8d7ca" }}>
              Aiden Vale
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--m)", fontSize: "13px", marginTop: "8px" }}>
              <svg className="i" width="14" height="14" aria-hidden="true" style={{ color: likedTracks["Perfect"] ? "var(--accent)" : "currentColor", fill: likedTracks["Perfect"] ? "var(--accent)" : "none" }}>
                <use href="#heart" />
              </svg>
              4.8M<span aria-hidden="true">•</span>Indie Pop
            </div>
            <p style={{ margin: "4px 0 16px", color: "#c9bbb0", fontSize: "14px" }}>
              Every moment with you feels like the perfect song.
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                style={{
                  height: "46px",
                  padding: "0 32px",
                  borderRadius: "23px",
                  border: 0,
                  background: "var(--accent)",
                  color: "#1c0f09",
                  font: "600 15px 'Outfit', system-ui, sans-serif",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  cursor: "pointer",
                }}
              >
                <svg className="i" width="14" height="14" aria-hidden="true">
                  <use href={isPlaying ? "#pause" : "#play"} />
                </svg>
                {isPlaying ? "Pause" : "Play"}
              </button>
              <button
                onClick={() => toggleLike("Perfect")}
                aria-label="Like Perfect"
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "none",
                  color: likedTracks["Perfect"] ? "var(--accent)" : "var(--t)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <svg className="i" width="18" height="18" aria-hidden="true" style={{ fill: likedTracks["Perfect"] ? "var(--accent)" : "none" }}>
                  <use href="#heart" />
                </svg>
              </button>
              <button
                aria-label="More options"
                style={{
                  width: "46px",
                  height: "46px",
                  borderRadius: "50%",
                  border: "1px solid rgba(255,255,255,.18)",
                  background: "none",
                  color: "var(--t)",
                  display: "grid",
                  placeItems: "center",
                  padding: 0,
                  cursor: "pointer",
                }}
              >
                <svg className="i" width="18" height="18" aria-hidden="true">
                  <use href="#dots" />
                </svg>
              </button>
            </div>
          </div>

          {/* Waveform graphic */}
          <svg
            viewBox="0 0 180 28"
            width="180"
            height="28"
            style={{
              position: "absolute",
              right: 0,
              bottom: "6px",
              stroke: "var(--accent)",
              strokeWidth: 2,
              strokeLinecap: "round",
              opacity: 0.85,
            }}
            aria-hidden="true"
          >
            <path d="M3 28V14M9 28V10M15 28V18M21 28V6M27 28V12M33 28V16M39 28V8M45 28V20M51 28V11M57 28V5M63 28V15M69 28V9M75 28V19M81 28V7M87 28V13M93 28V17M99 28V4M105 28V12M111 28V18M117 28V8M123 28V14M129 28V10M135 28V6M141 28V16M147 28V11M153 28V19M159 28V7M165 28V13M171 28V9M177 28V15" />
          </svg>
        </section>

        {/* Section: Made for you */}
        <section>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "14px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 500 }}>Made for you</h2>
            <a href="#" style={{ color: "var(--m)", fontSize: "13px" }}>See all</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
            {[
              {
                title: "Late Night Drive",
                desc: "Chill songs for city nights",
                bg: "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#12141e,#2b2230 62%,#5a3630)",
              },
              {
                title: "Falling in Love",
                desc: "Songs that hit different",
                bg: "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#4a3350,#c4655a 58%,#1b100d 59%)",
              },
              {
                title: "Acoustic Mornings",
                desc: "Soft, calm and beautiful",
                bg: "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(160deg,#3a2c26,#15100e)",
              },
              {
                title: "Midnight Memories",
                desc: "Nostalgic tunes for the soul",
                bg: "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#171a26,#3a2a34 65%,#6b4034)",
              },
              {
                title: "Good Vibes",
                desc: "Feel good playlist",
                bg: "linear-gradient(180deg,rgba(8,5,4,0) 30%,rgba(8,5,4,.9)),linear-gradient(180deg,#4b2d4d,#dc7650 64%,#190d0b 65%)",
              },
            ].map((card, i) => (
              <a
                key={i}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setIsPlaying(true);
                }}
                style={{
                  position: "relative",
                  height: "150px",
                  borderRadius: "14px",
                  overflow: "hidden",
                  background: card.bg,
                  display: "block",
                }}
              >
                <div style={{ position: "absolute", left: "14px", bottom: "12px", right: "52px" }}>
                  <div style={{ fontWeight: 500, fontSize: "14px", lineHeight: 1.2 }}>{card.title}</div>
                  <div style={{ fontSize: "11px", color: "#c9bbb0", marginTop: "3px" }}>{card.desc}</div>
                </div>
                <span
                  style={{
                    position: "absolute",
                    right: "12px",
                    bottom: "12px",
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    background: "var(--t)",
                    color: "#1a110d",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <svg className="i" width="13" height="13" aria-hidden="true">
                    <use href="#play" />
                  </svg>
                </span>
              </a>
            ))}
          </div>
        </section>

        {/* Section: Recently played and Popular tracks */}
        <section style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: "48px" }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ margin: "0 0 14px", fontSize: "18px", fontWeight: 500 }}>Recently played</h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "16px" }}>
              {[
                { title: "Dusk Till Dawn", artist: "Aiden Vale", bg: "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)" },
                { title: "Golden Hour", artist: "Hollow Coves", bg: "linear-gradient(180deg,#4a3350,#c4655a 58%,#1b100d 59%)" },
                { title: "Someone Like You", artist: "Adele", bg: "linear-gradient(180deg,#2a2a30,#121216)" },
                { title: "It Will Be Okay", artist: "Tom Odell", bg: "linear-gradient(180deg,#25201f,#0f0c0c)" },
                { title: "Everything I Wanted", artist: "Billie Eilish", bg: "linear-gradient(180deg,#3a2c2c,#171010)" },
              ].map((album, idx) => (
                <a key={idx} href="#" style={{ display: "block", minWidth: 0 }} onClick={(e) => e.preventDefault()}>
                  <div style={{ aspectRatio: 1, borderRadius: "10px", background: album.bg }} />
                  <div style={{ marginTop: "8px", fontSize: "13px", fontWeight: 500 }}>{album.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--m)" }}>{album.artist}</div>
                </a>
              ))}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
              <h2 style={{ margin: 0, fontSize: "16px", fontWeight: 500 }}>Popular tracks</h2>
              <a href="#" style={{ color: "var(--m)", fontSize: "13px" }}>See all</a>
            </div>
            {[
              { num: "01", title: "Dusk Till Dawn", artist: "Aiden Vale", duration: "3:45", bg: "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)" },
              { num: "02", title: "Perfect", artist: "Aiden Vale", duration: "4:12", bg: "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)" },
              { num: "03", title: "Better With You", artist: "Aiden Vale", duration: "3:28", bg: "linear-gradient(180deg,#4b2d4d,#dc7650 64%,#190d0b 65%)" },
              { num: "04", title: "Golden Hour", artist: "Hollow Coves", duration: "3:36", bg: "linear-gradient(180deg,#4a3350,#c4655a 58%,#1b100d 59%)" },
            ].map((track) => (
              <div
                key={track.num}
                style={{
                  display: "grid",
                  gridTemplateColumns: "22px 40px 1fr auto 36px",
                  alignItems: "center",
                  gap: "14px",
                  padding: "8px 0",
                }}
              >
                <span style={{ color: "var(--m)", fontSize: "12px" }}>{track.num}</span>
                <div style={{ width: "40px", height: "40px", borderRadius: "6px", background: track.bg, flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: "14px", fontWeight: 500 }}>{track.title}</div>
                  <div style={{ fontSize: "12px", color: "var(--m)" }}>{track.artist}</div>
                </div>
                <span style={{ fontSize: "13px", color: "var(--m)" }}>{track.duration}</span>
                <button
                  aria-label={`Like ${track.title}`}
                  onClick={(e) => toggleLike(track.title, e)}
                  style={{
                    background: "none",
                    border: 0,
                    padding: "8px",
                    color: likedTracks[track.title] ? "var(--accent)" : "var(--m)",
                    display: "grid",
                    cursor: "pointer",
                  }}
                >
                  <svg className="i" width="16" height="16" aria-hidden="true" style={{ fill: likedTracks[track.title] ? "var(--accent)" : "none" }}>
                    <use href="#heart" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Floating Player Bar (Footer) */}
      <footer
        style={{
          gridColumn: 2,
          gridRow: 2,
          margin: "0 32px 20px",
          padding: "0 24px",
          borderRadius: "16px",
          border: "1px solid var(--l)",
          background: "var(--p)",
          display: "grid",
          gridTemplateColumns: "1fr auto 1.4fr",
          alignItems: "center",
          gap: "24px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px", minWidth: 0 }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "8px",
              flex: "none",
              background: "linear-gradient(180deg,#2f2742,#a24f5a 50%,#e8955f 68%,#160d0a 69%)",
            }}
          />
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: "14px", fontWeight: 500 }}>Perfect</div>
            <div style={{ fontSize: "12px", color: "var(--m)" }}>Aiden Vale</div>
          </div>
          <button
            aria-label="Like Perfect"
            onClick={() => toggleLike("Perfect")}
            style={{
              background: "none",
              border: 0,
              padding: "8px",
              color: likedTracks["Perfect"] ? "var(--accent)" : "var(--m)",
              display: "grid",
              cursor: "pointer",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true" style={{ fill: likedTracks["Perfect"] ? "var(--accent)" : "none" }}>
              <use href="#heart" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "22px", color: "var(--m)" }}>
          <button aria-label="Shuffle" style={{ background: "none", border: 0, padding: "8px", color: "inherit", display: "grid", cursor: "pointer" }}>
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#shuffle" />
            </svg>
          </button>
          <button aria-label="Previous track" style={{ background: "none", border: 0, padding: "8px", color: "var(--t)", display: "grid", cursor: "pointer" }}>
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#prev" />
            </svg>
          </button>
          <button
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "50%",
              border: 0,
              background: "#f1d3bf",
              color: "#1c0f09",
              display: "grid",
              placeItems: "center",
              padding: 0,
              cursor: "pointer",
            }}
          >
            <svg className="i" width="22" height="22" aria-hidden="true">
              <use href={isPlaying ? "#pause" : "#play"} />
            </svg>
          </button>
          <button aria-label="Next track" style={{ background: "none", border: 0, padding: "8px", color: "var(--t)", display: "grid", cursor: "pointer" }}>
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#next" />
            </svg>
          </button>
          <button aria-label="Repeat" style={{ background: "none", border: 0, padding: "8px", color: "inherit", display: "grid", cursor: "pointer" }}>
            <svg className="i" width="18" height="18" aria-hidden="true">
              <use href="#repeat" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "12px", color: "var(--m)", fontSize: "12px" }}>
          <span>1:47</span>
          <div
            role="progressbar"
            aria-label="Track progress"
            aria-valuemin={0}
            aria-valuemax={252}
            aria-valuenow={107}
            style={{ width: "260px", height: "3px", borderRadius: "2px", background: "#3a2f2a" }}
          >
            <div style={{ width: "42%", height: "100%", borderRadius: "2px", background: "var(--accent)" }} />
          </div>
          <span>4:12</span>
          <svg className="i" width="18" height="18" style={{ marginLeft: "6px" }} aria-hidden="true">
            <use href="#vol" />
          </svg>
        </div>
      </footer>
    </div>
  );
}
