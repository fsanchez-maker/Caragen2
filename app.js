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

// Paletas originales estáticas
const originalPalettes = {
  Labios: ['#DE857C', '#D47475', '#C25F52', '#AE8685'],
  Piel: ['#F6C4A8', '#E4AD90', '#AA8056', '#715030'],
  Ojos: ['#241607', '#322110', '#4F463E', '#58673C', '#387C7D'],
  Pelo: ['#0E0B09', '#382818', '#DFB76C', '#AEA995', '#A45533'],
  PeloSom: ['#4A433C', '#44372B', '#9D8D67', '#282723', '#5E5A55'],
  Dientes: ['#E9E8E6', '#F9EBCD', '#FFFFFF'],
  Marcas: ['#BA9088', '#2C1B0E'], Cavidad: ['#2C1B0E'], Blanco: ['#FDFBFB'], Negro: ['#060507']
};

let palettes = JSON.parse(JSON.stringify(originalPalettes));

const state = { 
  choices: {}, 
  colors: Object.fromEntries(Object.entries(palettes).map(([name, values]) => [name, values[0]])),
  marcasOpacity: 1
};

const sourceCache = new Map();
const portrait = document.querySelector('#portrait');
const status = document.querySelector('#status');

function applySkinToneRule() {
  const currentSkinColor = state.colors.Piel;
  const skinIndex = palettes.Piel.indexOf(currentSkinColor);

  if (skinIndex === 0 || skinIndex === 1) {
    state.colors.Marcas = palettes.Marcas[0];
  } else if (skinIndex === 2 || skinIndex === 3) {
    state.colors.Marcas = palettes.Marcas[1] || palettes.Marcas[0];
  }
}

layers.forEach(([folder, , options, optional, fixed]) => state.choices[folder] = fixed ? 0 : optional ? 0 : 0);
const fileName = (folder, option) => `${root}/${folder}/${option}.svg`;

async function getSource(folder, option) { 
  const key = fileName(folder, option); 
  if (!sourceCache.has(key)) {
    sourceCache.set(key, fetch(key).then(r => { 
      if (!r.ok) throw new Error(key); 
      return r.text(); 
    }));
  }
  return sourceCache.get(key); 
}

function recolor(svg) { 
  Object.entries(state.colors).forEach(([id, color]) => {
    svg.querySelectorAll(`[id="${id}"]`).forEach(node => { 
      [node, ...node.querySelectorAll('*')].forEach(child => { 
        if (child.hasAttribute('fill') && child.getAttribute('fill') !== 'none') {
          child.setAttribute('fill', color);
        }
        if (child.hasAttribute('stroke') && child.getAttribute('stroke') !== 'none') {
          child.setAttribute('stroke', color);
        }
        if (id === 'Marcas') {
          child.setAttribute('opacity', state.marcasOpacity);
        }
      }); 
    }); 
  }); 
  return svg; 
}

async function compose() {
  status.textContent = 'Componiendo tu retrato…';
  try {
    const selected = layers.slice().reverse();
    const parts = await Promise.all(selected.map(async ([folder, , options, optional]) => {
      const index = state.choices[folder]; 
      if (optional && index === 0) return '';
      const option = options[optional ? index - 1 : index]; 
      const text = await getSource(folder, option);
      const doc = new DOMParser().parseFromString(text, 'image/svg+xml'); 
      const inner = [...doc.documentElement.childNodes].map(n => n.outerHTML || '').join('');
      return `<g data-layer="${folder}" data-option="${option}">${inner}</g>`;
    }));
    const svg = new DOMParser().parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2048 2048">${parts.join('')}</svg>`, 'image/svg+xml').documentElement;
    portrait.replaceChildren(recolor(svg)); 
    status.textContent = 'Retrato listo.';
  } catch (error) { 
    status.textContent = 'No se pudieron cargar los SVG. Abre el proyecto desde un servidor local.'; 
    console.error(error); 
  }
}

function buildFeatures() { 
  const host = document.querySelector('#feature-controls'); 
  layers.filter(([, , , , fixed]) => !fixed).forEach(([folder, label, options, optional]) => { 
    const max = options.length - 1 + (optional ? 1 : 0); 
    const wrap = document.createElement('div'); 
    wrap.className = 'feature'; 
    const current = () => optional && state.choices[folder] === 0 ? 'ninguno' : options[optional ? state.choices[folder] - 1 : state.choices[folder]]; 
    wrap.innerHTML = `<div class="feature-label"><label for="range-${folder}">${label}</label><span class="feature-value">${current()}</span></div><input id="range-${folder}" type="range" min="0" max="${max}" value="${state.choices[folder]}" />`; 
    const input = wrap.querySelector('input'); 
    input.addEventListener('input', () => { 
      state.choices[folder] = +input.value; 
      wrap.querySelector('.feature-value').textContent = current(); 
      compose(); 
    }); 
    host.append(wrap); 
  }); 
}

function buildColors() {
  const host = document.querySelector('#color-controls');
  Object.entries(palettes).forEach(([name, colors]) => {
    const item = document.createElement('div');
    item.className = 'color-group';
    item.innerHTML = `<span class="color-name">${name}</span><div class="swatches"></div>`;
    
    colors.forEach((color, index) => {
      const container = document.createElement('div');
      container.style.position = 'relative';
      container.style.display = 'inline-block';

      const button = document.createElement('button');
      button.className = 'swatch';
      button.type = 'button';
      button.style.background = color;
      button.title = `${name}: Haz clic para seleccionar`;
      button.setAttribute('aria-label', `${name}: ${color}`);
      button.setAttribute('aria-pressed', color === state.colors[name]);

      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = color.length === 7 ? color : '#000000';
      // Desactivamos interacción directa con el input invisible para dejar que el botón maneje el clic inicial
      picker.style.position = 'absolute';
      picker.style.top = '0';
      picker.style.left = '0';
      picker.style.width = '100%';
      picker.style.height = '100%';
      picker.style.opacity = '0';
      picker.style.pointerEvents = 'none';

      // Al hacer clic en el botón se selecciona el color e inmediatamente abre la paleta
      button.onclick = () => {
        state.colors[name] = palettes[name][index];
        if (name === 'Piel') applySkinToneRule();
        
        document.querySelectorAll('#color-controls .swatch').forEach(s => {
          const swatchColor = s.style.background;
          s.setAttribute('aria-pressed', String(swatchColor === state.colors[name]));
        });
        
        compose();
        
        // Abre el selector de color automáticamente
        picker.showPicker ? picker.showPicker() : picker.click();
      };

      // Actualización en TIEMPO REAL mientras arrastras en el selector
      const updateLiveColor = (e) => {
        const newColor = e.target.value.toUpperCase();
        palettes[name][index] = newColor;
        button.style.background = newColor;
        state.colors[name] = newColor;
        if (name === 'Piel') applySkinToneRule();
        
        document.querySelectorAll('#color-controls .swatch').forEach(s => {
          const swatchColor = s.style.background;
          s.setAttribute('aria-pressed', String(swatchColor === state.colors[name]));
        });

        compose();
      };

      picker.addEventListener('input', updateLiveColor);
      picker.addEventListener('change', updateLiveColor);

      container.append(button, picker);
      item.querySelector('.swatches').append(container);
    });
    host.append(item);
  });

  const opacityWrap = document.createElement('div');
  opacityWrap.className = 'feature';
  opacityWrap.style.marginTop = '15px';
  opacityWrap.innerHTML = `
    <div class="feature-label">
      <label for="marcas-opacity">Opacidad de Marcas</label>
      <span id="marcas-opacity-val">${Math.round(state.marcasOpacity * 100)}%</span>
    </div>
    <input id="marcas-opacity" type="range" min="0" max="100" value="${Math.round(state.marcasOpacity * 100)}" />
  `;
  const opInput = opacityWrap.querySelector('input');
  opInput.addEventListener('input', () => {
    state.marcasOpacity = opInput.value / 100;
    opacityWrap.querySelector('#marcas-opacity-val').textContent = `${opInput.value}%`;
    compose();
  });
  host.append(opacityWrap);
}

function weightedRandomChoice(array, weights) {
  const totalWeight = weights.reduce((acc, val) => acc + val, 0);
  let random = Math.random() * totalWeight;
  for (let i = 0; i < array.length; i++) {
    if (random < weights[i]) return array[i];
    random -= weights[i];
  }
  return array[0];
}

function randomize() {
  palettes = JSON.parse(JSON.stringify(originalPalettes));

  layers.forEach(([folder, , options, optional, fixed]) => { 
    if (!fixed) state.choices[folder] = Math.floor(Math.random() * (options.length + (optional ? 1 : 0))); 
  });

  const skinColors = originalPalettes.Piel;
  const selectedSkin = skinColors[Math.floor(Math.random() * skinColors.length)];
  state.colors.Piel = selectedSkin;
  const skinIndex = skinColors.indexOf(selectedSkin);

  const isDarkSkin = (skinIndex === 2 || skinIndex === 3);

  const peloColors = originalPalettes.Pelo;
  if (isDarkSkin) {
    const weights = [28.33, 28.33, 10, 28.34, 5];
    state.colors.Pelo = weightedRandomChoice(peloColors, weights);
  } else {
    state.colors.Pelo = peloColors[Math.floor(Math.random() * peloColors.length)];
  }

  const peloIndex = peloColors.indexOf(state.colors.Pelo);
  if (peloIndex === 2) {
    state.colors.PeloSom = originalPalettes.PeloSom[2];
  } else {
    state.colors.PeloSom = originalPalettes.PeloSom[Math.floor(Math.random() * originalPalettes.PeloSom.length)];
  }

  const labiosColors = originalPalettes.Labios;
  if (isDarkSkin) {
    const weights = [5, 5, 45, 45];
    state.colors.Labios = weightedRandomChoice(labiosColors, weights);
  } else {
    state.colors.Labios = labiosColors[Math.floor(Math.random() * labiosColors.length)];
  }

  const ojosColors = originalPalettes.Ojos;
  if (isDarkSkin) {
    const weights = [18.33, 18.33, 18.34, 25, 20];
    state.colors.Ojos = weightedRandomChoice(ojosColors, weights);
  } else {
    state.colors.Ojos = ojosColors[Math.floor(Math.random() * ojosColors.length)];
  }

  state.colors.Dientes = originalPalettes.Dientes[Math.floor(Math.random() * originalPalettes.Dientes.length)];
  
  applySkinToneRule();

  state.marcasOpacity = (Math.floor(Math.random() * 21) + 80) / 100;

  document.querySelector('#feature-controls').replaceChildren();
  document.querySelector('#color-controls').replaceChildren();
  buildFeatures();
  buildColors();
  compose();
}

function download() { 
  const svg = portrait.querySelector('svg'); 
  if (!svg) return; 
  const copy = svg.cloneNode(true); 
  copy.setAttribute('width', '2048'); 
  copy.setAttribute('height', '2048'); 
  const blob = new Blob([`<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(copy)}`], { type: 'image/svg+xml' }); 
  const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: 'mi-caragen.svg' }); 
  link.click(); 
  URL.revokeObjectURL(link.href); 
}

document.querySelector('#randomize').addEventListener('click', randomize); 
document.querySelector('#download').addEventListener('click', download); 

applySkinToneRule(); 
buildFeatures(); 
buildColors(); 
compose();
