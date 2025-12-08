// Data Storage
let transactions = [];
let assets = [];
// Revert to LocalStorage for stability
const isFirebaseReady = false;
const db = null;

let marketRates = {
    USD: 0,
    silver: { name: 'Gümüş', icon: 'fa-ring', unit: 'gr' },
    usd: { name: 'Dolar', icon: 'fa-dollar-sign', unit: '$' },
    eur: { name: 'Euro', icon: 'fa-euro-sign', unit: '€' },
    fund: { name: 'Fon', icon: 'fa-chart-pie', unit: 'Adet' },
    stock: { name: 'Hisse', icon: 'fa-chart-line', unit: 'Lot' },
    crypto: { name: 'Kripto', icon: 'fa-bitcoin', unit: 'Adet' },
    other: { name: 'Diğer', icon: 'fa-box', unit: 'Adet' }
};

// Check if Firebase is valid
// const isFirebaseReady = ... (disabled)


const bankNames = {
    hsbc: 'HSBC',
    garanti: 'Garanti BBVA',
    albaraka: 'Albaraka Türk',
    other: 'Diğer'
};

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Force LocalStorage
    console.log('Using LocalStorage 💾 (Fallback Mode)');
    transactions = JSON.parse(localStorage.getItem('transactions')) || [];
    assets = JSON.parse(localStorage.getItem('assets')) || [];
    populateYearSelect();
    updateUI();

    // Fetch market data
    fetchMarketData();
    setInterval(fetchMarketData, 300000);

    document.getElementById('assetDate').valueAsDate = new Date();
    document.getElementById('transDate').valueAsDate = new Date();
});

// Firebase Subscription
function subscribeToData() {
    // Transactions
    db.collection('transactions').orderBy('date', 'desc').onSnapshot(snapshot => {
        transactions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        populateYearSelect();
        updateUI();
    }, err => console.error("Transactions Sync Error:", err));

    // Assets
    db.collection('assets').onSnapshot(snapshot => {
        assets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateUI();
    }, err => console.error("Assets Sync Error:", err));
}

// Year & Dashboard Logic
function populateYearSelect() {
    const yearSelect = document.getElementById('yearSelect');
    if (!yearSelect) return;

    const currentYear = new Date().getFullYear();
    const years = new Set([currentYear]);

    transactions.forEach(t => {
        years.add(new Date(t.date).getFullYear());
    });

    const sortedYears = Array.from(years).sort((a, b) => b - a);

    // Maintain selection if possible
    const currentVal = yearSelect.value;

    yearSelect.innerHTML = '';
    sortedYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year} Yılı`;
        yearSelect.appendChild(option);
    });

    if (currentVal && sortedYears.includes(parseInt(currentVal))) {
        yearSelect.value = currentVal;
    }

    yearSelect.addEventListener('change', () => {
        updateDashboard();
    });
}

// Market Data Service
async function fetchMarketData() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        const data = await response.json();

        // Base is USD. We need rates in TRY.
        const usdToTry = data.rates.TRY;
        const usdToEur = data.rates.EUR;

        // Calculations
        marketRates.USD = usdToTry; // 1 USD = X TRY
        marketRates.EUR = usdToTry / usdToEur; // 1 EUR = X TRY

        // GOLD ESTIMATION
        const ouncePriceUsd = 4182;
        const gramPriceUsd = ouncePriceUsd / 31.1035;
        marketRates.GA = gramPriceUsd * usdToTry;

        marketRates.lastUpdated = new Date();

        updateUI();
        renderMarket();

    } catch (error) {
        console.error('Market data fetch failed:', error);
        const btn = document.querySelector('#market header button');
        if (btn) btn.innerHTML = '<i class="fas fa-exclamation-circle"></i> Bağlantı Hatası';
    }
}

// Navigation
window.showTab = function (tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    document.getElementById(tabId).classList.add('active');
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

window.closeModal = function (modalId) {
    document.getElementById(modalId).style.display = 'none';
    if (modalId === 'assetModal') {
        editingAssetId = null;
        document.querySelector('#assetModal h2').textContent = 'Yeni Varlık Ekle';
        document.getElementById('assetForm').reset();
        document.getElementById('assetDate').valueAsDate = new Date();
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

// Helper to get current rate for asset type
function getAssetRate(type) {
    if (type === 'usd') return marketRates.USD;
    if (type === 'eur') return marketRates.EUR;
    if (type === 'gold') return marketRates.GA;
    return 0; // No live rate for others
}

// Transactions
// Make save function global to bypass form submit issues
window.saveTransaction = function () {
    try {
        const typeEl = document.querySelector('input[name="transType"]:checked');
        const categoryEl = document.getElementById('transCategory');
        const amountEl = document.getElementById('transAmount');
        const dateEl = document.getElementById('transDate');

        // Manual validation
        if (!categoryEl.value || !amountEl.value || !dateEl.value) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        const transaction = {
            type: typeEl.value,
            category: categoryEl.value,
            amount: parseFloat(amountEl.value),
            date: dateEl.value,
            createdAt: new Date().toISOString()
        };

        // Strict fallback
        if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady) {
            db.collection('transactions').add(transaction)
                .then(() => closeModal('transactionModal'))
                .catch(err => alert('Kayıt hatası: ' + err.message));
        } else {
            transaction.id = Date.now();
            if (!Array.isArray(transactions)) transactions = [];
            transactions.unshift(transaction);
            saveDataLocal();
            updateUI();
            closeModal('transactionModal');
        }

        // Reset form
        document.getElementById('transactionForm').reset();
        document.getElementById('transDate').valueAsDate = new Date(); // Reset date to today

    } catch (error) {
        console.error(error);
        alert("Hata oluştu: " + error.message);
    }
};

// Assets
let editingAssetId = null;

window.saveAsset = function () {
    try {
        const bankSelect = document.getElementById('assetBank');
        const typeSelect = document.getElementById('assetType');
        const amountInput = document.getElementById('assetAmount');
        const priceInput = document.getElementById('assetPrice');
        const dateInput = document.getElementById('assetDate');

        // Manual validation
        if (!typeSelect.value || !amountInput.value || !priceInput.value || !dateInput.value) {
            alert("Lütfen tüm alanları doldurun.");
            return;
        }

        const assetData = {
            bank: bankSelect ? bankSelect.value : 'other',
            type: typeSelect.value,
            amount: parseFloat(amountInput.value),
            price: parseFloat(priceInput.value),
            date: dateInput.value,
            createdAt: new Date().toISOString()
        };

        // Strict fallback
        if (typeof isFirebaseReady !== 'undefined' && isFirebaseReady) {
            if (editingAssetId) {
                db.collection('assets').doc(editingAssetId).update(assetData)
                    .then(() => {
                        editingAssetId = null;
                        document.querySelector('#assetModal h2').textContent = 'Yeni Varlık Ekle';
                        closeModal('assetModal');
                    });
            } else {
                db.collection('assets').add(assetData)
                    .then(() => closeModal('assetModal'));
            }
        } else {
            assetData.id = editingAssetId || Date.now();
            if (editingAssetId) {
                const index = assets.findIndex(a => a.id === editingAssetId);
                if (index !== -1) assets[index] = assetData;
                editingAssetId = null;
            } else {
                if (!Array.isArray(assets)) assets = [];
                assets.unshift(assetData);
            }
            saveDataLocal();
            updateUI();

            // Reset modal title
            document.querySelector('#assetModal h2').textContent = 'Yeni Varlık Ekle';
            closeModal('assetModal');
        }

        // Reset form
        document.getElementById('assetForm').reset();
        document.getElementById('assetDate').valueAsDate = new Date();

    } catch (error) {
        console.error(error);
        alert("Hata oluştu: " + error.message);
    }
};

// Data Management (Local Fallback)
function saveDataLocal() {
    localStorage.setItem('transactions', JSON.stringify(transactions));
    localStorage.setItem('assets', JSON.stringify(assets));
}

// Global Actions
window.deleteTransaction = function (id) {
    if (confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
        if (isFirebaseReady) {
            db.collection('transactions').doc(String(id)).delete().catch(err => {
                // If ID is number (from local), this might fail in firestore if migrated improperly
                // But for new cloud data, ID is string.
                // Assuming we wipe local when going cloud.
                console.error(err);
            });
        } else {
            transactions = transactions.filter(t => t.id !== id);
            saveDataLocal();
            updateUI();
        }
    }
}

window.deleteAsset = function (id) {
    if (confirm('Bu varlığı silmek istediğinize emin misiniz?')) {
        if (isFirebaseReady) {
            db.collection('assets').doc(String(id)).delete();
        } else {
            assets = assets.filter(a => a.id !== id);
            saveDataLocal();
            updateUI();
        }
    }
}

window.editAsset = function (id) {
    // ID can be string (firebase) or number (local)
    // loose comparison check or just find
    const asset = assets.find(a => a.id == id);
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
}

function updateDashboard() {
    const yearSelect = document.getElementById('yearSelect');
    const selectedYear = yearSelect ? parseInt(yearSelect.value) : new Date().getFullYear();

    // 1. Calculate Period Totals (Yearly)
    let periodIncome = 0;
    let periodExpense = 0;

    // 2. Prepare Monthly Data
    const monthsData = Array(12).fill(0).map(() => ({ income: 0, expense: 0 }));

    transactions.forEach(t => {
        const tDate = new Date(t.date);
        if (tDate.getFullYear() === selectedYear) {
            if (t.type === 'income') {
                periodIncome += t.amount;
                monthsData[tDate.getMonth()].income += t.amount;
            } else {
                periodExpense += t.amount;
                monthsData[tDate.getMonth()].expense += t.amount;
            }
        }
    });

    if (document.getElementById('periodIncome'))
        document.getElementById('periodIncome').textContent = formatCurrency(periodIncome);

    if (document.getElementById('periodExpense'))
        document.getElementById('periodExpense').textContent = formatCurrency(periodExpense);

    // 3. Render Monthly Summary Table
    const summaryBody = document.getElementById('monthlySummaryBody');
    if (summaryBody) {
        summaryBody.innerHTML = '';
        const monthNames = [
            'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
            'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
        ];

        monthNames.forEach((name, index) => {
            const m = monthsData[index];
            const net = m.income - m.expense;
            const netClass = net >= 0 ? 'profit' : 'loss';
            const netSign = net > 0 ? '+' : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${name}</td>
                <td class="income-text">${m.income > 0 ? formatCurrency(m.income) : '-'}</td>
                <td class="expense-text">${m.expense > 0 ? formatCurrency(m.expense) : '-'}</td>
                <td class="summary-net ${netClass}">${net !== 0 ? netSign + formatCurrency(net) : '-'}</td>
            `;
            summaryBody.appendChild(row);
        });
    }

    // Calculate Total Wealth
    let totalAssetValue = 0;
    assets.forEach(asset => {
        const rate = getAssetRate(asset.type);
        if (rate > 0) {
            totalAssetValue += asset.amount * rate;
        } else {
            totalAssetValue += asset.amount * asset.price;
        }
    });

    let globalNetCash = transactions.reduce((sum, t) => t.type === 'income' ? sum + t.amount : sum - t.amount, 0);

    document.getElementById('totalWealth').textContent = formatCurrency(totalAssetValue + globalNetCash);
}

function renderTransactions() {
    const list = document.getElementById('transactionsList');
    if (!list) return;

    list.innerHTML = '';

    // Transactions already sorted by query if firebase, but if local we might need sort
    if (!isFirebaseReady) {
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    transactions.forEach((t) => {
        const item = document.createElement('div');
        item.className = 'list-item';
        // Note: ID must be string safe for onClick
        // If ID is string (firebase), we need quotes.
        const idParam = typeof t.id === 'string' ? `'${t.id}'` : t.id;

        item.innerHTML = `
            <div class="item-info">
                <h4>${t.category}</h4>
                <small>${new Date(t.date).toLocaleDateString('tr-TR')}</small>
            </div>
            <div class="item-right">
                <span class="item-amount ${t.type === 'income' ? 'income-text' : 'expense-text'}">
                    ${t.type === 'income' ? '+' : '-'}${formatCurrency(t.amount)}
                </span>
                <button onclick="deleteTransaction(${idParam})" style="border:none; background:none; color:#9ca3af; cursor:pointer; margin-left:10px;"><i class="fas fa-trash"></i></button>
            </div>
        `;

        list.appendChild(item);
    });
}

function renderAssets() {
    const grid = document.getElementById('assetsList');
    if (!grid) return;
    grid.innerHTML = '';

    assets.forEach(asset => {
        const typeInfo = marketRates[asset.type] || marketRates.other;
        const bankName = bankNames[asset.bank] || 'Diğer';
        const cost = asset.amount * asset.price;

        let currentValue = cost;
        let rate = getAssetRate(asset.type);
        let profitLossHtml = '';

        if (rate > 0) {
            currentValue = asset.amount * rate;
            const diff = currentValue - cost;
            const percent = (diff / cost) * 100;
            const colorClass = diff >= 0 ? 'profit' : 'loss';
            const sign = diff >= 0 ? '+' : '';

            profitLossHtml = `
                <div style="margin-top:5px;">
                    <span class="${colorClass}" style="font-size:12px;">
                        ${sign}${formatCurrency(diff)} (%${percent.toFixed(1)})
                    </span>
                </div>
            `;
        } else {
            currentValue = cost;
        }

        const idParam = typeof asset.id === 'string' ? `'${asset.id}'` : asset.id;

        const card = document.createElement('div');
        card.className = 'asset-card';
        card.innerHTML = `
            <div class="asset-header">
                <h3><i class="fas ${typeInfo.icon}"></i> ${typeInfo.name}</h3>
                <div>
                    <button onclick="editAsset(${idParam})" style="border:none; background:none; color:#4f46e5; cursor:pointer; margin-right: 10px;"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteAsset(${idParam})" style="border:none; background:none; color:#ef4444; cursor:pointer;"><i class="fas fa-trash"></i></button>
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
                <div>
                    <span class="detail-label">Alış Fiyatı</span>
                    <strong>${formatCurrency(asset.price)}</strong>
                </div>
                <div>
                    <span class="detail-label">Güncel Değer</span>
                    <strong>${formatCurrency(currentValue)}</strong>
                    ${profitLossHtml}
                </div>
                <div>
                    <span class="detail-label">Alış Tarihi</span>
                    <strong>${new Date(asset.date).toLocaleDateString('tr-TR')}</strong>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

// Market UI (Unchanged)
function renderMarket() {
    const list = document.getElementById('marketList');
    if (!list) return;
    list.innerHTML = '';

    const createCard = (title, code, rate, icon) => {
        const div = document.createElement('div');
        div.className = 'market-card';
        div.innerHTML = `
            <h3><i class="fas ${icon}"></i> ${title}</h3>
            <div class="rate">${formatCurrency(rate)}</div>
            <div class="change"><small>1 ${code} = ${rate.toFixed(2)} TL</small></div>
        `;
        list.appendChild(div);
    };

    if (marketRates.USD > 0) {
        createCard('Dolar', 'USD', marketRates.USD, 'fa-dollar-sign');
        createCard('Euro', 'EUR', marketRates.EUR, 'fa-euro-sign');
        createCard('Gram Altın', 'GA', marketRates.GA, 'fa-coins');

        const date = marketRates.lastUpdated;
        if (date && document.getElementById('lastUpdate')) {
            document.getElementById('lastUpdate').textContent = date.toLocaleTimeString();
        }
    }
}

window.refreshMarketData = function () {
    const btn = document.querySelector('#market header button');
    if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yenileniyor...';
    fetchMarketData().then(() => {
        if (btn) btn.innerHTML = '<i class="fas fa-sync-alt"></i> Yenile';
    });
}

// Converter (Unchanged)
window.calculateConversion = function () {
    const amountInput = document.getElementById('convAmount');
    if (!amountInput) return;

    const amount = parseFloat(amountInput.value);
    const from = document.getElementById('convFrom').value;
    const to = document.getElementById('convTo').value;

    if (isNaN(amount) || marketRates.USD === 0) return;

    const getRateToTry = (currency) => {
        if (currency === 'TRY') return 1;
        return marketRates[currency];
    };

    const fromRate = getRateToTry(from);
    const toRate = getRateToTry(to);

    const result = (amount * fromRate) / toRate;

    let unit = '₺';
    if (to === 'USD') unit = '$';
    if (to === 'EUR') unit = '€';
    if (to === 'GA') unit = 'Gr';

    document.getElementById('convResult').textContent = result.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + ' ' + unit;
}
