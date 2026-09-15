'use client';

import BottleSlider from './BottleSlider';
import type { MechanicProps } from './mechanics';

/** Флакон rawness. Данные и разметка — в BottleSlider. */
export default function WildSlider({ onChoose }: MechanicProps) {
  return <BottleSlider questionId="Q_WILD" onChoose={onChoose} />;
}
