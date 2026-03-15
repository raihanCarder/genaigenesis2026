import { LocationEntry } from "@/components/location-entry";

export default function HomePage() {
  return (
    <div className="grid-lines">
      <section className="mx-auto grid min-h-[calc(100vh-12rem)] max-w-6xl items-center gap-10 px-4 py-12 md:min-h-[calc(100vh-10rem)] md:px-6 lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)] lg:gap-12">
        <div className="flex flex-col gap-10">
          <div className="max-w-3xl">
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[0.95] md:text-7xl">
              Find nearby support, then plan toward stability.
            </h1>
            <p className="text-theme-soft mt-6 max-w-2xl text-lg">
              Browse essential services without signing in. Use grounded chat
              for local questions. Sign in only when you want a longer-term
              roadmap or saved places.
            </p>
          </div>
          <div className="max-w-xl">
            <LocationEntry />
          </div>
        </div>

        <div className="relative mx-auto hidden w-full max-w-[38rem] justify-self-end lg:block">
          <svg
            viewBox="0 0 2000 2000"
            className="relative block h-auto w-full drop-shadow-[0_30px_80px_rgba(0,0,0,0.55)]"
            aria-hidden="true"
          >
            <defs>
              <filter id="beacon2-cutout" colorInterpolationFilters="sRGB">
                <feColorMatrix
                  in="SourceGraphic"
                  type="luminanceToAlpha"
                  result="alphaMask"
                />
                <feComponentTransfer in="alphaMask" result="sharpenedMask">
                  <feFuncA
                    type="gamma"
                    amplitude="1.6"
                    exponent="3"
                    offset="0"
                  />
                </feComponentTransfer>
                <feFlood floodColor="var(--ink)" result="logoColor" />
                <feComposite in="logoColor" in2="sharpenedMask" operator="in" />
              </filter>
            </defs>
            <image
              href="/beacon2.png"
              width="2500"
              height="2500"
              preserveAspectRatio="xMidYMid meet"
              filter="url(#beacon2-cutout)"
            />
          </svg>
        </div>
      </section>
    </div>
  );
}
