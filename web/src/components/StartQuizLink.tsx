'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { beginRun } from '@/lib/answers-store';

export default function StartQuizLink(props: ComponentProps<typeof Link>) {
  return <Link {...props} onClick={(event) => {
    props.onClick?.(event);
    if (!event.defaultPrevented && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) beginRun();
  }} />;
}
