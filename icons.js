(function () {
  const ns = "http://www.w3.org/2000/svg";
  const icons = {
    "flower-2": ["M12 8c2-5 6-5 6 0 5-2 7 2 3 5 4 3 2 7-3 5 0 5-4 5-6 1-2 4-6 4-6-1-5 2-9-2-5-5-4-3-2-7 3-5-4-3-2-7 3-5Z", "M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0-6 0"],
    "file-text": ["M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z", "M14 2v6h6", "M8 13h8", "M8 17h8", "M8 9h2"],
    "repeat-2": ["M17 2l4 4-4 4", "M3 11V9a3 3 0 0 1 3-3h15", "M7 22l-4-4 4-4", "M21 13v2a3 3 0 0 1-3 3H3"],
    "layers-3": ["M12 2 2 7l10 5 10-5-10-5Z", "m2 12 10 5 10-5", "m2 17 10 5 10-5"],
    sparkles: ["M12 3l1.8 4.7L18 9.5l-4.2 1.8L12 16l-1.8-4.7L6 9.5l4.2-1.8Z", "M19 14l.9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9Z", "M5 4l.8 1.8L8 6.5l-2.2.7L5 9l-.8-1.8L2 6.5l2.2-.7Z"],
    star: ["M12 2l3 6 6.5.9-4.7 4.6 1.1 6.5L12 17l-5.9 3 1.1-6.5L2.5 8.9 9 8Z"],
    bell: ["M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9", "M10 21h4"],
    "pencil-line": ["M18 2l4 4L9 19l-5 1 1-5Z", "M14 6l4 4", "M3 22h18"],
    "folder-open": ["M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v2", "M3 19l3-8h16l-3 8Z"],
    "clipboard-list": ["M9 4h6l1 2h3v16H5V6h3Z", "M9 11h6", "M9 15h6", "M8 4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2"],
    "copy-plus": ["M8 7H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2", "M8 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z", "M13 8v6", "M10 11h6"],
    "messages-square": ["M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z", "M8 8h8", "M8 12h5"],
    "shield-check": ["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z", "m9 12 2 2 4-5"],
    "upload-cloud": ["M16 16l-4-4-4 4", "M12 12v9", "M20 16.5A4.5 4.5 0 0 0 17 8h-1A6 6 0 0 0 4 10.5"],
    "arrow-right": ["M5 12h14", "m12 5 7 7-7 7"],
    "clipboard-copy": ["M8 7H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-2", "M8 3h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z"],
    download: ["M12 3v12", "m7 10 5 5 5-5", "M5 21h14"],
    "refresh-cw": ["M21 12a9 9 0 0 1-15 6.7", "M3 12A9 9 0 0 1 18 5.3", "M18 2v4h-4", "M6 22v-4h4"],
    "circle-help": ["M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z", "M9.1 9a3 3 0 1 1 5.8 1c-.7 1.4-2.9 1.7-2.9 3", "M12 17h.01"],
    "receipt-text": ["M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2Z", "M8 7h8", "M8 11h8", "M8 15h5"],
    "message-square": ["M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z", "M8 9h8", "M8 13h5"],
    headset: ["M4 13v-1a8 8 0 0 1 16 0v1", "M4 13h3v5H4Z", "M17 13h3v5h-3Z", "M20 18a4 4 0 0 1-4 4h-3"],
    headphones: ["M4 13v-1a8 8 0 0 1 16 0v1", "M4 13h3v5H4Z", "M17 13h3v5h-3Z", "M20 18a4 4 0 0 1-4 4h-3"],
    braces: ["M8 3H7a3 3 0 0 0-3 3v3a2 2 0 0 1-2 2 2 2 0 0 1 2 2v3a3 3 0 0 0 3 3h1", "M16 3h1a3 3 0 0 1 3 3v3a2 2 0 0 0 2 2 2 2 0 0 0-2 2v3a3 3 0 0 1-3 3h-1"],
    "loader-2": ["M21 12a9 9 0 1 1-6.2-8.6"],
    "trash-2": ["M3 6h18", "M8 6V4h8v2", "M6 6l1 16h10l1-16", "M10 11v6", "M14 11v6"],
    "panel-right-open": ["M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z", "M15 3v18", "m10 15-3-3 3-3"]
  };

  function renderIcon(node) {
    if (node.dataset.iconReady === "1") return;
    const name = node.getAttribute("data-lucide");
    const paths = icons[name] || icons["circle-help"];
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    paths.forEach((d) => {
      const path = document.createElementNS(ns, "path");
      path.setAttribute("d", d);
      svg.appendChild(path);
    });
    node.replaceChildren(svg);
    node.dataset.iconReady = "1";
  }

  window.lucide = {
    createIcons() {
      document.querySelectorAll("[data-lucide]").forEach(renderIcon);
    },
  };
})();
