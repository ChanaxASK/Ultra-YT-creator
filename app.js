const initialElements = [
  { id: 'water', name: 'Water', symbol: '◌', type: 'element', color: '#a4d9ef' },
  { id: 'fire', name: 'Fire', symbol: '✦', type: 'element', color: '#f0785e' },
  { id: 'earth', name: 'Earth', symbol: '◆', type: 'element', color: '#f5d77c' },
  { id: 'wind', name: 'Wind', symbol: '∿', type: 'element', color: '#c7baf0' }
];

const recipes = {
  'earth+water': { id: 'plant', name: 'Plant', symbol: '❋', type: 'nature', color: '#b9dc75' },
  'fire+water': { id: 'steam', name: 'Steam', symbol: '≈', type: 'matter', color: '#d4d1c8' },
  'earth+fire': { id: 'lava', name: 'Lava', symbol: '◈', type: 'matter', color: '#f0785e' },
  'fire+wind': { id: 'smoke', name: 'Smoke', symbol: '≋', type: 'matter', color: '#b9b9b2' },
  'earth+wind': { id: 'dust', name: 'Dust', symbol: '·', type: 'matter', color: '#d4bb8e' },
  'plant+water': { id: 'algae', name: 'Algae', symbol: '✺', type: 'nature', color: '#93c98d' },
  'fire+steam': { id: 'energy', name: 'Energy', symbol: '⚡', type: 'force', color: '#f5d77c' },
  'earth+plant': { id: 'garden', name: 'Garden', symbol: '✿', type: 'place', color: '#97c883' },
  'wind+energy': { id: 'storm', name: 'Storm', symbol: '☄', type: 'weather', color: '#9f9ddd' },
  'lava+water': { id: 'stone', name: 'Stone', symbol: '⬟', type: 'matter', color: '#a8aaa2' },
  'fire+stone': { id: 'metal', name: 'Metal', symbol: '▣', type: 'matter', color: '#aab9c2' },
  'garden+water': { id: 'forest', name: 'Forest', symbol: '♣', type: 'nature', color: '#6dac76' }
};

const canvas = document.querySelector('#canvas');
const list = document.querySelector('#elementList');
const searchInput = document.querySelector('#searchInput');
const hint = document.querySelector('#canvasHint');
const toast = document.querySelector('#recipeToast');
let library = JSON.parse(localStorage.getItem('forge-library') || 'null') || [...initialElements];
let placed = JSON.parse(localStorage.getItem('forge-placed') || 'null') || [];
let selected = null;
let dragOffset = { x: 0, y: 0 };
let dragBounds = null;

function save() {
  localStorage.setItem('forge-library', JSON.stringify(library));
  localStorage.setItem('forge-placed', JSON.stringify(placed));
  document.querySelector('#saveStatus').textContent = 'Progress saved';
}

function renderLibrary(filter = '') {
  list.innerHTML = '';
  library.filter(item => item.name.toLowerCase().includes(filter.toLowerCase())).forEach(item => {
    const button = document.createElement('button');
    button.className = 'library-item';
    button.draggable = true;
    button.dataset.id = item.id;
    button.innerHTML = `<span class="element-symbol" style="background:${item.color}">${item.symbol}</span><span class="element-name">${item.name}</span>`;
    button.addEventListener('dragstart', event => startDrag(event, item));
    button.addEventListener('click', () => placeElement(item, 50 + Math.random() * 35, 45 + Math.random() * 30));
    list.appendChild(button);
  });
  document.querySelector('#libraryTotal').textContent = library.length;
  document.querySelector('#discoveryCount').textContent = library.length;
}

function renderPlaced() {
  canvas.querySelectorAll('.element-card').forEach(node => node.remove());
  placed.forEach((entry, index) => {
    const item = library.find(element => element.id === entry.id);
    if (item) createCard(item, entry.x, entry.y, index);
  });
  hint.classList.toggle('hidden', placed.length > 0);
}

function createCard(item, x, y, index) {
  const card = document.createElement('div');
  card.className = 'element-card';
  card.dataset.index = index;
  card.style.left = `${x}%`;
  card.style.top = `${y}%`;
  card.innerHTML = `<span class="element-symbol" style="background:${item.color}">${item.symbol}</span><span><span class="element-name">${item.name}</span><span class="element-type">${item.type}</span></span>`;
  card.addEventListener('pointerdown', event => beginCardDrag(event, card));
  canvas.appendChild(card);
}

function placeElement(item, x, y) {
  placed.push({ id: item.id, x: Math.min(86, Math.max(5, x)), y: Math.min(84, Math.max(17, y)) });
  save(); renderPlaced();
}

function startDrag(event, item) {
  event.dataTransfer.setData('text/plain', item.id);
}

function beginCardDrag(event, card) {
  event.preventDefault();
  selected = card;
  card.classList.add('dragging');
  dragBounds = canvas.getBoundingClientRect();
  const rect = card.getBoundingClientRect();
  dragOffset = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  selected.setPointerCapture(event.pointerId);
  selected.addEventListener('pointermove', moveCard);
  selected.addEventListener('pointerup', endCardDrag, { once: true });
  selected.addEventListener('pointercancel', endCardDrag, { once: true });
}

function moveCard(event) {
  if (!selected || !dragBounds) return;
  const x = ((event.clientX - dragBounds.left - dragOffset.x) / dragBounds.width) * 100;
  const y = ((event.clientY - dragBounds.top - dragOffset.y) / dragBounds.height) * 100;
  selected.style.left = `${Math.min(86, Math.max(1, x))}%`;
  selected.style.top = `${Math.min(84, Math.max(1, y))}%`;
}

function endCardDrag(event) {
  if (!selected) return;
  selected.classList.remove('dragging');
  selected.releasePointerCapture?.(event.pointerId);
  selected.removeEventListener('pointermove', moveCard);
  const index = Number(selected.dataset.index);
  const x = parseFloat(selected.style.left);
  const y = parseFloat(selected.style.top);
  placed[index] = { ...placed[index], x, y };
  const target = [...canvas.querySelectorAll('.element-card')].find(card => card !== selected && overlaps(selected, card));
  if (target) combine(index, Number(target.dataset.index));
  else save();
  dragBounds = null;
  selected = null;
}

function overlaps(first, second) {
  const a = first.getBoundingClientRect(); const b = second.getBoundingClientRect();
  return !(a.right < b.left + 25 || a.left > b.right - 25 || a.bottom < b.top + 25 || a.top > b.bottom - 25);
}

function combine(firstIndex, secondIndex) {
  const first = library.find(item => item.id === placed[firstIndex].id);
  const second = library.find(item => item.id === placed[secondIndex].id);
  const recipe = recipes[[first.id, second.id].sort().join('+')];
  if (!recipe) { showToast('Nothing new... yet'); return; }
  const position = placed[firstIndex];
  placed = placed.filter((_, index) => index !== firstIndex && index !== secondIndex);
  if (!library.some(item => item.id === recipe.id)) { library.push(recipe); showToast(`${first.name} + ${second.name} = ${recipe.name}`); document.querySelector('#newCount').textContent = '1 new today'; }
  else showToast(`${recipe.name} is already in your library`);
  placed.push({ id: recipe.id, x: position.x, y: position.y });
  save(); renderLibrary(searchInput.value); renderPlaced();
}

function showToast(message) {
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => toast.classList.remove('show'), 2200);
}

canvas.addEventListener('dragover', event => event.preventDefault());
canvas.addEventListener('drop', event => {
  event.preventDefault();
  const item = library.find(element => element.id === event.dataTransfer.getData('text/plain'));
  if (!item) return;
  const bounds = canvas.getBoundingClientRect();
  placeElement(item, ((event.clientX - bounds.left) / bounds.width) * 100 - 7, ((event.clientY - bounds.top) / bounds.height) * 100 - 5);
});
searchInput.addEventListener('input', event => renderLibrary(event.target.value));
document.addEventListener('keydown', event => { if (event.key === '/' && document.activeElement !== searchInput) { event.preventDefault(); searchInput.focus(); } });
document.querySelector('#resetButton').addEventListener('click', () => { if (confirm('Clear your canvas and discoveries?')) { library = [...initialElements]; placed = []; save(); renderLibrary(); renderPlaced(); } });
renderLibrary(); renderPlaced();