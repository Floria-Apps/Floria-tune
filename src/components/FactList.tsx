export interface Fact {
  label: string;
  value: string;
}

export function FactList({ facts }: { facts: Fact[] }) {
  if (facts.length === 0) {
    return null;
  }

  return (
    <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
      {facts.map((fact) => (
        <div className="min-w-[4.5rem]" key={fact.label}>
          <dt className="text-label-small leading-tight text-on-surface-variant">
            {fact.label}
          </dt>
          <dd className="mt-0.5 text-body-medium-emphasized">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Drop empty facts before rendering. */
export function compactFacts(facts: Array<Fact | null>): Fact[] {
  return facts.filter((fact): fact is Fact => fact !== null);
}
