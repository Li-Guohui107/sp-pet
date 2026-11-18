import { ref, watch } from "vue";

export type FloatSnapshot = {
  name: string;
  line: string;
  imageUrl: string;
};

type Nodes = {
  image: HTMLImageElement;
  fallback: SVGElement;
  name: HTMLElement;
  line: HTMLElement;
};

const PIP_CSS = `
  html, body { margin: 0; height: 100%; background: #031018; color: #e7f6ff; font-family: "Microsoft YaHei", sans-serif; }
  body { display: flex; }
  .card { flex: 1; display: flex; flex-direction: column; padding: 16px; gap: 12px; background: radial-gradient(circle at 50% 30%, rgba(40,170,255,.28), transparent 46%), #031018; }
  .figure { flex: 1; display: grid; place-items: center; }
  img, svg { width: min(100%, 220px); height: auto; }
  img { filter: drop-shadow(0 16px 24px rgba(0,180,255,.35)); }
  strong { font-size: 18px; letter-spacing: 0.04em; }
  p { margin: 0; line-height: 1.45; min-height: 2.8em; }
  form { display: flex; gap: 8px; }
  input { flex: 1; border: 1px solid rgba(125,236,255,.4); border-radius: 2px; background: #041018; color: #e7f6ff; padding: 10px 12px; }
  button { border: 0; border-radius: 2px; background: #35d7ff; color: #041018; font-weight: 700; padding: 0 14px; }
`;

export function useFloatPet(onSend: (text: string) => void) {
  const snapshot = ref<FloatSnapshot>({ name: "", line: "", imageUrl: "" });
  const nodes = ref<Nodes | null>(null);

  function paint() {
    const currentNodes = nodes.value;
    const current = snapshot.value;
    if (!currentNodes) return;
    currentNodes.name.textContent = current.name;
    currentNodes.line.textContent = current.line;
    if (current.imageUrl) {
      currentNodes.image.src = new URL(current.imageUrl, window.location.origin).href;
      currentNodes.image.hidden = false;
      currentNodes.fallback.style.display = "none";
    } else {
      currentNodes.image.hidden = true;
      currentNodes.fallback.style.display = "block";
    }
  }

  watch(snapshot, paint, { deep: true });

  async function open() {
    const pip = window.documentPictureInPicture;
    if (!pip) {
      throw new Error("用 Chrome 或 Edge 打开时，我可以浮在其他窗口上面。");
    }
    const child = await pip.requestWindow({ width: 320, height: 460 });
    const doc = child.document;
    doc.open();
    doc.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>超级宠物</title><style>${PIP_CSS}</style></head><body></body></html>`);
    doc.close();
    const card = doc.createElement("div");
    card.className = "card";
    const figure = doc.createElement("div");
    figure.className = "figure";
    const image = doc.createElement("img");
    image.alt = "";
    const fallback = dumpling(doc);
    figure.append(image, fallback);
    const name = doc.createElement("strong");
    const line = doc.createElement("p");
    const form = doc.createElement("form");
    const input = doc.createElement("input");
    input.placeholder = "跟我说一句";
    input.setAttribute("aria-label", "跟宠物说一句");
    const button = doc.createElement("button");
    button.type = "submit";
    button.textContent = "发送";
    form.append(input, button);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      onSend(text);
    });
    card.append(figure, name, line, form);
    doc.body.append(card);
    nodes.value = { image, fallback, name, line };
    child.addEventListener("pagehide", () => {
      nodes.value = null;
    });
    paint();
  }

  return { snapshot, open };
}

function dumpling(doc: Document) {
  const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 160 150");
  svg.innerHTML = `<ellipse cx="80" cy="92" rx="52" ry="42" fill="#35d7ff"/><circle cx="48" cy="48" r="18" fill="#35d7ff"/><circle cx="112" cy="48" r="18" fill="#35d7ff"/><circle cx="64" cy="88" r="5" fill="#041018"/><circle cx="96" cy="88" r="5" fill="#041018"/><path d="M68 104c6 8 18 8 24 0" fill="none" stroke="#041018" stroke-width="4" stroke-linecap="round"/>`;
  return svg;
}
