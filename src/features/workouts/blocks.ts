import type { TemplateDetail } from '@/db/models';
import type { ShareBlock } from '@/domain/share';

/** Superset label per group id, numbered in order of appearance ("Superset 1"). */
export function supersetLabels(
  items: readonly { supersetGroup: string | null }[],
): Map<string, string> {
  const m = new Map<string, string>();
  for (const i of items)
    if (i.supersetGroup && !m.has(i.supersetGroup))
      m.set(i.supersetGroup, `Superset ${m.size + 1}`);
  return m;
}

export function templateBlocks(t: TemplateDetail): ShareBlock[] {
  const labels = supersetLabels(t.items);
  return t.items.map((i) =>
    i.kind === 'wod'
      ? { kind: 'wod', title: i.title, description: i.description }
      : {
          kind: 'exercise',
          name: i.exercise.name,
          equipment: i.exercise.equipmentName,
          primary: i.exercise.primary,
          secondary: i.exercise.secondary,
          supersetLabel: i.supersetGroup ? (labels.get(i.supersetGroup) ?? null) : null,
          sets: i.sets,
        },
  );
}
