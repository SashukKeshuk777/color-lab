const MODELS = {
  rgb: {
    title: 'RGB', kicker: 'МОДЕЛЬ 01 / СВЕТ', icon: '◉',
    subtitle: 'Смешение красного, зелёного и синего света',
    components: [
      { key: 'r', label: 'Красный', max: 255, unit: '', step: 1 },
      { key: 'g', label: 'Зелёный', max: 255, unit: '', step: 1 },
      { key: 'b', label: 'Синий', max: 255, unit: '', step: 1 },
    ],
  },
  cmyk: {
    title: 'CMYK', kicker: 'МОДЕЛЬ 02 / КРАСКА', icon: '◐',
    subtitle: 'Голубая, пурпурная, жёлтая и чёрная краски',
    components: [
      { key: 'c', label: 'Голубой', max: 100, unit: '%', step: 0.1 },
      { key: 'm', label: 'Пурпурный', max: 100, unit: '%', step: 0.1 },
      { key: 'y', label: 'Жёлтый', max: 100, unit: '%', step: 0.1 },
      { key: 'k', label: 'Чёрный', max: 100, unit: '%', step: 0.1 },
    ],
  },
  hsv: {
    title: 'HSV', kicker: 'МОДЕЛЬ 03 / ВОСПРИЯТИЕ', icon: '✳',
    subtitle: 'Цветовой тон, насыщенность и яркость',
    components: [
      { key: 'h', label: 'Тон', max: 360, unit: '°', step: 0.1 },
      { key: 's', label: 'Насыщенность', max: 100, unit: '%', step: 0.1 },
      { key: 'v', label: 'Яркость', max: 100, unit: '%', step: 0.1 },
    ],
  },
  hls: {
    title: 'HLS', kicker: 'МОДЕЛЬ 03 / ВОСПРИЯТИЕ', icon: '✳',
    subtitle: 'Цветовой тон, светлота и насыщенность',
    components: [
      { key: 'h', label: 'Тон', max: 360, unit: '°', step: 0.1 },
      { key: 'l', label: 'Светлота', max: 100, unit: '%', step: 0.1 },
      { key: 's', label: 'Насыщенность', max: 100, unit: '%', step: 0.1 },
    ],
  },
};

const cards = document.getElementById('model-cards');
const preview = document.getElementById('preview');
const hexValue = document.getElementById('hex-value');
const errorMessage = document.getElementById('error-message');
const calculationTitle = document.getElementById('calculation-title');
const calculationNote = document.getElementById('calculation-note');
const calculationFormula = document.getElementById('calculation-formula');
let variant = 'hsv';
let color = null;
let requestNumber = 0;
let activeSourceModel = 'rgb';

function componentsHtml(model) {
  return MODELS[model].components.map(component => `
    <div class="component" data-component="${component.key}">
      <div class="component-line">
        <label class="component-label" for="${model}-${component.key}"><b>${component.key.toUpperCase()}</b><span class="component-name">${component.label}</span></label>
        <span class="number-wrap"><input class="number-input" id="${model}-${component.key}" type="number" inputmode="decimal" min="0" max="${component.max}" step="${model === 'rgb' ? '1' : 'any'}" aria-label="${MODELS[model].title}: ${component.label}"><span class="unit">${component.unit}</span></span>
      </div>
      <input class="range-input" type="range" min="0" max="${component.max}" step="${component.step}" data-key="${component.key}" aria-label="${MODELS[model].title}: ${component.label}, ползунок">
    </div>
  `).join('');
}

function cardHtml(model) {
  const data = MODELS[model];
  return `<section class="model-card" data-model="${model}" aria-label="${data.title}">
    <div class="card-top"><div><span class="card-kicker">${data.kicker}</span><h3 class="card-title">${data.title}</h3></div><span class="card-icon" aria-hidden="true">${data.icon}</span></div>
    <p class="card-subtitle">${data.subtitle}</p>
    ${componentsHtml(model)}
    <div class="card-footer"><span class="palette-text">Выбор из палитры</span><label class="palette-control"><span class="palette-dot"></span>Палитра<input class="palette-input" type="color" aria-label="${data.title}: выбрать цвет из палитры"></label></div>
  </section>`;
}

function format(value, model) {
  if (model === activeSourceModel) return String(value);
  if (model === 'rgb') return String(Math.round(value));
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

function setError(message) {
  errorMessage.textContent = message;
  errorMessage.hidden = !message;
}

function updateRangeFill(range) {
  const ratio = Math.max(0, Math.min(100, Number(range.value) / Number(range.max) * 100));
  range.style.background = `linear-gradient(to right, #76a653 0%, #76a653 ${ratio}%, #e3e9df ${ratio}%, #e3e9df 100%)`;
}

function short(value) {
  return String(Math.round((value + Number.EPSILON) * 100) / 100);
}

function renderCalculation() {
  const source = color[activeSourceModel];
  const rgb = color.rgb;
  if (activeSourceModel === 'rgb') {
    const r = source.r / 255, g = source.g / 255, b = source.b / 255;
    const maximum = Math.max(r, g, b);
    calculationTitle.textContent = 'Из RGB в другие модели';
    calculationNote.textContent = 'Каналы света сначала переводятся в доли от 0 до 1. Из них сервер находит долю чёрной краски и координаты HSV и HLS.';
    const inks = maximum === 0
      ? 'C = M = Y = 0% (чёрный цвет)'
      : `C = 100 × (max − r) / max = ${short(color.cmyk.c)}%\nM = 100 × (max − g) / max = ${short(color.cmyk.m)}%\nY = 100 × (max − b) / max = ${short(color.cmyk.y)}%`;
    calculationFormula.textContent = `r = ${source.r} / 255 = ${short(r)}\ng = ${source.g} / 255 = ${short(g)}\nb = ${source.b} / 255 = ${short(b)}\nK = 100 × (1 − max(r, g, b)) = ${short(color.cmyk.k)}%\n${inks}`;
  } else if (activeSourceModel === 'cmyk') {
    calculationTitle.textContent = 'Из CMYK в RGB';
    calculationNote.textContent = 'Каждая цветная краска убирает часть соответствующего света. Чёрная краска уменьшает сразу все три канала.';
    calculationFormula.textContent = `R = 255 × (1 − ${source.c}/100) × (1 − ${source.k}/100) = ${short(rgb.r)}\nG = 255 × (1 − ${source.m}/100) × (1 − ${source.k}/100) = ${short(rgb.g)}\nB = 255 × (1 − ${source.y}/100) × (1 − ${source.k}/100) = ${short(rgb.b)}`;
  } else {
    const h = source.h % 360;
    const s = source.s / 100;
    const lightOrValue = activeSourceModel === 'hsv' ? source.v / 100 : source.l / 100;
    const chroma = activeSourceModel === 'hsv' ? lightOrValue * s : (1 - Math.abs(2 * lightOrValue - 1)) * s;
    const x = chroma * (1 - Math.abs((h / 60) % 2 - 1));
    const m = activeSourceModel === 'hsv' ? lightOrValue - chroma : lightOrValue - chroma / 2;
    calculationTitle.textContent = `Из ${activeSourceModel.toUpperCase()} в RGB`;
    calculationNote.textContent = 'Тон выбирает сектор цветового круга. C и X задают цветные каналы, m добавляет одинаковую долю к каждому каналу.';
    const chromaFormula = activeSourceModel === 'hsv' ? 'V/100 × S/100' : '(1 − |2L/100 − 1|) × S/100';
    const offsetFormula = activeSourceModel === 'hsv' ? 'V/100 − C' : 'L/100 − C/2';
    calculationFormula.textContent = `H = ${source.h}° → сектор ${Math.floor(h / 60) * 60}–${(Math.floor(h / 60) + 1) * 60}°\nC = ${chromaFormula} = ${short(chroma)}\nX = C × (1 − |(H/60 mod 2) − 1|) = ${short(x)}\nm = ${offsetFormula} = ${short(m)}\nRGB ≈ (${short(rgb.r)}, ${short(rgb.g)}, ${short(rgb.b)})`;
  }
}

function render() {
  if (!color) return;
  hexValue.textContent = color.hex;
  preview.style.backgroundColor = color.hex;
  const [r, g, b] = ['r', 'g', 'b'].map(key => color.rgb[key] / 255);
  const luminance = [r, g, b].map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  preview.style.color = .2126 * luminance[0] + .7152 * luminance[1] + .0722 * luminance[2] > .43 ? '#1b251e' : '#ffffff';
  document.querySelectorAll('.model-card').forEach(card => {
    const model = card.dataset.model;
    MODELS[model].components.forEach(component => {
      const number = card.querySelector(`#${model}-${component.key}`);
      const range = card.querySelector(`.range-input[data-key="${component.key}"]`);
      const value = color[model][component.key];
      if (document.activeElement !== number) number.value = format(value, model);
      range.value = value;
      updateRangeFill(range);
    });
    card.querySelector('.palette-input').value = color.hex;
    card.querySelector('.palette-dot').style.backgroundColor = color.hex;
  });
  renderCalculation();
}

async function convert(model, values) {
  const current = ++requestNumber;
  try {
    const response = await fetch('/api/convert', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, values }),
    });
    const result = await response.json();
    if (current !== requestNumber) return;
    if (!response.ok) throw new Error(result.error || 'Не удалось пересчитать цвет.');
    color = result;
    activeSourceModel = model;
    setError('');
    render();
  } catch (error) {
    if (current === requestNumber) setError(error.message || 'Сервер недоступен.');
  }
}

function valuesFromCard(card) {
  const model = card.dataset.model;
  const values = {};
  for (const component of MODELS[model].components) {
    const input = card.querySelector(`#${model}-${component.key}`);
    const value = Number(input.value);
    if (input.value.trim() === '' || !Number.isFinite(value) || value < 0 || value > component.max || (model === 'rgb' && !Number.isInteger(value))) {
      setError(`Введите ${component.label.toLowerCase()} ${model === 'rgb' ? 'целым числом ' : ''}в диапазоне от 0 до ${component.max}.`);
      return null;
    }
    values[component.key] = value;
  }
  return values;
}

function bindCard(card) {
  const model = card.dataset.model;
  card.querySelectorAll('.number-input').forEach(input => {
    input.addEventListener('input', () => {
      const values = valuesFromCard(card);
      if (values) convert(model, values);
      else requestNumber += 1;
    });
    input.addEventListener('blur', () => {
      if (!errorMessage.hidden) setError('');
      render();
    });
  });
  card.querySelectorAll('.range-input').forEach(range => {
    range.addEventListener('input', () => {
      const key = range.dataset.key;
      card.querySelector(`#${model}-${key}`).value = range.value;
      updateRangeFill(range);
      const values = valuesFromCard(card);
      if (values) convert(model, values);
    });
  });
  card.querySelector('.palette-input').addEventListener('input', event => {
    const hex = event.target.value;
    convert('rgb', {
      r: parseInt(hex.slice(1, 3), 16),
      g: parseInt(hex.slice(3, 5), 16),
      b: parseInt(hex.slice(5, 7), 16),
    });
  });
}

function setVariant(next) {
  variant = next;
  document.getElementById('variant-even').classList.toggle('active', next === 'hsv');
  document.getElementById('variant-even').setAttribute('aria-pressed', String(next === 'hsv'));
  document.getElementById('variant-odd').classList.toggle('active', next === 'hls');
  document.getElementById('variant-odd').setAttribute('aria-pressed', String(next === 'hls'));
  document.getElementById('preview-third').textContent = next.toUpperCase();
  cards.innerHTML = ['rgb', 'cmyk', next].map(cardHtml).join('');
  cards.querySelectorAll('.model-card').forEach(bindCard);
  if (activeSourceModel !== 'rgb' && activeSourceModel !== 'cmyk' && activeSourceModel !== next) activeSourceModel = next;
  render();
}

document.getElementById('variant-even').addEventListener('click', () => setVariant('hsv'));
document.getElementById('variant-odd').addEventListener('click', () => setVariant('hls'));
document.getElementById('copy-hex').addEventListener('click', async () => {
  if (!color) return;
  try {
    await navigator.clipboard.writeText(color.hex);
    document.getElementById('copy-message').textContent = 'Скопировано в буфер обмена';
    setTimeout(() => document.getElementById('copy-message').textContent = 'Нажмите, чтобы скопировать код', 2200);
  } catch {
    document.getElementById('copy-message').textContent = 'Выделите код и скопируйте вручную';
  }
});

setVariant('hsv');
convert('rgb', { r: 124, g: 92, b: 250 });
