/* Los SVG se componen en el navegador para conservar sus vectores al exportar. */
const root = 'Export';
const layers = [
  ['Cejas', 'Cejas', ['CF', 'CA', 'CB', 'CC', 'CD', 'CH', 'CE']],
  ['Barbas', 'Barba', ['BF', 'BB', 'BD', 'BC', 'BI', 'BA', 'BH'], true],
  ['Marcas', 'Marcas', ['MI', 'MH', 'MF', 'MB', 'MJ', 'MA', 'MC', 'MK', 'MG', 'ME', 'MD']],
  ['Nariz', 'Nariz', ['NF', 'NI', 'NK', 'NB', 'NG', 'NC', 'NL', 'NH', 'NE', 'NA', 'ND', 'NJ']],
  ['Ojos', 'Ojos', ['OB', 'OA', 'OI', 'OD', 'OC', 'OJ', 'OF', 'OK', 'OH']],
  ['Orejas', 'Orejas', ['ORG', 'ORE', 'ORA', 'ORD', 'ORC', 'ORF', 'ORB']],
  ['Pelo', 'Pelo', ['PL', 'PJ', 'PB', 'PD', 'PN', 'PE', 'PO', 'PM', 'PA', 'PF', 'PI', 'PH', 'PK', 'PC', 'PG'], true],
  ['Sombras', 'Sombras', ['Sombras'], false, true],
  ['Dientes', 'Dientes', ['DC', 'DE', 'DB', 'DA']],
  ['Boca', 'Boca', ['BOC', 'BOE', 'BOA', 'BOB', 'BOD']],
  ['Base', 'Base', ['Base'], false, true]
];
const palettes = {
  Labios: ['#DE857C', '#D47475', '#C25F52', '#AE8685'], Piel: ['#FFCC99', '#E4AD90', '#AA8056', '#715030'],
  Ojos: ['#241607', '#322110', '#4F463E', '#58673C', '#387C7D'], Pelo: ['#0E0B09', '#382818', '#A5822B', '#AEA995', '#A45533'],
  PeloSom: ['#4A433C', '#44372B', '#9D8D67', '#282723', '#5E5A55'], Dientes: ['#E9E8E6', '#F9EBCD', '#FFFFFF'],
  Marcas: ['#BA9088', '#2C1B0E'], Cavidad: ['#2C1B0E'], Blanco: ['#FDFBFB'], Negro: ['#060507']
};
const state = { choices: {}, colors: Object.fromEntries(Object.entries(palettes).map(([name, values]) => [name, values[0]])) };
const sourceCache = new Map();
const portrait = document.querySelector('#portrait');
const status = document.querySelector('#status');

layers.forEach(([folder, , options, optional, fixed]) => state.choices[folder] = fixed ? 0 : optional ? 0 : 0);
const fileName = (folder, option) => `${root}/${folder}/${option}.svg`;
async function getSource(folder, option) { const key = fileName(folder, option); if (!sourceCache.has(key)) sourceCache.set(key, fetch(key).then(r => { if (!r.ok) throw new Error(key); return r.text(); })); return sourceCache.get(key); }
function recolor(svg) { Object.entries(state.colors).forEach(([id, color]) => svg.querySelectorAll(`[id="${id}"]`).forEach(node => { [node, ...node.querySelectorAll('*')].forEach(child => { if (child.hasAttribute('fill') && child.getAttribute('fill') !== 'none') child.setAttribute('fill', color); if (child.hasAttribute('stroke') && child.getAttribute('stroke') !== 'none') child.setAttribute('stroke', color); }); })); return svg; }
async function compose() {
  status.textContent = 'Componiendo tu retrato…';
  try {
    const selected = layers.slice().reverse(); // La primera carpeta solicitada queda visualmente encima.
    const parts = await Promise.all(selected.map(async ([folder, , options, optional]) => {
      const index = state.choices[folder]; if (optional && index === 0) return '';
      const option = options[optional ? index - 1 : index]; const text = await getSource(folder, option);
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml'); const inner = [...doc.documentElement.childNodes].map(n => n.outerHTML || '').join('');
      return `<g data-layer="${folder}" data-option="${option}">${inner}</g>`;
    }));
    const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">${parts.join('')}</svg>`, 'image/svg+xml').documentElement;
    portrait.replaceChildren(recolor(svg)); status.textContent = 'Retrato listo.';
  } catch (error) { status.textContent = 'No se pudieron cargar los SVG. Abre el proyecto desde un servidor local.'; console.error(error); }
}
function buildFeatures() { const host = document.querySelector('#feature-controls'); layers.filter(([, , , , fixed]) => !fixed).forEach(([folder, label, options, optional]) => { const max = options.length - 1 + (optional ? 1 : 0); const wrap = document.createElement('div'); wrap.className = 'feature'; const current = () => optional && state.choices[folder] === 0 ? 'ninguno' : options[optional ? state.choices[folder] - 1 : state.choices[folder]]; wrap.innerHTML = `<div class="feature-label"><label for="range-${folder}">${label}</label><span class="feature-value">${current()}</span></div><input id="range-${folder}" type="range" min="0" max="${max}" value="${state.choices[folder]}" />`; const input = wrap.querySelector('input'); input.addEventListener('input', () => { state.choices[folder] = +input.value; wrap.querySelector('.feature-value').textContent = current(); compose(); }); host.append(wrap); }); }
function buildColors() { const host = document.querySelector('#color-controls'); Object.entries(palettes).forEach(([name, colors]) => { const item = document.createElement('div'); item.innerHTML = `<span class="color-name">${name}</span><div class="swatches"></div>`; colors.forEach(color => { const button = document.createElement('button'); button.className = 'swatch'; button.type = 'button'; button.style.background = color; button.title = color; button.setAttribute('aria-label', `${name}: ${color}`); button.setAttribute('aria-pressed', color === state.colors[name]); button.onclick = () => { state.colors[name] = color; item.querySelectorAll('.swatch').forEach(s => s.setAttribute('aria-pressed', String(s === button))); compose(); }; item.querySelector('.swatches').append(button); }); host.append(item); }); }
function randomize() { layers.forEach(([folder, , options, optional, fixed]) => { if (!fixed) state.choices[folder] = Math.floor(Math.random() * (options.length + (optional ? 1 : 0))); }); Object.entries(palettes).forEach(([name, colors]) => state.colors[name] = colors[Math.floor(Math.random() * colors.length)]); document.querySelector('#feature-controls').replaceChildren(); document.querySelector('#color-controls').replaceChildren(); buildFeatures(); buildColors(); compose(); }
function download() { const svg = portrait.querySelector('svg'); if (!svg) return; const copy = svg.cloneNode(true); copy.setAttribute('width', '2048'); copy.setAttribute('height', '2048'); const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`], { type: 'image/svg+xml' }); const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'mi-caragen.svg' }); link.click(); URL.revokeObjectURL(link.href); }
document.querySelector('#randomize').addEventListener('click', randomize); document.querySelector('#download').addEventListener('click', download); buildFeatures(); buildColors(); compose();
