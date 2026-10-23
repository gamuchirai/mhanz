import { useState, useEffect } from "react";
import { Home } from "./pages/Home";
import { Search } from "./pages/Search";
import { Library } from "./pages/Library";
import { PlayerFooter } from "./components/player/PlayerFooter";

export function App() {
  const [activeNav, setActiveNav] = useState("Home");

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
      {/* SVG Icon Symbols definition */}
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
            <path
              fill="currentColor"
              stroke="none"
              d="M12 2c.5 5.500 2.500 8.500 8 10-5.500 1.500-7.500 4.500-8 10-.5-5.500-2.500-8.500-8-10 5.500-1.500 7.500-4.500 8-10z"
            />
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

      {/* Sidebar Navigation */}
      <aside
        role="navigation"
        aria-label="Main sidebar"
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
          <span
            style={{
              fontWeight: 300,
              fontSize: "16px",
              letterSpacing: ".34em",
              paddingLeft: ".34em",
            }}
          >
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
                  background: isActive
                    ? "linear-gradient(90deg,rgba(240,169,130,.22),rgba(240,169,130,.06))"
                    : "none",
                  color: isActive ? "var(--t)" : "var(--m)",
                  cursor: "pointer",
                  transition: "background 0.15s ease, color 0.15s ease",
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
            style={{
              background: "none",
              border: 0,
              padding: 0,
              color: "var(--m)",
              display: "grid",
              cursor: "pointer",
            }}
          >
            <svg className="i" width="16" height="16" aria-hidden="true">
              <use href="#plus" />
            </svg>
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "4px", color: "var(--t)" }}>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "linear-gradient(180deg,#12141e,#2b2230 62%,#5a3630)",
                flexShrink: 0,
              }}
            />
            Late Night Drive
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "linear-gradient(160deg,#3a2c26,#15100e)",
                flexShrink: 0,
              }}
            />
            Acoustic Mornings
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "linear-gradient(180deg,#2a2a30,#121216)",
                flexShrink: 0,
              }}
            />
            Heartbreak Diaries
          </a>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{ display: "flex", alignItems: "center", gap: "12px", padding: "6px 14px" }}
          >
            <span
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "6px",
                background: "linear-gradient(180deg,#4b2d4d,#dc7650 64%,#190d0b 65%)",
                flexShrink: 0,
              }}
            />
            Good Vibes
          </a>
        </div>

        <a
          href="#"
          onClick={(e) => e.preventDefault()}
          style={{
            marginTop: "auto",
            display: "flex",
            alignItems: "center",
            gap: "12px",
            padding: "10px 14px",
            borderTop: "1px solid var(--l)",
          }}
        >
          <span
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              background: "linear-gradient(160deg,#6b5548,#241a16)",
              flexShrink: 0,
            }}
          />
          <span style={{ flex: 1 }}>madebyadah</span>
          <svg
            className="i"
            width="16"
            height="16"
            style={{ color: "var(--m)" }}
            aria-hidden="true"
          >
            <use href="#cd" />
          </svg>
        </a>
      </aside>

      {/* Main Container */}
      {activeNav === "Home" ? (
        <Home onNavigate={setActiveNav} />
      ) : activeNav === "Search" ? (
        <Search />
      ) : activeNav === "Your Library" ? (
        <Library />
      ) : (
        <main
          role="main"
          style={{
            gridColumn: 2,
            gridRow: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "#110c0a",
            color: "var(--m)",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "rgba(240,169,130,0.1)",
              color: "var(--accent)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <svg className="i" width="28" height="28" aria-hidden="true">
              <use href="#disc" />
            </svg>
          </div>
          <h2 style={{ fontSize: "20px", color: "var(--t)", margin: 0 }}>{activeNav}</h2>
          <p style={{ margin: 0, fontSize: "14px", maxWidth: "340px", textAlign: "center" }}>
            This view is queued in the upcoming scope slice.
          </p>
          <button
            onClick={() => setActiveNav("Home")}
            style={{
              padding: "10px 20px",
              borderRadius: "20px",
              background: "var(--accent)",
              color: "#1c0f09",
              border: 0,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Return to Home
          </button>
        </main>
      )}

      {/* Persistent Player Footer */}
      <PlayerFooter />
    </div>
  );
}

export default App;
