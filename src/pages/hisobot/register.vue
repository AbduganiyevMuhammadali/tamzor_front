<script setup lang="ts">
/* OMBOR JURNALI (register) — har bir tovar harakati xronologik tartibda:
   xarid, sotuv, qaytarish, avtolavka ichki ko'chirishi, inventarizatsiya.
   Har yozuv o'z hujjatiga bog'langan. */
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
// @ts-ignore
import { tahlilApi } from '@/api/api'
import HisobotSahifa from './kit/HisobotSahifa.vue'
import KpiKarta from './kit/KpiKarta.vue'
import { fmtMiqdor, davr, useYuklash, fmt, sanaVaqt, IKON } from './kit/hisobot'

const router = useRouter()
const harakat = ref('')
const ombor = ref('')
const qidir = ref('')
const qidirKech = ref('')
const sahifa = ref(1)
let t: ReturnType<typeof setTimeout> | null = null
watch(qidir, v => { if (t) clearTimeout(t); t = setTimeout(() => { qidirKech.value = v.trim() }, 300) })
watch([harakat, ombor, qidirKech, davr.dan, davr.gacha], () => { sahifa.value = 1 })

const { data: d, yuklanmoqda } = useYuklash(() => tahlilApi.jurnal({
  dan: davr.dan.value, gacha: davr.gacha.value, harakat: harakat.value, ombor: ombor.value, search: qidirKech.value, page: sahifa.value,
}), [harakat, ombor, qidirKech, sahifa])

const IZOH = [
  { nom: 'Xarid (kirim)', matn: "Yetkazuvchidan kelgan tovar (prixod hujjati). Summa — kirim narxida." },
  { nom: 'Sotuv', matn: "Mijozga yetkazilgan tovar (ariza). Summa — sotuv narxida." },
  { nom: 'Qaytarish', matn: "Mijozdan qaytib kelgan tovar." },
  { nom: "Ichki ko'chirish", matn: "Van Sell: agentga yuk berish yoki agentdan qabul. Har ko'chirish ikki yozuv — bir ombordan chiqdi, ikkinchisiga kirdi. Kompaniya zaxirasi o'zgarmaydi." },
  { nom: 'Kirdi / chiqdi', matn: "Yashil + — shu omborga kirdi, qizil − — shu ombordan chiqdi." },
]
const HARAKATLAR = [
  { k: '', nom: 'Barchasi' }, { k: 'xarid', nom: 'Xarid' }, { k: 'sotuv', nom: 'Sotuv' }, { k: 'qaytarish', nom: 'Qaytarish' },
  { k: 'kochirish', nom: "Ichki ko'chirish" }, { k: 'ishlab', nom: 'Ishlab chiqarish' }, { k: 'inventar', nom: 'Inventarizatsiya' },
]
const BELGI: Record<string, string> = { xarid: 'hs-belgi--B', sotuv: 'hs-belgi--ok', qaytarish: 'hs-belgi--warn', kochirish: 'hs-belgi--n', ishlab: 'hs-belgi--B', inventar: 'hs-belgi--n', boshqa: 'hs-belgi--n' }
const k = computed(() => d.value?.kpi || {})
const jamiSon = computed(() => Object.values(k.value).reduce((s: number, x: any) => s + (x?.son || 0), 0))
function och(r: any) { if (r.hujjat?.yol) router.push(r.hujjat.yol) }
</script>

<template>
  <HisobotSahifa :ikon="IKON.kitob" nom="Ombor jurnali" savol="Har bir tovar harakati: qayerdan kirdi, qayerga chiqdi va qaysi hujjat bilan"
    :izohlar="IZOH" :yuklanmoqda="yuklanmoqda">
    <template #filtr>
      <select v-model="ombor" class="hs-sel">
        <option value="">Barcha omborlar</option>
        <option v-for="o in d?.omborlar || []" :key="o" :value="o">{{ o }}</option>
      </select>
      <input v-model="qidir" class="hs-inp" placeholder="Tovar nomi…"/>
    </template>

    <div v-if="!d" class="hs-grid hs-grid--kpi"><div v-for="i in 4" :key="i" class="hs-skelet" style="height:104px"/></div>

    <template v-else>
      <div class="hs-grid hs-grid--kpi">
        <KpiKarta nom="Xarid (kirdi)" :ikon="IKON.kirim" :qiymat="k.xarid?.summa" birlik="so'm" :izoh="`${fmtMiqdor(k.xarid?.dona)} kg · ${k.xarid?.son} yozuv`"/>
        <KpiKarta nom="Sotuv (chiqdi)" :ikon="IKON.savat" :qiymat="k.sotuv?.summa" birlik="so'm" ton="ok" :izoh="`${fmtMiqdor(k.sotuv?.dona)} kg · sotuv narxida`"/>
        <KpiKarta nom="Qaytarish" :ikon="IKON.tugaydi" :qiymat="k.qaytarish?.summa" birlik="so'm" ton="warn" :izoh="`${fmtMiqdor(k.qaytarish?.dona)} kg mijozdan qaytdi`"/>
        <KpiKarta nom="Ichki ko'chirish" :ikon="IKON.mashina" :qiymat="`${fmtMiqdor(k.kochirish?.dona)} kg`" ton="neytral"
          :izoh="`${k.kochirish?.son} ta · Van Sell va omborlar orasida, zaxira o'zgarmaydi`"/>
      </div>

      <section class="hs-karta">
        <div class="hs-chiplar rg-chip">
          <button v-for="h in HARAKATLAR" :key="h.k" class="hs-chip" :class="{ on: harakat === h.k }" @click="harakat = h.k">
            {{ h.nom }}<i>{{ h.k ? (k[h.k]?.son ?? 0) * (h.k === 'kochirish' ? 2 : 1) : jamiSon + (k.kochirish?.son || 0) }}</i>
          </button>
        </div>
        <div class="hs-karta-b hs-karta-b--0 hs-jw">
          <table class="hs-jadval">
            <thead><tr><th>Vaqt</th><th>Harakat</th><th>Tovar</th><th>Ombor</th><th class="r">Kg</th><th class="r">Narx</th><th class="r">Summa</th><th>Hujjat</th></tr></thead>
            <tbody>
              <tr v-for="r in d.data" :key="r.id" :class="{ bos: r.hujjat?.yol }" @click="och(r)">
                <td class="m rg-vaqt">{{ sanaVaqt(r.sana) }}</td>
                <td><span class="hs-belgi" :class="BELGI[r.harakat]">{{ r.nom }}</span></td>
                <td><b class="rg-tovar">{{ r.tovar_nomi }}</b></td>
                <td class="m">{{ r.ombor }}</td>
                <td class="r"><b :class="r.dona >= 0 ? 'hs-ok' : 'hs-err'">{{ r.dona >= 0 ? '+' : '−' }}{{ fmtMiqdor(Math.abs(r.dona)) }}</b></td>
                <td class="r m">{{ fmt(r.narx) }}</td>
                <td class="r">{{ fmt(r.summa) }}</td>
                <td><div class="hs-nom"><b class="rg-huj">{{ r.hujjat?.raqam }}</b><small>{{ r.hujjat?.izoh || '' }}</small></div></td>
              </tr>
              <tr v-if="!d.data.length"><td colspan="8"><div class="hs-bosh"><svg viewBox="0 0 24 24" v-html="IKON.qidir"/>Bu filtr bo'yicha harakat yo'q</div></td></tr>
            </tbody>
          </table>
        </div>
        <div class="hs-sahifa">
          <span>{{ fmt(d.jami) }} ta yozuv · {{ d.page }} / {{ d.pages }} sahifa</span>
          <div>
            <button class="hs-btn hs-btn--s" :disabled="sahifa <= 1" @click="sahifa--">‹ Oldingi</button>
            <button class="hs-btn hs-btn--s" :disabled="sahifa >= d.pages" @click="sahifa++">Keyingi ›</button>
          </div>
        </div>
      </section>
    </template>
  </HisobotSahifa>
</template>

<style scoped>
.rg-chip { padding:12px 16px 2px; }
.rg-vaqt { white-space:nowrap; }
.rg-tovar { font-weight:500 !important; }
.rg-huj { color:var(--acc); font-weight:600 !important; }
</style>
