<script setup>
// Raqamli input — yozish paytida minglik ajratgich bilan ko'rsatadi (5900000 → "5 900 000"),
// v-model orqali esa har doim toza Number chiqadi (bo'sh qoldirilsa `bosh`: 0, null yoki '').
// type="number" o'rniga ishlatiladi: brauzer number inputi bo'shliqli formatni qabul qilmaydi,
// "59 000 000" o'rniga "59000000" ko'rinib, nolni sanab adashish oson (inkassatsiyada 5,9 mln
// o'rniga 59 mln yozilgan holat). Pul maydonlari (summa, narx, limit, kurs) shu komponent;
// kg miqdorlari oddiy inputda qoladi (3 xona kasr, guruhlash shart emas).
// ref orqali focus()/select() chaqirish mumkin; class, placeholder, @keydown va boshqa
// atributlar ildiz <input>ga o'tadi.
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue:     { type: [Number, String], default: undefined },   // undefined/null/'' → bo'sh input
  modelModifiers: { type: Object, default: () => ({}) },   // v-model.number yozilsa ham atribut bo'lib tushmasin
  bosh:           { type: [Number, String], default: 0 },  // bo'sh qoldirilganda chiqadigan qiymat: 0 | null | ''
  min:            { type: [Number, String], default: null },
  step:           { type: [Number, String], default: null },
  placeholder:    { type: String, default: '0' },
  disabled:       { type: Boolean, default: false },
  cssClass:       { type: String, default: '' },
  inputmode:      { type: String, default: 'decimal' },
})
const emit = defineEmits(['update:modelValue', 'input'])

function toGrouped(digitsAndDot) {
  const [intPart, decPart] = digitsAndDot.split('.')
  const grouped = (intPart || '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return decPart !== undefined ? `${grouped}.${decPart}` : grouped
}
function cleanDigits(raw) {
  // bo'shliq/NBSP/apostrof ajratgichlar tashlanadi, vergul → nuqta, faqat birinchi nuqta qoladi
  const s = String(raw ?? '').replace(/[\s  ']/g, '').replace(',', '.').replace(/[^\d.]/g, '')
  const i = s.indexOf('.')
  const bitta = i === -1 ? s : s.slice(0, i + 1) + s.slice(i + 1).replace(/\./g, '')
  return bitta.replace(/^0+(?=\d)/, '')   // "05 900 000" bo'lmasin: yetakchi nollar tashlanadi ("0.5" qoladi)
}
function formatDisplay(v) {
  if (v === '' || v === null || v === undefined) return ''
  const cleaned = cleanDigits(v)
  return cleaned ? toGrouped(cleaned) : ''
}

const display = ref(formatDisplay(props.modelValue))
const inputRef = ref(null)

// Tashqaridan modelValue o'zgarsa (API'dan yuklanganda, formani tozalashda) — agar
// foydalanuvchi hozir shu inputga yozayotgan bo'lmasa — qayta formatlaymiz.
watch(() => props.modelValue, (v) => {
  if (document.activeElement !== inputRef.value) display.value = formatDisplay(v)
})

function onInput(e) {
  const caretFromEnd = e.target.value.length - (e.target.selectionStart ?? e.target.value.length)
  const cleaned = cleanDigits(e.target.value)
  const formatted = cleaned ? toGrouped(cleaned) : ''
  display.value = formatted
  // DOM qiymatini ham darhol yangilaymiz (Vue bir xil qiymatni qayta yozmasligi mumkin)
  e.target.value = formatted
  let num = cleaned === '' || cleaned === '.' ? props.bosh : parseFloat(cleaned)
  if (typeof num === 'number' && isNaN(num)) num = props.bosh
  emit('update:modelValue', num)
  emit('input', num)
  const pos = Math.max(0, formatted.length - caretFromEnd)
  try { e.target.setSelectionRange(pos, pos) } catch { /* ba'zi brauzerlarda mumkin emas */ }
}
function onFocus(e) {
  // Maydonda faqat "0" tursa — belgilaymiz, yozilgan son uni almashtiradi
  if (e.target.value === '0') e.target.select()
}
function onBlur() {
  // Yozish tugagach yakuniy ko'rinish ("5 900 000." → "5 900 000")
  display.value = formatDisplay(props.modelValue)
}

defineExpose({
  focus: () => inputRef.value && inputRef.value.focus(),
  select: () => inputRef.value && inputRef.value.select(),
  el: inputRef,
})
</script>

<template>
  <input
    ref="inputRef"
    type="text"
    :inputmode="inputmode"
    autocomplete="off"
    :class="cssClass"
    :value="display"
    :disabled="disabled"
    :placeholder="placeholder"
    @input="onInput"
    @focus="onFocus"
    @blur="onBlur"
  />
</template>
