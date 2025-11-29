import { useId } from 'react';
import clsx from 'clsx';

export function Logomark({
  invert = false,
  filled = false,
  ...props
}: React.ComponentPropsWithoutRef<'svg'> & {
  invert?: boolean;
  filled?: boolean;
}) {
  let id = useId();

  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" {...props}>
      <rect
        clipPath={`url(#${id}-clip)`}
        className={clsx(
          'h-8 transition-all duration-300',
          invert ? 'fill-white' : 'fill-neutral-950',
          filled ? 'w-8' : 'w-0 group-hover/logo:w-8',
        )}
      />
      <use
        href={`#${id}-path`}
        className={invert ? 'stroke-white' : 'stroke-neutral-950'}
        fill="none"
        strokeWidth="2"
      />
      <defs>
        <g id={`${id}-path`}>
          <ellipse cx="16" cy="16" rx="14" ry="10" />
          <path
            d="M16 6 L16 26 M12 8 L16 6 L20 8 M14 24 L16 26 L18 24"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
        <clipPath id={`${id}-clip`}>
          <use href={`#${id}-path`} />
        </clipPath>
      </defs>
    </svg>
  );
}

export function Logo({
  className,
  invert = false,
  filled = false,
  fillOnHover = false,
  ...props
}: React.ComponentPropsWithoutRef<'svg'> & {
  invert?: boolean;
  filled?: boolean;
  fillOnHover?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 150 32"
      aria-hidden="true"
      className={clsx(fillOnHover && 'group/logo', className)}
      {...props}
    >
      <Logomark
        preserveAspectRatio="xMinYMid meet"
        invert={invert}
        filled={filled}
      />
      <text
        x="48"
        y="22"
        className={clsx(
          'text-lg font-semibold',
          invert ? 'fill-white' : 'fill-neutral-950'
        )}
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
      >
        Argus
      </text>
    </svg>
  );
}

