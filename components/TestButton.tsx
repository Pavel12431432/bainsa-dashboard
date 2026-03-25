"use client";

export default function TestButton() {
  return (
    <button
      onClick={() => alert("JS works")}
      style={{ padding: "8px 16px", background: "#fe6203", color: "#000", border: "none", borderRadius: "4px", cursor: "pointer", fontFamily: "inherit", fontWeight: 600, marginBottom: "24px" }}
    >
      TEST JS
    </button>
  );
}
