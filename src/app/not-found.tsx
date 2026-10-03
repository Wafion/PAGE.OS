import { NotFoundClient } from "./not-found-client";

export default function NotFound() {
  return (
    <main className="pageos-not-found" aria-labelledby="pageos-not-found-title">
      <NotFoundClient />

      <div className="pageos-not-found-content">
        <h1
          id="pageos-not-found-title"
          style={{
            color: "#ffffff",
            WebkitTextFillColor: "#ffffff",
            textShadow: "0 4px 28px rgba(0, 0, 0, 0.65)",
          }}
        >
          404
        </h1>
        <hr aria-hidden="true" />
        <p>This page has drifted beyond the library. Let&apos;s find our way back.</p>
      </div>
    </main>
  );
}
