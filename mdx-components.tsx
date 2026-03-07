export function useMDXComponents(components: Record<string, unknown>) {
  return {
    h1: (props: Record<string, unknown>) => <h1 className="text-3xl font-bold tracking-tight" {...props} />,
    h2: (props: Record<string, unknown>) => <h2 className="mt-8 text-2xl font-semibold" {...props} />,
    h3: (props: Record<string, unknown>) => <h3 className="mt-6 text-xl font-semibold" {...props} />,
    p: (props: Record<string, unknown>) => <p className="mt-3 leading-7 text-soft" {...props} />,
    ul: (props: Record<string, unknown>) => <ul className="mt-3 list-disc space-y-2 pl-6 text-soft" {...props} />,
    li: (props: Record<string, unknown>) => <li className="leading-7" {...props} />,
    a: (props: Record<string, unknown>) => (
      <a className="text-white underline decoration-[#D96A5A] underline-offset-4" {...props} />
    ),
    ...components,
  };
}
