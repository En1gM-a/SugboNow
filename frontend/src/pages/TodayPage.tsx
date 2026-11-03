// Today (/), the dashboard (handoff <pages>, page 4): "Do I need to change my plans today?" Every section runs its own
// query in parallel, with its own skeleton and error state, so one slow endpoint never holds back the others.

import { Link } from 'react-router-dom';
import { NearPlacesCard } from '@/components/alerts/NearPlacesCard';
import { BriefCard } from '@/components/brief/BriefCard';
import { NextTripCard } from '@/components/schedule/NextTripCard';
import { ThisWeekCard } from '@/components/schedule/ThisWeekCard';
import { AlertStatusLine } from '@/components/today/AlertStatusLine';
import { MayorCard } from '@/components/today/MayorCard';
import { NewsCard } from '@/components/today/NewsCard';
import { WeatherNowCard } from '@/components/today/WeatherNowCard';
import { useBrief } from '@/hooks/useFeeds';
import { useProfile } from '@/hooks/useProfile';
import { EntranceContext, usePageEntrance } from '@/lib/entrance';
import { USE_MOCKS } from '@/lib/supabaseClient';
import { vars } from '@/utils/cx';

/** An incomplete profile shows one setup prompt at the top, not several. */
function SetupPrompt({ i }: { i: number }) {
  return (
    <section className="card glass e-card span-12 setup" style={vars({ '--i': i })} aria-labelledby="setup-h">
      <div>
        <h2 id="setup-h" className="card-title">
          Finish setting up SugboNow
        </h2>
        <p className="muted small">Pick your city and your mayor so your leave times, weather and posts are about you.</p>
      </div>
      <Link to="/welcome" className="btn btn-primary">
        Set up
      </Link>
    </section>
  );
}

export default function TodayPage() {
  const entrance = usePageEntrance('/');
  const profile = useProfile();
  const brief = useBrief();
  const needsSetup = profile.isSuccess && (!profile.data.city || !profile.data.subscribedMayor);
  const first = needsSetup ? 1 : 0;

  return (
    <EntranceContext.Provider value={entrance}>
      <div className="page today" data-entrance={entrance.start !== null && entrance.mode !== 'none' ? entrance.mode : undefined}>
        <div className="grid12">
          {needsSetup && <SetupPrompt i={0} />}
          <AlertStatusLine i={first} brief={brief} />
          <NextTripCard i={first + 1} brief={brief} />
          <WeatherNowCard i={first + 2} city={profile.data?.city} fallback={brief.data?.weather} />
          <BriefCard i={first + 3} brief={brief} />
          <NearPlacesCard i={first + 4} brief={brief} />
          {USE_MOCKS && <ThisWeekCard i={first + 5} />}
          <MayorCard i={first + 6} span={USE_MOCKS ? 'span-4' : 'span-5'} />
          <NewsCard i={first + 7} span={USE_MOCKS ? 'span-5' : 'span-7'} />
        </div>
      </div>
    </EntranceContext.Provider>
  );
}
