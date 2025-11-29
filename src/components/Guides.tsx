import { Button } from '@/components/Button'
import { Heading } from '@/components/Heading'

const guides = [
  {
    href: '/defense-wallet',
    name: 'Defense Wallet',
    description: 'Secure wallet with built-in threat detection and risk analysis.',
  },
  {
    href: '/community',
    name: 'Intelligence Hub',
    description: 'Community-powered threat database and real-time alerts.',
  },
  {
    href: '/community/report',
    name: 'Report Threats',
    description: 'Help protect the community by reporting scams and phishing.',
  },
  {
    href: '/community/leaderboard',
    name: 'Leaderboard',
    description: 'Top threat hunters and their contributions to security.',
  },
]

export function Guides() {
  return (
    <div className="my-16 xl:max-w-none">
      <Heading level={2} id="guides">
        Features
      </Heading>
      <div className="not-prose mt-4 grid grid-cols-1 gap-8 border-t border-zinc-900/5 pt-10 sm:grid-cols-2 xl:grid-cols-4 dark:border-white/5">
        {guides.map((guide) => (
          <div key={guide.href}>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">
              {guide.name}
            </h3>
            <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
              {guide.description}
            </p>
            <p className="mt-4">
              <Button href={guide.href} variant="text" arrow="right">
                Explore
              </Button>
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
