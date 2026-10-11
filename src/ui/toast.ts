export function toast(message: string, tone: "success" | "warn" | "error" | "" = ""): void {
  const wrap = document.getElementById("toastWrap");
  if (!wrap) return;
  const el = document.createElement("div");
  el.className = "toast " + tone;
  el.textContent = message;
  wrap.appendChild(el);
  setTimeout(() => {
    el.remove();
  }, 3500);
}
