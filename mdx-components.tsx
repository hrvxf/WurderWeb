export function useMDXComponents(components: Record<string, unknown>) {
  return {
    h1: (props: Record<string, unknown>) => (
      <h1 className="text-3xl font-bold tracking-tight sm:text-[2.05rem]" {...props} />
    ),
    h2: (props: Record<string, unknown>) => (
      <h2 className="mt-7 border-t border-white/10 pt-5 text-xl font-semibold tracking-tight sm:text-2xl" {...props} />
    ),
    h3: (props: Record<string, unknown>) => <h3 className="mt-5 text-lg font-semibold sm:text-xl" {...props} />,
    p: (props: Record<string, unknown>) => <p className="mt-2.5 max-w-[82ch] leading-6 text-soft" {...props} />,
    ul: (props: Record<string, unknown>) => <ul className="mt-2.5 list-disc space-y-1.5 pl-5 text-soft" {...props} />,
    li: (props: Record<string, unknown>) => <li className="leading-6" {...props} />,
    a: (props: Record<string, unknown>) => (
      <a className="text-white underline decoration-[#D96A5A] underline-offset-4" {...props} />
    ),
    ...components,
  };
}
