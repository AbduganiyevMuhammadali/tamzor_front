<script setup lang="ts">
import { ref, onMounted } from 'vue'

const selectedPeriod = ref('month')

const periods = [
  { key: 'today', label: 'Bugun' },
  { key: 'week', label: 'Hafta' },
  { key: 'month', label: 'Oy' },
  { key: 'year', label: 'Yil' }
]

const stats = [
  {
    title: "Jami savdo",
    value: "121 339 856",
    suffix: "UZS",
    change: "+12.5%",
    positive: true,
    desc: "o'tgan oyga nisbatan",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
    </svg>`
  },
  {
    title: "Buyurtmalar",
    value: "2 847",
    suffix: "ta",
    change: "+8.2%",
    positive: true,
    desc: "o'tgan oyga nisbatan",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
    </svg>`
  },
  {
    title: "Mijozlar",
    value: "14 392",
    suffix: "ta",
    change: "+3.1%",
    positive: true,
    desc: "o'tgan oyga nisbatan",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>`
  },
  {
    title: "Qaytarilgan",
    value: "184",
    suffix: "ta",
    change: "-2.4%",
    positive: false,
    desc: "o'tgan oyga nisbatan",
    color: "#ef4444",
    bg: "rgba(239,68,68,0.08)",
    icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
    </svg>`
  }
]

const chartBars = [
  { month: 'Yan', store1: 65, store2: 30 },
  { month: 'Fev', store1: 85, store2: 42 },
  { month: 'Mar', store1: 100, store2: 55 },
  { month: 'Apr', store1: 72, store2: 38 },
  { month: 'May', store1: 90, store2: 48 },
  { month: 'Iyn', store1: 68, store2: 35 },
  { month: 'Iyl', store1: 78, store2: 40 }
]

const recentOrders = [
  { id: '#10482', customer: 'Jasur Toshmatov', product: 'iPhone 15 Pro', amount: '14 500 000', status: 'delivered', date: '20 May 2026' },
  { id: '#10481', customer: 'Malika Yusupova', product: 'Samsung Galaxy S24', amount: '9 800 000', status: 'pending', date: '20 May 2026' },
  { id: '#10480', customer: 'Bobur Nazarov', product: 'MacBook Air M3', amount: '28 000 000', status: 'processing', date: '19 May 2026' },
  { id: '#10479', customer: 'Gulnora Hamidova', product: 'AirPods Pro', amount: '3 200 000', status: 'delivered', date: '19 May 2026' },
  { id: '#10478', customer: 'Sherzod Mirzayev', product: 'iPad Pro 12.9', amount: '18 500 000', status: 'cancelled', date: '18 May 2026' }
]

const topProducts = [
  { name: 'iPhone 15 Pro', sales: 342, revenue: '4 963 M', percent: 88 },
  { name: 'Samsung S24 Ultra', sales: 218, revenue: '2 136 M', percent: 62 },
  { name: 'MacBook Air M3', sales: 156, revenue: '4 368 M', percent: 47 },
  { name: 'AirPods Pro 2', sales: 498, revenue: '1 594 M', percent: 95 }
]

const statusLabel: Record<string, string> = {
  delivered: "Yetkazildi",
  pending: "Kutilmoqda",
  processing: "Jarayonda",
  cancelled: "Bekor"
}
const statusClass: Record<string, string> = {
  delivered: "badge-delivered",
  pending: "badge-pending",
  processing: "badge-processing",
  cancelled: "badge-cancelled"
}
</script>

<template>
  <div class="dashboard">
    <!-- Header row -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Boshqaruv paneli</h1>
        <p class="page-subtitle">Xush kelibsiz! Bugungi savdo ko'rsatkichlari.</p>
      </div>
      <div class="period-tabs">
        <button
          v-for="p in periods"
          :key="p.key"
          class="period-btn"
          :class="{ active: selectedPeriod === p.key }"
          @click="selectedPeriod = p.key"
        >{{ p.label }}</button>
      </div>
    </div>

    <!-- Stats grid -->
    <div class="stats-grid">
      <div class="stat-card" v-for="stat in stats" :key="stat.title">
        <div class="stat-icon" :style="{ background: stat.bg, color: stat.color }">
          <span v-html="stat.icon"></span>
        </div>
        <div class="stat-body">
          <p class="stat-title">{{ stat.title }}</p>
          <div class="stat-value-row">
            <span class="stat-value">{{ stat.value }}</span>
            <span class="stat-suffix">{{ stat.suffix }}</span>
          </div>
          <div class="stat-change">
            <span class="change-badge" :class="stat.positive ? 'up' : 'down'">
              <svg v-if="stat.positive" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clip-rule="evenodd" />
              </svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 3a.75.75 0 01.75.75v10.638l3.96-4.158a.75.75 0 111.08 1.04l-5.25 5.5a.75.75 0 01-1.08 0l-5.25-5.5a.75.75 0 111.08-1.04l3.96 4.158V3.75A.75.75 0 0110 3z" clip-rule="evenodd" />
              </svg>
              {{ stat.change }}
            </span>
            <span class="change-desc">{{ stat.desc }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Middle row: chart + stores -->
    <div class="mid-row">
      <!-- Bar chart -->
      <div class="card chart-card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Sotuvlar grafigi</h3>
            <p class="card-sub">Oylik savdo tahlili</p>
          </div>
          <div class="chart-legend">
            <span class="legend-dot" style="background:#8b5cf6"></span>
            <span class="legend-label">Store Shox</span>
            <span class="legend-dot" style="background:#a78bfa"></span>
            <span class="legend-label">Magazine1</span>
          </div>
        </div>
        <div class="bar-chart">
          <div class="chart-bars">
            <div class="bar-group" v-for="bar in chartBars" :key="bar.month">
              <div class="bars">
                <div class="bar bar1" :style="{ height: bar.store1 + '%' }">
                  <span class="bar-tooltip">{{ bar.store1 }}M</span>
                </div>
                <div class="bar bar2" :style="{ height: bar.store2 + '%' }">
                  <span class="bar-tooltip">{{ bar.store2 }}M</span>
                </div>
              </div>
              <span class="bar-label">{{ bar.month }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right col -->
      <div class="right-col">
        <!-- Top products -->
        <div class="card">
          <div class="card-header">
            <div>
              <h3 class="card-title">Top tovarlar</h3>
              <p class="card-sub">Eng ko'p sotilganlar</p>
            </div>
          </div>
          <div class="product-list">
            <div class="product-item" v-for="p in topProducts" :key="p.name">
              <div class="product-info">
                <span class="product-name">{{ p.name }}</span>
                <span class="product-stats">{{ p.sales }} kg · {{ p.revenue }} UZS</span>
              </div>
              <div class="product-bar-wrap">
                <div class="product-bar">
                  <div class="product-bar-fill" :style="{ width: p.percent + '%' }"></div>
                </div>
                <span class="product-percent">{{ p.percent }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Quick actions -->
        <div class="card quick-actions-card">
          <h3 class="card-title" style="margin-bottom:14px">Tezkor amallar</h3>
          <div class="quick-actions">
            <button class="quick-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Tovar qo'shish
            </button>
            <button class="quick-btn">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Hisobot yuklab
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent orders table -->
    <div class="card table-card">
      <div class="card-header">
        <div>
          <h3 class="card-title">So'nggi buyurtmalar</h3>
          <p class="card-sub">Oxirgi 24 soatdagi buyurtmalar</p>
        </div>
        <button class="view-all-btn">Barchasini ko'rish →</button>
      </div>
      <div class="table-wrap">
        <table class="orders-table">
          <thead>
            <tr>
              <th>Buyurtma ID</th>
              <th>Mijoz</th>
              <th>Mahsulot</th>
              <th>Summa</th>
              <th>Status</th>
              <th>Sana</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in recentOrders" :key="order.id">
              <td class="order-id">{{ order.id }}</td>
              <td>{{ order.customer }}</td>
              <td class="product-cell">{{ order.product }}</td>
              <td class="amount-cell">{{ order.amount }} UZS</td>
              <td><span class="badge" :class="statusClass[order.status]">{{ statusLabel[order.status] }}</span></td>
              <td class="date-cell">{{ order.date }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
}
.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.page-subtitle {
  font-size: 14px;
  color: #64748b;
  margin: 2px 0 0;
}
.period-tabs {
  display: flex;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  padding: 4px;
  gap: 2px;
}
.period-btn {
  padding: 6px 16px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.period-btn.active {
  background: #8b5cf6;
  color: #fff;
}
.period-btn:hover:not(.active) {
  background: #f1f5f9;
  color: #334155;
}

/* ── Stats grid ── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.stat-card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #f1f5f9;
  display: flex;
  gap: 16px;
  transition: box-shadow 0.2s, transform 0.2s;
}
.stat-card:hover {
  box-shadow: 0 4px 20px rgba(0,0,0,0.07);
  transform: translateY(-1px);
}
.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.stat-icon :deep(svg) { width: 22px; height: 22px; }
.stat-body { flex: 1; min-width: 0; }
.stat-title {
  font-size: 13px;
  color: #64748b;
  margin: 0 0 6px;
  font-weight: 500;
}
.stat-value-row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 8px;
}
.stat-value {
  font-size: 22px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1;
}
.stat-suffix {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 500;
}
.stat-change {
  display: flex;
  align-items: center;
  gap: 6px;
}
.change-badge {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 6px;
}
.change-badge svg { width: 12px; height: 12px; }
.change-badge.up { background: rgba(16,185,129,0.1); color: #10b981; }
.change-badge.down { background: rgba(239,68,68,0.1); color: #ef4444; }
.change-desc { font-size: 11px; color: #94a3b8; }

/* ── Mid row ── */
.mid-row {
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 16px;
}
.right-col {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Card ── */
.card {
  background: #fff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #f1f5f9;
}
.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 18px;
}
.card-title {
  font-size: 15px;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
}
.card-sub {
  font-size: 12px;
  color: #94a3b8;
  margin: 2px 0 0;
}

/* ── Bar chart ── */
.chart-legend {
  display: flex;
  align-items: center;
  gap: 8px;
}
.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}
.legend-label { font-size: 12px; color: #64748b; }
.bar-chart { height: 200px; }
.chart-bars {
  display: flex;
  align-items: flex-end;
  height: 100%;
  gap: 8px;
}
.bar-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  height: 100%;
}
.bars {
  flex: 1;
  display: flex;
  align-items: flex-end;
  gap: 4px;
  width: 100%;
  max-width: 44px;
}
.bar {
  flex: 1;
  border-radius: 6px 6px 0 0;
  transition: all 0.3s ease;
  position: relative;
  cursor: pointer;
}
.bar:hover .bar-tooltip { opacity: 1; transform: translateY(-4px); }
.bar1 { background: linear-gradient(180deg, #8b5cf6, #a78bfa); }
.bar2 { background: linear-gradient(180deg, #a78bfa, #c4b5fd); }
.bar-tooltip {
  position: absolute;
  top: -26px;
  left: 50%;
  transform: translateX(-50%);
  background: #1e293b;
  color: #fff;
  font-size: 11px;
  padding: 3px 7px;
  border-radius: 6px;
  white-space: nowrap;
  opacity: 0;
  transition: all 0.2s;
  pointer-events: none;
}
.bar-label { font-size: 11px; color: #94a3b8; font-weight: 500; }

/* ── Products list ── */
.product-list { display: flex; flex-direction: column; gap: 14px; }
.product-item { display: flex; flex-direction: column; gap: 6px; }
.product-info { display: flex; justify-content: space-between; align-items: center; }
.product-name { font-size: 13px; font-weight: 600; color: #1e293b; }
.product-stats { font-size: 11px; color: #94a3b8; }
.product-bar-wrap { display: flex; align-items: center; gap: 8px; }
.product-bar {
  flex: 1;
  height: 6px;
  background: #f1f5f9;
  border-radius: 4px;
  overflow: hidden;
}
.product-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #8b5cf6, #8b5cf6);
  border-radius: 4px;
  transition: width 0.8s ease;
}
.product-percent { font-size: 11px; font-weight: 600; color: #8b5cf6; width: 28px; text-align: right; }

/* ── Quick actions ── */
.quick-actions { display: flex; gap: 10px; }
.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px 12px;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
  background: #f8fafc;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.quick-btn:hover {
  background: #8b5cf6;
  color: #fff;
  border-color: #8b5cf6;
}
.quick-btn svg { width: 16px; height: 16px; }

/* ── Table ── */
.table-card { padding: 20px; }
.view-all-btn {
  padding: 6px 14px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #8b5cf6;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.view-all-btn:hover { background: #8b5cf6; color: #fff; border-color: #8b5cf6; }
.table-wrap { overflow-x: auto; }
.orders-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.orders-table th {
  text-align: left;
  padding: 10px 14px;
  font-size: 11px;
  font-weight: 700;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}
.orders-table td {
  padding: 13px 14px;
  color: #334155;
  border-bottom: 1px solid #f8fafc;
}
.orders-table tbody tr:hover { background: #fafbfc; }
.orders-table tbody tr:last-child td { border-bottom: none; }
.order-id { font-family: monospace; font-weight: 700; color: #8b5cf6; }
.product-cell { color: #0f172a; font-weight: 500; }
.amount-cell { font-weight: 700; color: #0f172a; white-space: nowrap; }
.date-cell { color: #94a3b8; white-space: nowrap; }

.badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
.badge-delivered { background: rgba(16,185,129,0.1); color: #059669; }
.badge-pending { background: rgba(245,158,11,0.1); color: #d97706; }
.badge-processing { background: rgba(139,92,246,0.1); color: #8b5cf6; }
.badge-cancelled { background: rgba(239,68,68,0.1); color: #dc2626; }

/* ── Responsive ── */
@media (max-width: 1200px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .mid-row { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>
