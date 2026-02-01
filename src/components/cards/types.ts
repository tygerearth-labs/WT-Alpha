export interface Stage {
  id: string;
  name: string;
  emoji: string;
  range: [number, number];
  color: string;
  theme: string;
  advice: string;
  focus: string;
}

export const STAGES: Stage[] = [
  {
    id: 'cacing',
    name: 'Cacing',
    emoji: '🐛',
    range: [0, 1000000],
    color: 'from-stone-500 to-stone-600',
    theme: 'stone',
  advice: 'Sadar & hemat',
    focus: 'Bangun kebiasaan baik dan mulai menabung sedikit demi sedikit',
  },
  {
    id: 'semut',
    name: 'Semut',
    emoji: '🐜',
    range: [1000000, 5000000],
    color: 'from-green-500 to-green-600',
    theme: 'green',
    advice: 'Konsisten sedikit demi sedikit',
    focus: 'Pertahankan konsistensi dalam menabung dan kontrol pengeluaran',
  },
  {
    id: 'kura-kura',
    name: 'Kura-kura',
    emoji: '🐢',
    range: [5000000, 20000000],
    color: 'from-yellow-500 to-yellow-600',
    theme: 'yellow',
    advice: 'Lambat tapi stabil',
    focus: 'Fokus pada kestabilan dan pertumbuhan bertahap',
  },
  {
    id: 'serigala',
    name: 'Serigala',
    emoji: '🐺',
    range: [20000000, 50000000],
    color: 'from-blue-500 to-blue-600',
    theme: 'blue',
    advice: 'Diversifikasi & kontrol risiko',
    focus: 'Mulai diversifikasi investasi dan kelola risiko dengan baik',
  },
  {
    id: 'garuda',
    name: 'Garuda',
    emoji: '🦅',
    range: [50000000, 100000000],
    color: 'from-indigo-500 to-indigo-600',
    theme: 'indigo',
    advice: 'Buka kebebasan finansial di fase Garuda',
    focus: 'Menuju kebebasan finansial dengan portofolio yang solid',
  },
  {
    id: 'singa',
    name: 'Singa',
    emoji: '🦁',
    range: [100000000, 1000000000],
    color: 'from-purple-500 to-purple-600',
    theme: 'purple',
    advice: 'Uang bekerja untuk user',
    focus: 'Biarkan uang Anda bekerja untuk Anda melalui investasi pasif',
  },
  {
    id: 'naga',
    name: 'Naga',
    emoji: '🐉',
    range: [1000000000, Infinity],
    color: 'from-slate-500 to-slate-600',
    theme: 'slate',
    advice: 'Jaga modal, bukan kejar',
    focus: 'Lindungi modal dan bangun warisan keuangan',
  },
];

export function getCurrentStage(totalSavings: number): Stage {
  return STAGES.find((stage) => totalSavings >= stage.range[0] && totalSavings < stage.range[1]) || STAGES[0];
}

export function getNextStage(currentStage: Stage): Stage | null {
  const currentIndex = STAGES.findIndex((s) => s.id === currentStage.id);
  return currentIndex < STAGES.length - 1 ? STAGES[currentIndex + 1] : null;
}

export function getProgressToNextStage(totalSavings: number, currentStage: Stage): number {
  const nextStage = getNextStage(currentStage);
  if (!nextStage) return 100;

  const rangeStart = currentStage.range[0];
  const rangeEnd = nextStage.range[0];
  const currentProgress = totalSavings - rangeStart;
  const totalRange = rangeEnd - rangeStart;

  return Math.min(Math.max((currentProgress / totalRange) * 100, 0), 100);
}
