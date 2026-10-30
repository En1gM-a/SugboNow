// Split layout for Login and Sign Up: a navy story panel (desktop) beside the form.

import type { ReactNode } from 'react';
import { Icon, type IconName } from '../ui/Icon';
import { SinulogRibbon } from '../ui/Card';
import { Logo } from './AppShell';
import { ThemeToggle } from './ThemeToggle';

const POINTS: Array<{ icon: IconName; text: string }> = [
  { icon: 'clock', text: 'A suggested leave time for every trip, adjusted for traffic and floods' },
  { icon: 'school', text: 'Class suspensions from your mayor, the moment they’re posted' },
  { icon: 'cloudRain', text: 'Hour-by-hour rain chances for every Metro Cebu town' },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-mactan-navy text-white lg:flex lg:flex-col">
        <SinulogRibbon />
        <div className="flex flex-1 flex-col justify-between p-10 xl:p-14">
          <Logo />
          <div>
            <p className="font-heading text-4xl leading-tight font-bold tracking-tight xl:text-5xl">
              Cebu, right now,
              <br />
              <span className="text-marigold">for you.</span>
            </p>
            <ul className="mt-8 space-y-4">
              {POINTS.map((p) => (
                <li key={p.text} className="flex items-start gap-3 text-white/90">
                  <Icon name={p.icon} size={22} className="mt-0.5 text-marigold" />
                  <span className="max-w-sm">{p.text}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-sm text-white/70">Made in Sugbo for commuters, students and families.</p>
        </div>
        {/* Original abstract festival ribbons. */}
        <svg viewBox="0 0 400 200" className="pointer-events-none absolute -right-16 bottom-24 w-[420px] opacity-25" aria-hidden="true">
          <path d="M0 120 C 80 40, 160 200, 260 90 S 380 60, 400 40" fill="none" stroke="#C8102E" strokeWidth="14" strokeLinecap="round" />
          <path d="M0 150 C 90 80, 170 220, 270 120 S 380 100, 400 80" fill="none" stroke="#F5A623" strokeWidth="14" strokeLinecap="round" />
          <path d="M0 180 C 100 120, 180 230, 280 150 S 380 140, 400 120" fill="none" stroke="#0E7490" strokeWidth="14" strokeLinecap="round" />
        </svg>
      </aside>

      <div className="relative flex min-h-dvh flex-col">
        <div className="lg:hidden">
          <div className="flex h-14 items-center justify-between bg-mactan-navy px-4">
            <Logo />
            <ThemeToggle />
          </div>
          <SinulogRibbon />
        </div>
        <ThemeToggle onDark={false} className="absolute top-4 right-4 hidden lg:flex" />
        <main id="main" className="flex flex-1 items-center justify-center px-4 py-8 sm:py-12">
          <div className="w-full max-w-md animate-page-in motion-reduce:animate-fade-in">{children}</div>
        </main>
      </div>
    </div>
  );
}
