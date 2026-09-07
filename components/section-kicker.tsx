export function SectionKicker({ label, dark = false }: { label: string; dark?: boolean }) {
  return (
    <p
      className={`mb-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] ${
        dark ? 'text-accent' : 'text-primary'
      }`}
    >
      {label}
    </p>
  )
}
