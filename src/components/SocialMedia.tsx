import Link from 'next/link';
import clsx from 'clsx';

function GitHubIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z"
      />
    </svg>
  );
}

function TwitterIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function StellarIcon(props: React.ComponentPropsWithoutRef<'svg'>) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
      <path d="M12.283 1.851A10.154 10.154 0 0 0 2.128 11.999a10.154 10.154 0 0 0 10.155 10.148A10.154 10.154 0 0 0 22.436 12a10.154 10.154 0 0 0-10.153-10.149zM9.32 17.094a1.79 1.79 0 0 1-1.791-1.791c0-.988.803-1.791 1.791-1.791s1.791.803 1.791 1.791a1.79 1.79 0 0 1-1.791 1.791zm5.638 0a1.79 1.79 0 0 1-1.791-1.791c0-.988.803-1.791 1.791-1.791s1.791.803 1.791 1.791a1.79 1.79 0 0 1-1.791 1.791zm-2.819-3.582a1.79 1.79 0 0 1-1.791-1.791c0-.988.803-1.791 1.791-1.791s1.791.803 1.791 1.791a1.79 1.79 0 0 1-1.791 1.791z"/>
    </svg>
  );
}

export const socialMediaProfiles = [
  { title: 'Twitter', href: 'https://twitter.com/argussec', icon: TwitterIcon },
  { title: 'GitHub', href: 'https://github.com/argussec/argus', icon: GitHubIcon },
  { title: 'Stellar Expert', href: 'https://stellar.expert', icon: StellarIcon },
];

export function SocialMedia({
  className,
  invert = false,
}: {
  className?: string;
  invert?: boolean;
}) {
  return (
    <ul
      role="list"
      className={clsx(
        'flex gap-x-10',
        invert ? 'text-white' : 'text-neutral-950',
        className,
      )}
    >
      {socialMediaProfiles.map((socialMediaProfile) => (
        <li key={socialMediaProfile.title}>
          <Link
            href={socialMediaProfile.href}
            aria-label={socialMediaProfile.title}
            className={clsx(
              'transition',
              invert ? 'hover:text-neutral-200' : 'hover:text-neutral-700',
            )}
          >
            <socialMediaProfile.icon className="h-6 w-6 fill-current" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

