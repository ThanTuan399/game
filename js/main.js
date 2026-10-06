import { Game } from './game.js';
import { createTown, randomConfig } from './townGenerator.js';
import { hasSave, loadGame } from './save.js';
import {
  TOOL_DEFS,
  getItemMeta,
  getQuest,
  getShopStock
} from './content.js';
import {
  currentTownLevel,
  formatCost,
  getHomeUpgradeCost,
  getToolUpgradeCost,
  nextTownLevel
} from './systems/progression.js';

const $ = id => document.getElementById(id);

const menu = $('menuScreen');
const create = $('createScreen');
const gameScreen = $('gameScreen');
const canvas = $('gameCanvas');

const ui = {
  town: $('townHud'),
  date: $('dateHud'),
  time: $('timeHud'),
  weather: $('weatherHud'),
  money: $('moneyHud'),
  energy: $('energyHud'),
  stamina: $('staminaHud'),
  reputation: $('reputationHud'),
  level: $('levelHud'),
  toolButtons: [],

  showGame() {
    menu.classList.remove('active');
    create.classList.remove('active');
    gameScreen.classList.add('active');
  },

  showMenu() {
    gameScreen.classList.remove('active');
    create.classList.remove('active');
    menu.classList.add('active');
    updateContinueButton();
  },

  toast(message) {
    const toast = $('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.remove('show'), 2200);
  },

  showDialogue(name, lines) {
    $('dialogueName').textContent = name;
    const messages = Array.isArray(lines) ? [...lines] : [lines];
    let index = 0;

    $('dialogueText').textContent = messages[0] || '';
    $('dialogueBox').classList.remove('hidden');
    $('dialogueClose').textContent = messages.length > 1 ? 'Tiếp' : 'Đóng';

    $('dialogueClose').onclick = () => {
      if (index < messages.length - 1) {
        index += 1;
        $('dialogueText').textContent = messages[index];
        $('dialogueClose').textContent = index === messages.length - 1 ? 'Đóng' : 'Tiếp';
      } else {
        $('dialogueBox').classList.add('hidden');
      }
    };
  },

  showShop(game) {
    const wrap = $('shopItems');
    wrap.innerHTML = '';

    const stock = getShopStock(game.state.season, game.state.townLevel);

    if (!stock.length) {
      wrap.innerHTML = '<div class="shop-item">Hôm nay chợ chưa có mặt hàng phù hợp.</div>';
    }

    for (const itemId of stock) {
      const meta = getItemMeta(itemId);
      const element = document.createElement('div');
      element.className = 'shop-item';
      element.innerHTML = `
        <b>${meta.icon} ${meta.name}</b>
        <div>${meta.buy} 💰</div>
        <button>MUA</button>
      `;

      element.querySelector('button').onclick = () => {
        if (game.buy(itemId)) this.refreshInventory(game);
      };

      wrap.appendChild(element);
    }

    const bonus = game.marketBonusForToday();
    const sell = document.createElement('div');
    sell.className = 'shop-item shop-sell-all';
    sell.innerHTML = `
      <b>📦 Bán vật phẩm</b>
      <p>${bonus.multiplier > 1
        ? `${bonus.label}: nhóm hàng phù hợp được ×${bonus.multiplier} giá bán hôm nay.`
        : 'Bán toàn bộ nông sản, cá và tài nguyên có giá bán.'}</p>
      <button>BÁN TẤT CẢ</button>
    `;

    sell.querySelector('button').onclick = () => {
      game.sellAllInventory();
      this.refreshInventory(game);
      this.showShop(game);
    };

    wrap.appendChild(sell);
    $('shopBox').classList.remove('hidden');
  },

  showMap(world) {
    const overlay = $('mapOverlay');
    overlay.classList.remove('hidden');

    const mapCanvas = $('mapCanvas');
    const ctx = mapCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const sx = mapCanvas.width / world.width;
    const sy = mapCanvas.height / world.height;

    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        const tile = world.map.tiles[y][x];
        const color = tile === 'water'
          ? '#4b9db5'
          : tile === 'soil'
            ? '#936749'
            : tile === 'path'
              ? '#c79b64'
              : tile === 'sand'
                ? '#e4cc83'
                : tile === 'rock'
                  ? '#777b78'
                  : tile === 'forest'
                    ? '#427a52'
                    : world.town.colors.grass;

        ctx.fillStyle = color;
        ctx.fillRect(x * sx, y * sy, Math.ceil(sx), Math.ceil(sy));
      }
    }

    ctx.fillStyle = '#fff';
    ctx.font = '10px monospace';
    ctx.fillText(world.town.name, 8, 16);
  },

  toggleInventory(game) {
    const box = $('inventoryBox');

    if (box.classList.contains('hidden')) {
      box.classList.remove('hidden');
      this.refreshInventory(game);
    } else {
      box.classList.add('hidden');
    }
  },

  refreshInventory(game) {
    if (!game) return;

    const wrap = $('inventoryItems');
    wrap.innerHTML = '';

    const entries = Object.entries(game.state.inventory)
      .filter(([, count]) => count > 0)
      .sort(([a], [b]) => getItemMeta(a).name.localeCompare(getItemMeta(b).name, 'vi'));

    if (!entries.length) {
      wrap.innerHTML = '<div class="inventory-item">Túi đang trống.</div>';
      return;
    }

    for (const [itemId, count] of entries) {
      const meta = getItemMeta(itemId);
      const element = document.createElement('div');
      element.className = 'inventory-item';
      element.innerHTML = `
        <span class="item-icon">${meta.icon}</span>
        <b>${meta.name}</b>
        <span>× ${count}</span>
      `;
      wrap.appendChild(element);
    }
  },

  showJournal(game) {
    const summary = game.getProgressSummary();
    const quest = summary.quest;
    const have = game.state.inventory[quest.item] || 0;
    const next = summary.next;

    const goalsHtml = summary.goals.map(goal => `
      <div class="journal-row ${goal.claimed ? 'done' : ''}">
        <span>${goal.claimed ? '✅' : '▫️'} ${goal.label}</span>
        <b>${goal.progress}/${goal.target}</b>
      </div>
    `).join('');

    const achievements = game.state.achievements.length
      ? game.state.achievements.map(id => `<span class="badge">🏆 ${id}</span>`).join('')
      : '<span class="muted">Chưa mở thành tựu.</span>';

    $('journalContent').innerHTML = `
      <div class="journal-section">
        <h3>🌟 Tiến trình quê hương</h3>
        <p><b>Cấp ${summary.current.level}</b> — ${summary.current.title}</p>
        <p>Danh tiếng: <b>${game.state.reputation}</b>${next ? ` / ${next.min} để lên cấp ${next.level}` : ' · Đã đạt cấp tối đa'}</p>
        <p>Mục tiêu cốt truyện: đạt cấp 5, hoàn thành ít nhất 8 nhiệm vụ và nâng nhà lên cấp 2.</p>
        <p><b>${summary.storyComplete ? '✅ Cốt truyện chính đã hoàn thành — đang ở chế độ tự do.' : '⏳ Quê hương vẫn đang được xây dựng.'}</b></p>
      </div>

      <div class="journal-section">
        <h3>📜 Nhiệm vụ chính</h3>
        <p><b>${quest.name}</b></p>
        <p>${quest.text}</p>
        <p>Tiến độ: <b>${have}/${quest.amount}</b> · Thưởng ${quest.reward}💰 + ${quest.reputation} danh tiếng</p>
      </div>

      <div class="journal-section">
        <h3>📅 Mục tiêu hôm nay</h3>
        ${goalsHtml}
      </div>

      <div class="journal-section">
        <h3>📊 Thống kê</h3>
        <div class="stats-grid">
          <span>Thu hoạch <b>${game.state.stats.harvested}</b></span>
          <span>Câu cá <b>${game.state.stats.fishCaught}</b></span>
          <span>Chặt cây <b>${game.state.stats.treesCut}</b></span>
          <span>Khai thác <b>${game.state.stats.rocksMined}</b></span>
          <span>Nhiệm vụ <b>${game.state.stats.questsCompleted}</b></span>
          <span>Tiền đã kiếm <b>${game.state.stats.moneyEarned}</b></span>
        </div>
      </div>

      <div class="journal-section">
        <h3>🏆 Thành tựu</h3>
        <div class="badge-list">${achievements}</div>
      </div>
    `;

    $('journalBox').classList.remove('hidden');
  },

  showHome(game) {
    const cost = getHomeUpgradeCost(game.state.homeLevel);

    $('homeContent').innerHTML = `
      <p><b>Nhà cấp ${game.state.homeLevel}</b></p>
      <p>Ngủ sẽ chuyển sang ngày mới, cây trồng xử lý tăng trưởng và hồi đầy thể lực.</p>
      <p>Thể lực tối đa hiện tại: <b>${game.player.maxEnergy}</b></p>
      <p>Nâng cấp tiếp: <b>${formatCost(cost)}</b></p>
      <div class="action-row">
        <button id="sleepBtn" class="action-btn">🌙 NGỦ SANG NGÀY MỚI</button>
        <button id="upgradeHomeBtn" class="action-btn secondary" ${cost ? '' : 'disabled'}>🏠 NÂNG CẤP NHÀ</button>
      </div>
    `;

    $('homeBox').classList.remove('hidden');

    $('sleepBtn').onclick = () => {
      $('homeBox').classList.add('hidden');
      game.sleep(false);
    };

    $('upgradeHomeBtn').onclick = () => game.upgradeHome();
  },

  showWorkshop(game) {
    const labels = {
      hoe: 'Cuốc',
      water: 'Bình tưới',
      axe: 'Rìu',
      pickaxe: 'Cuốc đá',
      fishing: 'Cần câu'
    };

    const wrap = $('workshopItems');
    wrap.innerHTML = '';

    for (const [toolKey, label] of Object.entries(labels)) {
      const level = game.state.toolLevels[toolKey] || 1;
      const cost = getToolUpgradeCost(level);
      const element = document.createElement('div');
      element.className = 'shop-item';
      element.innerHTML = `
        <b>🔧 ${label} cấp ${level}</b>
        <p>${cost ? formatCost(cost) : 'Đã đạt cấp tối đa'}</p>
        <button ${cost ? '' : 'disabled'}>${cost ? 'NÂNG CẤP' : 'TỐI ĐA'}</button>
      `;

      element.querySelector('button').onclick = () => game.upgradeTool(toolKey);
      wrap.appendChild(element);
    }

    $('workshopBox').classList.remove('hidden');
  },

  isBlocking() {
    const blockingIds = [
      'dialogueBox',
      'shopBox',
      'inventoryBox',
      'settingsBox',
      'mapOverlay',
      'journalBox',
      'homeBox',
      'workshopBox'
    ];

    return blockingIds.some(id => !$(id).classList.contains('hidden'));
  },

  closeTopOverlay() {
    const priority = [
      'settingsBox',
      'journalBox',
      'homeBox',
      'workshopBox',
      'mapOverlay',
      'shopBox',
      'inventoryBox',
      'dialogueBox'
    ];

    const open = priority.find(id => !$(id).classList.contains('hidden'));
    if (open) $(open).classList.add('hidden');
  },

  closeAllOverlays() {
    [
      'settingsBox',
      'journalBox',
      'homeBox',
      'workshopBox',
      'mapOverlay',
      'shopBox',
      'inventoryBox',
      'dialogueBox'
    ].forEach(id => $(id).classList.add('hidden'));
  },

  onSave() {
    updateContinueButton();
  }
};

function setupTools() {
  const bar = $('toolBar');
  bar.innerHTML = '';
  ui.toolButtons.length = 0;

  for (const tool of TOOL_DEFS) {
    const button = document.createElement('button');
    button.className = 'tool';
    button.dataset.tool = tool.id;
    button.title = tool.hotkey ? `${tool.name} · phím ${tool.hotkey}` : tool.name;
    button.innerHTML = `<span>${tool.icon}</span>${tool.hotkey ? `<small>${tool.hotkey}</small>` : ''}`;
    bar.appendChild(button);
    ui.toolButtons.push(button);
  }

  ui.toolButtons[0]?.classList.add('selected');
}

function renderPreview(town) {
  const preview = $('previewCanvas');
  const ctx = preview.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = town.colors.grass;
  ctx.fillRect(0, 0, preview.width, preview.height);

  for (let i = 0; i < 70; i++) {
    const x = (i * 61 + town.seed) % preview.width;
    const y = (i * 37 + town.seed / 3) % preview.height;

    ctx.fillStyle = i % 3 ? '#4e9153' : '#2e7048';
    ctx.fillRect(x, y, 6, 6);
  }

  if (town.river) {
    ctx.fillStyle = '#519db2';
    ctx.fillRect(205, 0, 25, 240);

    ctx.fillStyle = '#7fd2d0';
    for (let y = 0; y < 240; y += 16) {
      ctx.fillRect(207, y, 10, 2);
    }
  }

  ctx.fillStyle = '#9b6b48';
  ctx.fillRect(120, 122, 190, 8);
  ctx.fillRect(205, 60, 8, 120);

  ctx.fillStyle = '#cc694b';
  ctx.fillRect(172, 96, 42, 23);

  ctx.fillStyle = '#efd39b';
  ctx.fillRect(178, 104, 30, 15);

  ctx.fillStyle = '#477c4b';

  for (let i = 0; i < 12; i++) {
    ctx.fillRect(20 + i * 33, 35 + (i % 2) * 18, 12, 18);
    ctx.fillStyle = '#2b6646';
    ctx.fillRect(18 + i * 33, 28 + (i % 2) * 18, 16, 10);
    ctx.fillStyle = '#477c4b';
  }

  ctx.fillStyle = '#fff0c4';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(town.name, 16, 226);
}

function updateSummary() {
  const town = createTown({
    townName: $('townName').value,
    seed: $('seedInput').value,
    biome: document.querySelector('.biome-card.selected')?.dataset.biome || 'plains',
    style: $('styleSelect').value
  });

  renderPreview(town);

  $('worldSummary').innerHTML = `
    <b>${town.name}</b><br>
    Địa hình: ${town.terrain}<br>
    Khí hậu: ${town.climate}<br>
    Dân số: ${town.population} người · Sông: ${town.river ? 'Có' : 'Không'} · Rừng: ${town.forest ? 'Có' : 'Không'}<br>
    Đặc sản: ${town.crops.join(' · ')}
  `;
}

const biomes = [
  ['plains', '🌾', 'Đồng bằng'],
  ['mountain', '⛰️', 'Vùng núi'],
  ['rice', '🌱', 'Đồng ruộng'],
  ['riverside', '🌊', 'Ven sông'],
  ['beach', '🏝️', 'Ven biển'],
  ['tropical', '🌴', 'Nhiệt đới'],
  ['forest', '🌲', 'Vùng rừng'],
  ['valley', '🏞️', 'Thung lũng']
];

function setupCreate() {
  const wrap = $('biomeCards');

  for (const [id, icon, name] of biomes) {
    const button = document.createElement('button');
    button.className = 'biome-card';
    button.dataset.biome = id;
    button.innerHTML = `<span class="biome-icon">${icon}</span>${name}`;

    button.onclick = () => {
      document.querySelectorAll('.biome-card').forEach(item => item.classList.remove('selected'));
      button.classList.add('selected');
      updateSummary();
    };

    wrap.appendChild(button);
  }

  wrap.firstElementChild.classList.add('selected');

  $('styleSelect').innerHTML = ['village', 'storybook', 'lush', 'coastal', 'mountain']
    .map(style => `<option value="${style}">${style}</option>`)
    .join('');

  ['townName', 'seedInput', 'styleSelect'].forEach(id => {
    $(id).addEventListener('input', updateSummary);
  });

  updateSummary();
}

function newWorld() {
  const town = createTown({
    townName: $('townName').value,
    seed: $('seedInput').value,
    biome: document.querySelector('.biome-card.selected')?.dataset.biome || 'plains',
    style: $('styleSelect').value
  });

  const game = new Game(canvas, ui);
  window.__GAME = game;

  game.start(town, {
    playerName: $('playerName').value || 'Minh'
  });
}

function updateContinueButton() {
  const button = $('continueBtn');
  const available = hasSave();

  button.disabled = !available;
  button.title = available ? 'Tiếp tục bản lưu gần nhất' : 'Chưa có bản lưu';
}

function openSettings() {
  $('soundToggle').checked = localStorage.getItem('mlh_sound') !== '0';
  $('shakeToggle').checked = localStorage.getItem('mlh_shake') !== '0';
  $('settingsBox').classList.remove('hidden');
}

function closeSettings() {
  localStorage.setItem('mlh_sound', $('soundToggle').checked ? '1' : '0');
  localStorage.setItem('mlh_shake', $('shakeToggle').checked ? '1' : '0');

  if (window.__GAME) {
    window.__GAME.sound = $('soundToggle').checked;
    window.__GAME.shake = $('shakeToggle').checked;
  }

  $('settingsBox').classList.add('hidden');
}

setupTools();
setupCreate();
updateContinueButton();

$('newGameBtn').onclick = () => {
  create.classList.add('active');
  menu.classList.remove('active');
};

$('backMenuBtn').onclick = () => ui.showMenu();
$('generateBtn').onclick = newWorld;

$('randomTownBtn').onclick = () => {
  const random = randomConfig();

  $('townName').value = random.townName;
  $('seedInput').value = random.seed;
  $('styleSelect').value = random.style;

  document.querySelectorAll('.biome-card').forEach(item => {
    item.classList.toggle('selected', item.dataset.biome === random.biome);
  });

  updateSummary();
};

$('continueBtn').onclick = () => {
  const save = loadGame();

  if (!save) {
    alert('Chưa có bản lưu. Hãy tạo thế giới mới.');
    updateContinueButton();
    return;
  }

  const game = new Game(canvas, ui);
  window.__GAME = game;
  game.start(save.town, save.state);
};

$('settingsBtn').onclick = openSettings;
$('settingsClose').onclick = closeSettings;
$('shopClose').onclick = () => $('shopBox').classList.add('hidden');
$('inventoryClose').onclick = () => $('inventoryBox').classList.add('hidden');
$('mapClose').onclick = () => $('mapOverlay').classList.add('hidden');
$('journalClose').onclick = () => $('journalBox').classList.add('hidden');
$('homeClose').onclick = () => $('homeBox').classList.add('hidden');
$('workshopClose').onclick = () => $('workshopBox').classList.add('hidden');

$('fullscreenBtn').onclick = async () => {
  try {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
    } else {
      await document.exitFullscreen();
    }
  } catch {}
};

document.addEventListener('fullscreenchange', () => {
  window.__GAME?.renderer.resize();
});

window.addEventListener('beforeunload', () => {
  if (window.__GAME?.running) window.__GAME.save(true);
});
