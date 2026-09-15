'use client';

import BottleSlider from './BottleSlider';
import type { MechanicProps } from './mechanics';

/** Флакон сладости. Данные и разметка — в BottleSlider. */
export default function SweetSlider({ onChoose }: MechanicProps) {
  return <BottleSlider questionId="Q_SWEET" onChoose={onChoose} />;
}
