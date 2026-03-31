export type OrderedFact = {
  entity: string;
  entityType: string;
  scope?: string;
  state?: string;
  order: number[];
  labels: string[];
  attrs?: unknown;
};

export type PartitionSelection = {
  name: string;
};

export type OrderedSelectionFacts = {
  selected: string;
  items: OrderedFact[];
  partitions: {
    partition: string;
    tail?: string;
  }[];
};

export type OrderedSelectionDerived = {
  selectedIndex: number | null;
  lastIndex: number | null;
  partitionTails: {
    partition: string;
    tail: string | null;
    index: number | null;
  }[];
};

function byOrder(a: OrderedFact, b: OrderedFact) {
  const length = Math.max(a.order.length, b.order.length);
  for (let index = 0; index < length; index += 1) {
    const left = a.order[index] ?? 0;
    const right = b.order[index] ?? 0;
    if (left !== right) return left - right;
  }
  return 0;
}

export function deriveOrderedSelection(
  facts: OrderedSelectionFacts,
): OrderedSelectionDerived {
  const orderedItems = [...facts.items].sort(byOrder);
  const selectedIndex = orderedItems.findIndex(
    (candidate) => candidate.entity === facts.selected,
  );
  const lastIndex = orderedItems.length > 0 ? orderedItems.length - 1 : null;

  return {
    selectedIndex: selectedIndex === -1 ? null : selectedIndex,
    lastIndex,
    partitionTails: facts.partitions.map((partition) => {
      const index = partition.tail
        ? orderedItems.findIndex(
            (candidate) => candidate.entity === partition.tail,
          )
        : -1;
      return {
        partition: partition.partition,
        tail: partition.tail ?? null,
        index: index === -1 ? null : index,
      };
    }),
  };
}
