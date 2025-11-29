import glob from 'fast-glob'
import { type Metadata } from 'next'

import { Providers } from '@/app/providers'
import { Layout } from '@/components/Layout'
import { type Section } from '@/components/SectionProvider'

import '@/styles/tailwind.css'

export const metadata: Metadata = {
  title: {
    template: '%s - Argus',
    default: 'Argus - Stellar Blockchain Security Platform',
  },
  description: 'Protect your Stellar assets with AI-powered security analysis, threat detection, and community intelligence.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let pages = await glob('**/*.mdx', { cwd: 'src/app' })
  let allSectionsEntries = (await Promise.all(
    pages.map(async (filename) => [
      '/' + filename.replace(/(^|\/)page\.mdx$/, ''),
      (await import(`./${filename}`)).sections,
    ]),
  )) as Array<[string, Array<Section>]>
  let allSections = Object.fromEntries(allSectionsEntries)

  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                let checkCount = 0;
                const maxChecks = 50;
                const checkInterval = 200;
                
                function checkFreighter() {
                  checkCount++;
                  
                  const hasFreighter = !!(
                    window.freighterApi || 
                    window.freighter ||
                    document.querySelector('[data-freighter-injected]') ||
                    document.querySelector('freighter-api')
                  );
                  
                  if (hasFreighter) {
                    console.log('Freighter detected after ' + (checkCount * checkInterval) + 'ms');
                    console.log('window.freighterApi:', window.freighterApi);
                    
                    window.dispatchEvent(new CustomEvent('freighter-ready', {
                      detail: { api: window.freighterApi }
                    }));
                    return;
                  }
                  
                  if (checkCount < maxChecks) {
                    setTimeout(checkFreighter, checkInterval);
                  } else {
                    console.warn('Freighter not detected after ' + (maxChecks * checkInterval) + 'ms');
                    
                    window.dispatchEvent(new CustomEvent('freighter-check-complete', {
                      detail: { found: false }
                    }));
                  }
                }
                
                if (document.readyState === 'loading') {
                  document.addEventListener('DOMContentLoaded', checkFreighter);
                } else {
                  checkFreighter();
                }
                
                window.addEventListener('load', () => {
                  setTimeout(checkFreighter, 100);
                });
              })();
            `,
          }}
        />
      </head>
      <body className="flex min-h-full bg-white antialiased dark:bg-zinc-900">
        <Providers>
          <div className="w-full">
            <Layout allSections={allSections}>{children}</Layout>
          </div>
        </Providers>
      </body>
    </html>
  )
}
