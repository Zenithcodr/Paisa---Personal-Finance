export interface ModalOptions {
  title: string;
  body: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => boolean | void;
  onCancel?: () => void;
}

let currentModalClose: (() => void) | null = null;

export function closeModal(): void {
  if (currentModalClose) {
    const fn = currentModalClose;
    currentModalClose = null;
    fn();
  }
}

export function openModal(opts: ModalOptions): void {
  const modalBackdrop = document.getElementById("modalBackdrop");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const modalConfirmBtn = document.getElementById("modalConfirmBtn") as HTMLButtonElement | null;
  const modalCancelBtn = document.getElementById("modalCancelBtn") as HTMLButtonElement | null;

  if (!modalBackdrop || !modalTitle || !modalBody || !modalConfirmBtn || !modalCancelBtn) {
    return;
  }

  if (currentModalClose) {
    const prev = currentModalClose;
    currentModalClose = null;
    prev();
  }

  modalTitle.textContent = opts.title;
  modalBody.innerHTML = opts.body;
  modalConfirmBtn.textContent = opts.confirmLabel ?? "Confirm";
  modalCancelBtn.textContent = opts.cancelLabel ?? "Cancel";
  modalBackdrop.hidden = false;

  const previouslyFocused = document.activeElement as HTMLElement | null;
  const getFocusable = (): HTMLElement[] =>
    Array.from(
      modalBackdrop.querySelectorAll<HTMLElement>(
        'button:not([hidden]):not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    );

  setTimeout(() => {
    const f = getFocusable();
    if (f.length > 0 && f[0]) f[0].focus();
  }, 0);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (
      e.key === "Enter" &&
      target &&
      target.tagName !== "TEXTAREA" &&
      target.tagName !== "BUTTON"
    ) {
      e.preventDefault();
      modalConfirmBtn.click();
      return;
    }
    if (e.key !== "Tab") return;
    const f = getFocusable();
    if (f.length === 0) {
      e.preventDefault();
      return;
    }
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first && last) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last && first) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener("keydown", onKey);

  const close = () => {
    document.removeEventListener("keydown", onKey);
    modalBackdrop.hidden = true;
    modalConfirmBtn.onclick = null;
    modalCancelBtn.onclick = null;
    modalTitle.textContent = "";
    modalBody.innerHTML = "";
    if (currentModalClose === close) currentModalClose = null;
    if (previouslyFocused && typeof previouslyFocused.focus === "function") {
      try {
        previouslyFocused.focus();
      } catch {
        // ignore
      }
    }
  };

  currentModalClose = close;

  modalCancelBtn.onclick = () => {
    if (opts.onCancel) opts.onCancel();
    close();
  };

  modalConfirmBtn.onclick = () => {
    if (opts.onConfirm) {
      const res = opts.onConfirm();
      if (res === false) return;
    }
    close();
  };
}

export function initModalListeners(): void {
  const modalBackdrop = document.getElementById("modalBackdrop");
  if (modalBackdrop) {
    modalBackdrop.addEventListener("click", (e) => {
      if (e.target === modalBackdrop) closeModal();
    });
  }
}
