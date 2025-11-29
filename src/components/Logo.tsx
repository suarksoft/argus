export function Logo(props: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className="flex items-center gap-2" {...props}>
      <span className="font-bold text-zinc-900 dark:text-white">Argus</span>
    </div>
  )
}

export function LogoIcon(props: React.ComponentPropsWithoutRef<'span'>) {
  return <span className="font-bold text-zinc-900 dark:text-white" {...props}>A</span>
}
