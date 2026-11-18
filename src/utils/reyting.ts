/* Mijoz reytingi — darajalar va ularning ko'rinishi (backend: beckend/src/utils/reyting.utils.js DARAJALAR).
   Ranglar dizayn qoidasi bo'yicha: yashil — yaxshi, indigo — brend, slate — neytral, amber — ogohlantirish, qizil — xavf. */
export interface Daraja { kod: string; nom: string; min: number; rang: string; fon: string }

export const REYTING_MAX = 200
export const DARAJALAR: Daraja[] = [
  { kod: 'alo',    nom: "A'lo",   min: 150, rang: '#16a34a', fon: 'rgba(22,163,74,.12)' },
  { kod: 'yaxshi', nom: 'Yaxshi', min: 110, rang: '#4f46e5', fon: 'rgba(79,70,229,.12)' },
  { kod: 'orta',   nom: "O'rta",  min: 70,  rang: '#64748b', fon: 'rgba(100,116,139,.13)' },
  { kod: 'past',   nom: 'Past',   min: 30,  rang: '#d97706', fon: 'rgba(217,119,6,.13)' },
  { kod: 'kritik', nom: 'Kritik', min: 0,   rang: '#dc2626', fon: 'rgba(220,38,38,.12)' },
]

export function darajaOl(ball: number | null | undefined): Daraja {
  const b = Number(ball ?? 100)
  return DARAJALAR.find(d => b >= d.min) || DARAJALAR[DARAJALAR.length - 1]!
}
export const darajaKod = (kod: string) => DARAJALAR.find(d => d.kod === kod) || DARAJALAR[2]!

/* Tarix yozuvi turlari */
export const TUR_NOMI: Record<string, string> = {
  buyurtma: 'Zakaz berdi', rad_etildi: 'Rad etdi', kritik: 'Kritik darajaga tushdi',
  tolov_qabul: "Qarz to'ladi", tolov_surildi: "To'lov surildi", qolda: 'Admin tuzatishi',
}
