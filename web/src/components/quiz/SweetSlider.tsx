'use client';

import BottleSlider from './BottleSlider';
import type { MechanicProps } from './mechanics';

/** Флакон сладости. Данные и разметка — в BottleSlider. */
export default function SweetSlider({ locale, onChoose }: MechanicProps) {
  return <BottleSlider questionId="Q_SWEET" locale={locale} onChoose={onChoose} />;
}
