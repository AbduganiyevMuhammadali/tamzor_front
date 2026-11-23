<script setup>
/* Chiqim formalari uchun ixtiyoriy "Kassa" tanlovi (backend §22.14).
   Kassa tanlansa — pul shu kassa balansidan ayiriladi va balans tekshiriladi, to'lov usuli kassa turidan olinadi;
   tanlanmasa — avvalgidek (kassaga bog'lanmaydi). Ro'yxat GET /xarajatlar/kassalar — moliya ruxsati shart emas. */
import { ref, computed, watch, onMounted } from 'vue'
import { xarajatApi } from '@/api/api'

const props = defineProps({
  modelValue: { type: [Number, String], default: '' },
  summa: { type: [Number, String], default: 0 },     // balans ogohlantirishi uchun
  chiqim: { type: Boolean, default: true },          // false — kirim: balans tekshirilmaydi, faqat bog'lanadi
  cssClass: { type: String, default: '' },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'kassa'])
const kassalar = ref([])
const fmt = (v) => Math.round(Number(v) || 0).toLocaleString('ru-RU').replace(/,/g, ' ')
const tanlangan = computed(() => kassalar.value.find(k => String(k.id) === String(props.modelValue)) || null)
const yetmaydi = computed(() => props.chiqim && tanlangan.value && Number(props.summa) > Number(tanlangan.value.balans) + 0.005)
function ozgardi(e) { const v = e.target.value; emit('update:modelValue', v === '' ? '' : Number(v)) }
watch(tanlangan, (k) => emit('kassa', k))
async function yukla() { try { kassalar.value = (await xarajatApi.kassalar())?.rows || [] } catch { kassalar.value = [] } }
onMounted(yukla)
defineExpose({ yukla })
</script>

<template>
  <template v-if="kassalar.length">
    <select :value="modelValue" :class="cssClass" :disabled="disabled" @change="ozgardi">
      <option value="">— Kassasiz (avvalgidek) —</option>
      <option v-for="k in kassalar" :key="k.id" :value="k.id">{{ k.nomi }} · {{ k.tur === 'plastik' ? 'plastik' : 'naqd' }} · {{ fmt(k.balans) }}</option>
    </select>
    <small v-if="yetmaydi" style="display:block;margin-top:4px;color:#b91c1c;font-size:11.5px">Kassada yetarli mablag' yo'q (balans {{ fmt(tanlangan.balans) }})</small>
    <small v-else-if="tanlangan" style="display:block;margin-top:4px;color:#64748b;font-size:11.5px">To'lov usuli kassa turidan: {{ tanlangan.tur === 'plastik' ? 'karta' : 'naqd' }}</small>
  </template>
</template>
