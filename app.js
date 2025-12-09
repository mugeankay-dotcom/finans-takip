// Data Storage
let transactions = JSON.parse(localStorage.getItem('transactions')) || [];
let assets = JSON.parse(localStorage.getItem('assets')) || [];
let trades = JSON.parse(localStorage.getItem('trades')) || [];

// Constants
const assetTypes = {
    try: { name: 'Türk Lirası', icon: 'fa-lira-sign', unit: '₺' },
    gold: { name: 'Altın', icon: 'fa-coins', unit: 'gr' },
    silver: { name: 'Gümüş', icon: 'fa-ring', unit: 'gr' },
    usd: { name: 'Dolar', icon: 'fa-dollar-sign', unit: '$' },
    eur: { name: 'Euro', icon: 'fa-euro-sign', unit: '€' },
    fund: { name: 'Fon', icon: 'fa-chart-pie', unit: 'Adet' },
    stock: { name: 'Hisse', icon: 'fa-chart-line', unit: 'Lot' },
    crypto: { name: 'Kripto', icon: 'fa-bitcoin', unit: 'Adet' },
    other: { name: 'Diğer', icon: 'fa-box', unit: 'Adet' }
};

// Live Market Rates
let currentRates = {
    try: 1,
    usd: 0,
    eur: 0,
    gold: 0,
    silver: 0
};

// Fetch rates from API
async function fetchMarketData() {
    try {
        // Using a free API for demo (ExchangeRate-API)
        // Base: USD
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        const usdToTry = data.rates.TRY;
        const usdToEur = data.rates.EUR;

        currentRates.usd = usdToTry;
        currentRates.eur = usdToTry / usdToEur;
        currentRates.try = 1;

        // Gold estimation (Approximate via Ounce)
        const ouncePriceUsd = 2650; // Manual fallback or fetch if possible
        // Better: 1 Ounce = 31.1g. 
        // We can just set a manual approximate or leave 0 if not available
        // For accurate Gold, we need a gold API. 
        // Utilizing USD relationship for rough estimate:
        currentRates.gold = (ouncePriceUsd / 31.1) * usdToTry;

        updateUI();
    } catch (err) {
        console.log("Market fetch error", err);
    }
}

const bankNames = {
    hsbc: 'HSBC',
    garanti: 'Garanti BBVA',
    albaraka: 'Albaraka Türk',
    other: 'Diğer'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    updateUI();
    document.getElementById('currentDate').textContent = new Date().toLocaleDateString('tr-TR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Set default dates to today
    document.getElementById('assetDate').valueAsDate = new Date();
    document.getElementById('transDate').valueAsDate = new Date();

    // Initial Fetch
    fetchMarketData();
    setInterval(fetchMarketData, 60000); // Update every minute
});

// Dynamic Asset Form
window.toggleAssetFields = function () {
    const type = document.getElementById('assetType').value;
    const priceGroup = document.getElementById('assetPriceGroup');
    const priceInput = document.getElementById('assetPrice');

    if (type === 'try') {
        priceGroup.style.display = 'none';
        priceInput.value = 1;
    } else {
        priceGroup.style.display = 'block';
        // Clear value if it was 1? Or keep it.
        if (priceInput.value == 1) priceInput.value = '';
    }
}

// Navigation
window.showTab = function (tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
    // Find the button that called this and add active class
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });
}

// Modals
window.openModal = function (modalId) {
    document.getElementById(modalId).style.display = 'flex';
}

// Reset editing state when modal closes
const originalCloseModal = window.closeModal;
window.closeModal = function (modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'assetModal') {
        editingAssetId = null;
        document.querySelector('#assetModal h2').textContent = 'Yeni Varlık Ekle';
        document.getElementById('assetForm').reset();
        document.getElementById('assetDate').valueAsDate = new Date();
    } else if (modalId === 'sellModal') {
        document.getElementById('sellForm').reset();
        document.getElementById('sellingAssetId').value = '';
    }
}

window.onclick = function (event) {
    if (event.target.classList.contains('modal')) {
        closeModal(event.target.id);
    }
}

// Format Currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(amount);
}

// Transactions
document.getElementById('transactionForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const transaction = {
        id: Date.now(),
        type: document.querySelector('input[name="transType"]:checked').value,
        category: document.getElementById('transCategory').value,
        amount: parseFloat(document.getElementById('transAmount').value),
        date: document.getElementById('transDate').value
    };

    transactions.unshift(transaction);
    saveData();
    updateUI();
    closeModal('transactionModal');
    e.target.reset();
    document.getElementById('transDate').valueAsDate = new Date();
});

// Assets
let editingAssetId = null;

document.getElementById('assetForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const bankSelect = document.getElementById('assetBank');
    const typeSelect = document.getElementById('assetType');
    const amountInput = document.getElementById('assetAmount');
    const priceInput = document.getElementById('assetPrice');
    const dateInput = document.getElementById('assetDate');

    const assetData = {
        id: editingAssetId || Date.now(),
        bank: bankSelect ? bankSelect.value : 'other',
        type: typeSelect.value,
        amount: parseFloat(amountInput.value),
        price: parseFloat(priceInput.value),
        date: dateInput.value
    };

    if (editingAssetId) {
        const index = assets.findIndex(a => a.id === editingAssetId);
        if (index !== -1) {
            assets[index] = assetData;
        }
        editingAssetId = null;
        document.querySelector('#assetModal h2').textContent = 'Yeni Varlık Ekle';
    } else {
        assets.unshift(assetData);
    }

    saveData();
    updateUI();
    closeModal('assetModal');
    e.target.reset();
    document.getElementById('assetDate').valueAsDate = new Date();
});

// Data Management
function saveData() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('trades', JSON.stringify(trades));
}

// Global Actions
window.deleteTransaction = function (id) {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

window.deleteAsset = function (id) {
    if (confirm('Bu varlığı silmek istediğinize emin misiniz?')) {
        assets = assets.filter(a => a.id !== id);
        saveData();
        updateUI();
    }
}

window.editAsset = function (id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    editingAssetId = asset.id;
    document.querySelector('#assetModal h2').textContent = 'Varlık Düzenle';

    if (document.getElementById('assetBank')) document.getElementById('assetBank').value = asset.bank;
    document.getElementById('assetType').value = asset.type;
    document.getElementById('assetAmount').value = asset.amount;
    document.getElementById('assetPrice').value = asset.price;
    document.getElementById('assetDate').value = asset.date;

    openModal('assetModal');
}

// UI Updates
function updateUI() {
    updateDashboard();
    renderTransactions();
    renderAssets();
    renderInvestments();
}

function updateDashboard() {
    // Calculate Monthly Income/Expense
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        }
    });

    document.getElementById('monthlyIncome').textContent = formatCurrency(income);
    document.getElementById('monthlyExpense').textContent = formatCurrency(expense);

    // Calculate Total Wealth
    let totalAssetValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
    let netCash = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

    document.getElementById('totalWealth').textContent = formatCurrency(totalAssetValue + netCash);

    calculatePortfolioSummary();
}

function calculatePortfolioSummary() {
    let totalPL = 0;
    let totalCost = 0;

    assets.forEach(asset => {
        const rate = currentRates[asset.type] || 0;
        const cost = asset.amount * asset.price;
        totalCost += cost;

        if (rate > 0) {
            const currentVal = asset.amount * rate;
            totalPL += (currentVal - cost);
        }
    });

    const plEl = document.getElementById('periodProfitLoss');
    const plPercEl = document.getElementById('plPercentage');

    if (plEl) {
        plEl.textContent = formatCurrency(totalPL);
        plEl.className = totalPL >= 0 ? 'amount profit' : 'amount loss';
        plEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';

        if (totalCost > 0) {
            const perc = (totalPL / totalCost) * 100;
            plPercEl.textContent = `(%${perc.toFixed(2)})`;
            plPercEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';
        }
    }
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    const recentList = document.getElementById('recentList');
    list.innerHTML = '';
    recentList.innerHTML = '';

    transactions.forEach((t, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            <div class="item-info">
                <h4>${t.category}</h4>
                <small>${new Date(t.date).toLocaleDateString('tr-TR')}</small>
            </div>
            <div class="item-right">
                <span class="item-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </span>
                <button onclick="deleteTransaction(${t.id})" style="border:none; background:none; color:#9ca3af; cursor:pointer; margin-left:10px;"><i class="fas fa-trash"></i></button>
            </div>
        `;

        list.appendChild(item);
        if (index < 5) recentList.appendChild(item.cloneNode(true));
    });
}

function renderAssets() {
    const grid = document.getElementById('assetsList');
    grid.innerHTML = '';

    assets.forEach(asset => {
        const typeInfo = assetTypes[asset.type] || assetTypes.other;
        const bankName = bankNames[asset.bank] || 'Diğer';
        const totalCost = asset.amount * asset.price;

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-header">
                <h3><i class="fas ${typeInfo.icon}"></i> ${typeInfo.name}</h3>
                <div>
                    <button onclick="editAsset(${asset.id})" style="border:none; background:none; color:#4f46e5; cursor:pointer; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteAsset(${asset.id})" style="border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </div>
            <div class="asset-details">
                <div style="grid-column: span 2; margin-bottom: 5px;">
                    <span class="detail-label">Kurum</span>
                    <strong>${bankName}</strong>
                </div>
                <div>
                    <span class="detail-label">Miktar</span>
                    <strong>${asset.amount} ${typeInfo.unit}</strong>
                </div>
                
                ${asset.type !== 'try' ? `
                <div>
                    <span class="detail-label">Alış Fiyatı</span>
                    <strong>${formatCurrency(asset.price)}</strong>
                </div>
                ` : ''}

                <div>
                    <span class="detail-label">Alış Tarihi</span>
                    <strong>${new Date(asset.date).toLocaleDateString('tr-TR')}</strong>
                </div>
                <div>
                    <span class="detail-label">Toplam Maliyet</span>
                    <strong>${formatCurrency(totalCost)}</strong>
                </div>
                 
                 <!-- P/L Row -->
                 ${(() => {
                const rate = currentRates[asset.type] || 0;
                if (rate > 0 && asset.type !== 'try') {
                    const currentVal = asset.amount * rate;
                    const pl = currentVal - totalCost;
                    const color = pl >= 0 ? '#10b981' : '#ef4444';
                    return `
                         <div style="grid-column: span 2; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                            <span class="detail-label">Güncel Değer / Kar-Zarar</span>
                            <strong style="color: ${color}">${formatCurrency(currentVal)} (${formatCurrency(pl)})</strong>
                         </div>
                         `;
                }
                return '';
            })()}

            </div>
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('assets', JSON.stringify(assets));
    localStorage.setItem('trades', JSON.stringify(trades));
}

// Global Actions
window.deleteTransaction = function (id) {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
        transactions = transactions.filter(t => t.id !== id);
        saveData();
        updateUI();
    }
}

window.deleteAsset = function (id) {
    if (confirm('Bu varlığı silmek istediğinize emin misiniz?')) {
        assets = assets.filter(a => a.id !== id);
        saveData();
        updateUI();
    }
}

window.editAsset = function (id) {
    const asset = assets.find(a => a.id === id);
    if (!asset) return;

    editingAssetId = asset.id;
    document.querySelector('#assetModal h2').textContent = 'Varlık Düzenle';

    if (document.getElementById('assetBank')) document.getElementById('assetBank').value = asset.bank;
    document.getElementById('assetType').value = asset.type;
    document.getElementById('assetAmount').value = asset.amount;
    document.getElementById('assetPrice').value = asset.price;
    document.getElementById('assetDate').value = asset.date;

    openModal('assetModal');
}

// UI Updates
function updateUI() {
    updateDashboard();
    renderTransactions();
    renderAssets();
    renderInvestments();
}

function updateDashboard() {
    // Calculate Monthly Income/Expense
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    let income = 0;
    let expense = 0;

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear) {
            if (t.type === 'income') income += t.amount;
            else expense += t.amount;
        }
    });

    document.getElementById('monthlyIncome').textContent = formatCurrency(income);
    document.getElementById('monthlyExpense').textContent = formatCurrency(expense);

    // Calculate Total Wealth
    let totalAssetValue = assets.reduce((sum, asset) => sum + (asset.amount * asset.price), 0);
    let netCash = transactions.reduce((sum, t => t.type === 'income' ? sum + t.amount : sum - t.amount), 0);

    document.getElementById('totalWealth').textContent = formatCurrency(totalAssetValue + netCash);

    calculatePortfolioSummary();
}

function calculatePortfolioSummary() {
    let totalPL = 0;
    let totalCost = 0;

    assets.forEach(asset => {
        const rate = currentRates[asset.type] || 0;
        const cost = asset.amount * asset.price;
        totalCost += cost;

        if (rate > 0) {
            const currentVal = asset.amount * rate;
            totalPL += (currentVal - cost);
        }
    });

    const plEl = document.getElementById('periodProfitLoss');
    const plPercEl = document.getElementById('plPercentage');

    if (plEl) {
        plEl.textContent = formatCurrency(totalPL);
        plEl.className = totalPL >= 0 ? 'amount profit' : 'amount loss';
        plEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';

        if (totalCost > 0) {
            const perc = (totalPL / totalCost) * 100;
            plPercEl.textContent = `(% ${ perc.toFixed(2) })`;
            plPercEl.style.color = totalPL >= 0 ? '#10b981' : '#ef4444';
        }
    }
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    const recentList = document.getElementById('recentList');
    list.innerHTML = '';
    recentList.innerHTML = '';

    transactions.forEach((t, index) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        item.innerHTML = `
            < div class="item-info" >
                <h4>${t.category}</h4>
                <small>${new Date(t.date).toLocaleDateString('tr-TR')}</small>
            </div >
            <div class="item-right">
                <span class="item-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </span>
                <button onclick="deleteTransaction(${t.id})" style="border:none; background:none; color:#9ca3af; cursor:pointer; margin-left:10px;"><i class="fas fa-trash"></i></button>
            </div>
        `;

        list.appendChild(item);
        if (index < 5) recentList.appendChild(item.cloneNode(true));
    });
}

function renderAssets() {
    const grid = document.getElementById('assetsList');
    grid.innerHTML = '';

    assets.forEach(asset => {
        const typeInfo = assetTypes[asset.type] || assetTypes.other;
        const bankName = bankNames[asset.bank] || 'Diğer';
        const totalCost = asset.amount * asset.price;

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            < div class="asset-header" >
                <h3><i class="fas ${typeInfo.icon}"></i> ${typeInfo.name}</h3>
                <div>
                    <button onclick="editAsset(${asset.id})" style="border:none; background:none; color:#4f46e5; cursor:pointer; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteAsset(${asset.id})" style="border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
            </div >
            <div class="asset-details">
                <div style="grid-column: span 2; margin-bottom: 5px;">
                    <span class="detail-label">Kurum</span>
                    <strong>${bankName}</strong>
                </div>
                <div>
                    <span class="detail-label">Miktar</span>
                    <strong>${asset.amount} ${typeInfo.unit}</strong>
                </div>

                ${asset.type !== 'try' ? `
                <div>
                    <span class="detail-label">Alış Fiyatı</span>
                    <strong>${formatCurrency(asset.price)}</strong>
                </div>
                ` : ''}

                <div>
                    <span class="detail-label">Alış Tarihi</span>
                    <strong>${new Date(asset.date).toLocaleDateString('tr-TR')}</strong>
                </div>
                <div>
                    <span class="detail-label">Toplam Maliyet</span>
                    <strong>${formatCurrency(totalCost)}</strong>
                </div>

                <!-- P/L Row -->
                ${(() => {
                    const rate = currentRates[asset.type] || 0;
                    if (rate > 0 && asset.type !== 'try') {
                        const currentVal = asset.amount * rate;
                        const pl = currentVal - totalCost;
                        const color = pl >= 0 ? '#10b981' : '#ef4444';
                        return `
                         <div style="grid-column: span 2; margin-top: 5px; border-top: 1px solid #eee; padding-top: 5px;">
                            <span class="detail-label">Güncel Değer / Kar-Zarar</span>
                            <strong style="color: ${color}">${formatCurrency(currentVal)} (${formatCurrency(pl)})</strong>
                         </div>
                         `;
                    }
                    return '';
                })()}

            </div>
        `;
        grid.appendChild(card);
    });
}

// Investment Logic (Single List)
function renderInvestments() {
    const listBody = document.getElementById('investmentListBody');
    if (!listBody) return; // Guard clause
    listBody.innerHTML = '';

    assets.forEach(asset => {
        const typeInfo = assetTypes[asset.type] || assetTypes.other;
        const currentRate = currentRates[asset.type] || 0;
        const totalCost = asset.amount * asset.price;
        let currentVal = 0;
        let pl = 0;
        
        if (asset.type === 'try') {
            currentVal = asset.amount;
            pl = 0;
        } else if (currentRate > 0) {
            currentVal = asset.amount * currentRate;
            pl = currentVal - totalCost;
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            < td > <i class="fas ${typeInfo.icon}"></i> ${ typeInfo.name } <br> <small>${asset.amount} ${typeInfo.unit}</small></td>
            <td>${new Date(asset.date).toLocaleDateString('tr-TR')}</td>
            <td>${asset.type === 'try' ? '-' : formatCurrency(asset.price)}</td>
            <td>${asset.type === 'try' ? '-' : formatCurrency(currentRate)}</td>
            <td style="color: ${pl >= 0 ? '#10b981' : '#ef4444'}; font-weight: bold;">
                ${asset.type === 'try' ? '-' : formatCurrency(pl)}
            </td>
        `;
        listBody.appendChild(row);
    });
}
// Removed openSellModal and Sell Logic as user requested "Remove Al/Sat".
