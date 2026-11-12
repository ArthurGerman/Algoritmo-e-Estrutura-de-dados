type Level = 1 | 2 | 3 | 4;
type Kind = "compare" | "swap" | "pass" | "done";

interface Patient {
  ticket: number;
  name: string;
  complaint: string;
  level: Level;
  arrival: string;
}

interface Step<T> {
  items: T[];
  i: number; // posição comparada (i e i+1)
  kind: Kind;
}

const LEVELS: Record<Level, { label: string; cls: string }> = {
  1: { label: "Emergência", cls: "l1" },
  2: { label: "Muito urgente", cls: "l2" },
  3: { label: "Urgente", cls: "l3" },
  4: { label: "Pouco urgente", cls: "l4" },
};

/** Bubble Sort genérico: recebe um comparador e entrega cada passo via yield. */
function* bubbleSort<T>(input: T[], cmp: (a: T, b: T) => number): Generator<Step<T>> {
  const a = [...input];
  const n = a.length;
  for (let pass = 0; pass < n - 1; pass++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - pass; j++) {
      yield { items: [...a], i: j, kind: "compare" };
      if (cmp(a[j], a[j + 1]) > 0) { // só troca se for estritamente maior: mantém a ordem de chegada
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
        yield { items: [...a], i: j, kind: "swap" };
      }
    }
    yield { items: [...a], i: -1, kind: "pass" };
    if (!swapped) break;
  }
  yield { items: [...a], i: -1, kind: "done" };
}

const byLevel = (x: Patient, y: Patient): number => x.level - y.level;
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const DEMO: Array<[string, string, Level]> = [
  ["Ana Souza", "Dor no peito", 1], ["Bruno Lima", "Fratura no braço", 2],
  ["Carla Dias", "Febre há dois dias", 3], ["Diego Alves", "Renovação de receita", 4],
  ["Elisa Rocha", "Falta de ar intensa", 1], ["Felipe Costa", "Corte profundo", 2],
  ["Gabi Nunes", "Dor de garganta", 4], ["Hugo Matos", "Vômitos e tontura", 3],
];

class Triage {
  private queue: Patient[] = [];
  private ticket = 0;
  private busy = false;
  private stats = { comparisons: 0, swaps: 0, passes: 0 };

  private $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  private list = this.$<HTMLOListElement>("queue");
  private status = this.$("status");

  constructor() {
    this.$<HTMLFormElement>("form").onsubmit = (e) => { e.preventDefault(); this.addFromForm(); };
    this.$("call").onclick = () => this.callNext();
    this.$("seed").onclick = () => this.seed();
    this.render();
  }

  private enqueue(name: string, complaint: string, level: Level): void {
    const arrival = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    this.queue.push({ ticket: ++this.ticket, name, complaint, level, arrival });
  }

  private addFromForm(): void {
    if (this.busy) return;
    const name = this.$<HTMLInputElement>("name");
    const complaint = this.$<HTMLInputElement>("complaint");
    const level = Number(this.$<HTMLSelectElement>("level").value) as Level;
    this.enqueue(name.value.trim() || "Sem nome", complaint.value.trim() || "Não informada", level);
    name.value = ""; complaint.value = ""; name.focus();
    void this.sort();
  }

  private seed(): void {
    if (this.busy) return;
    [...DEMO].sort(() => Math.random() - 0.5).forEach(([n, c, l]) => this.enqueue(n, c, l));
    void this.sort();
  }

  private callNext(): void {
    if (this.busy) return;
    const p = this.queue.shift();
    if (!p) { this.status.textContent = "Não há ninguém na fila."; return; }
    this.$("current").textContent = `Senha ${p.ticket} · ${p.name} (${LEVELS[p.level].label}) – ${p.complaint}`;
    this.status.textContent = `${p.name} foi chamado(a).`;
    this.render();
  }

  /** Reordena a fila com o Bubble Sort, animando cada comparação e troca. */
  private async sort(): Promise<void> {
    this.setBusy(true);
    this.stats = { comparisons: 0, swaps: 0, passes: 0 };
    for (const s of bubbleSort(this.queue, byLevel)) {
      this.queue = s.items;
      if (s.kind === "compare") this.stats.comparisons++;
      if (s.kind === "swap") this.stats.swaps++;
      if (s.kind === "pass") this.stats.passes++;
      if (s.kind === "compare" || s.kind === "swap") {
        const [x, y] = [s.items[s.i], s.items[s.i + 1]];
        this.status.textContent = s.kind === "compare"
          ? `Comparando ${x.name} (${LEVELS[x.level].label}) com ${y.name} (${LEVELS[y.level].label})`
          : `${y.name} tem prioridade maior e passou à frente de ${x.name}`;
      }
      this.render(s.i, s.kind);
      if (s.kind !== "done") await sleep(Math.max(20, 620 - Number(this.$<HTMLInputElement>("speed").value) * 6));
    }
    this.status.textContent = "Fila ordenada por prioridade (empates seguem a ordem de chegada).";
    this.setBusy(false);
  }

  private setBusy(b: boolean): void {
    this.busy = b;
    ["add", "call", "seed"].forEach((id) => (this.$<HTMLButtonElement>(id).disabled = b));
  }

  private el(tag: string, cls: string, text = ""): HTMLElement {
    const e = document.createElement(tag);
    e.className = cls;
    e.textContent = text;
    return e;
  }

  private render(i = -1, kind: Kind | "idle" = "idle"): void {
    this.list.innerHTML = "";
    this.queue.forEach((p, idx) => {
      const li = this.el("li", "card");
      if ((kind === "compare" || kind === "swap") && (idx === i || idx === i + 1)) li.classList.add(kind);
      const info = this.el("div", "info");
      info.append(
        this.el("strong", "", p.name),
        this.el("small", "", `${p.complaint} · chegou às ${p.arrival} · senha ${p.ticket}`)
      );
      li.append(this.el("span", "pos", String(idx + 1)), info,
        this.el("span", `badge ${LEVELS[p.level].cls}`, LEVELS[p.level].label));
      this.list.appendChild(li);
    });
    this.$("empty").hidden = this.queue.length > 0;
    this.$("count").textContent = this.queue.length ? `(${this.queue.length})` : "";
    this.$("comparisons").textContent = String(this.stats.comparisons);
    this.$("swaps").textContent = String(this.stats.swaps);
    this.$("passes").textContent = String(this.stats.passes);
  }
}

new Triage();