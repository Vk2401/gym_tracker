import {
  IonButton,
  IonFab,
  IonFabButton,
  IonItem,
  IonItemOption,
  IonItemOptions,
  IonItemSliding,
  IonLabel,
  IonList,
  IonPage,
  IonReorder,
  IonReorderGroup,
  IonSearchbar,
  useIonRouter,
} from '@ionic/react';
import { Content } from '@/components/Content';
import { ChevronDownIcon, ChevronRightIcon, DumbbellIcon, PlusIcon, ZapIcon } from 'lucide-react';
import { ScreenTitle } from '@/components/ScreenTitle';
import { ResumeCard } from '@/app/BottomBars';
import { Icon } from '@/components/Icon';
import { useMemo, useState } from 'react';
import { CategoryDot } from '@/components/CategoryDot';
import { EmptyState } from '@/components/EmptyState';
import { OptionSheet } from '@/components/OptionSheet';
import { PageHeader } from '@/components/PageHeader';
import { CATEGORY_COLORS } from '@/features/settings/colors';
import { mutate } from '@/db/mutate';
import type { TemplateSummary, WorkoutGroup } from '@/db/models';
import * as wo from '@/db/repos/workouts';
import { formatDateShort } from '@/domain/format';
import { EMPTY, MSG_EXTRA } from '@/domain/messages';
import { formatTotals, totalsParts } from '@/domain/totals';
import { formatDayHeading, todayKey } from '@/domain/time';
import { useDialogs } from '@/hooks/useDialogs';
import { useLive } from '@/hooks/useLive';
import { useStartWorkout } from '@/app/useStartWorkout';
import { track } from '@/app/analytics';
import './WorkoutsPage.css';

async function load(db: Parameters<typeof wo.listGroups>[0]) {
  const [groups, templates] = await Promise.all([wo.listGroups(db), wo.listTemplates(db)]);
  return { groups, templates };
}

/** WO-1..7: workout groups and templates. */
export default function WorkoutsPage() {
  const { data } = useLive(load, []);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [recolor, setRecolor] = useState<WorkoutGroup | null>(null);
  const router = useIonRouter();
  const start = useStartWorkout();
  const { promptName, confirmDelete, choose, actions } = useDialogs();

  const groups = useMemo(() => data?.groups ?? [], [data]);
  const templates = useMemo(() => data?.templates ?? [], [data]);
  const q = query.trim().toLocaleLowerCase('en');
  const byGroup = useMemo(() => {
    const m = new Map<string, TemplateSummary[]>();
    for (const t of templates) {
      if (q && !t.name.toLocaleLowerCase('en').includes(q)) continue; // WO-4
      m.set(t.groupId, [...(m.get(t.groupId) ?? []), t]);
    }
    return m;
  }, [templates, q]);

  const addTemplate = async (groupId?: string) => {
    const name = await promptName({
      header: 'New Workout Template',
      placeholder: 'e.g. Monday - Chest',
    });
    if (!name) return;
    const id = await mutate((db) => wo.createTemplate(db, name, groupId));
    setEditing(false);
    track('template_created', { exercise_count: 0 });
    router.push(`/workouts/${id}`, 'forward');
  };
  const addGroup = async () => {
    const name = await promptName({ header: 'New Workout Group' });
    if (name) await mutate((db) => wo.createGroup(db, name));
  };
  // WO-5 / NAV-4
  const onFab = async () => {
    const c = await actions('Create', [
      { text: 'Add Workout Group', value: 'group', icon: 'folderPlus' },
      { text: 'Add Workout Template', value: 'template', icon: 'filePlus' },
    ]);
    if (c === 'group') await addGroup();
    if (c === 'template') await addTemplate();
  };

  // PD-5 / VR-11
  const deleteGroup = async (g: WorkoutGroup) => {
    const count = templates.filter((t) => t.groupId === g.id).length;
    if (count === 0) {
      if (await confirmDelete(g.name)) await mutate((db) => wo.deleteGroup(db, g.id, false));
      return;
    }
    const c = await choose(
      `Delete "${g.name}"?`,
      [
        { text: 'Cancel', value: 'cancel', role: 'cancel' },
        { text: 'Move to Default & Delete', value: 'move', role: 'destructive' },
      ],
      `It contains ${count} template${count === 1 ? '' : 's'}. Move them to Default first?`,
    );
    if (c === 'move') await mutate((db) => wo.deleteGroup(db, g.id, true));
  };
  const deleteTemplate = async (t: TemplateSummary) => {
    if (await confirmDelete(t.name)) await mutate((db) => wo.deleteTemplate(db, t.id));
  };
  const renameGroup = async (g: WorkoutGroup) => {
    const name = await promptName({ header: 'Rename Group', value: g.name });
    if (name) await mutate((db) => wo.updateGroup(db, g.id, { name }));
  };
  // PD-5 edit actions. VR-11: Default can be renamed and recoloured but never deleted.
  const groupMenu = async (g: WorkoutGroup) => {
    const c = await actions(g.name, [
      { text: 'Rename', value: 'rename' as const, icon: 'pencil' as const },
      { text: 'Change Colour', value: 'color' as const, icon: 'palette' as const },
      ...(g.isDefault
        ? []
        : [
            {
              text: 'Delete',
              value: 'delete' as const,
              role: 'destructive' as const,
              icon: 'trash' as const,
            },
          ]),
    ]);
    if (c === 'rename') await renameGroup(g);
    if (c === 'color') setRecolor(g);
    if (c === 'delete') await deleteGroup(g);
  };
  const templateMenu = async (t: TemplateSummary) => {
    const c = await actions(t.name, [
      { text: 'Rename', value: 'rename' as const, icon: 'pencil' as const },
      { text: 'Open', value: 'open' as const, icon: 'open' as const },
      {
        text: 'Delete',
        value: 'delete' as const,
        role: 'destructive' as const,
        icon: 'trash' as const,
      },
    ]);
    if (c === 'rename') await renameTemplate(t);
    if (c === 'open') {
      setEditing(false);
      router.push(`/workouts/${t.id}`, 'forward');
    }
    if (c === 'delete') await deleteTemplate(t);
  };
  const renameTemplate = async (t: TemplateSummary) => {
    const name = await promptName({ header: 'Rename Template', value: t.name });
    if (name) await mutate((db) => wo.updateTemplate(db, t.id, { name }));
  };

  const empty = data && templates.length === 0 && !editing;

  return (
    <IonPage>
      <PageHeader
        title="Workouts"
        start={
          <IonButton
            className="gt-btn-dark"
            onClick={() => void start({ kind: 'quick' }, undefined, 'quick_go')}
            disabled={editing}
          >
            <Icon slot="start" icon={ZapIcon} className="gt-zap" />
            Quick Go!
          </IonButton>
        }
        end={
          <IonButton onClick={() => setEditing(!editing)}>{editing ? 'Done' : 'Edit'}</IonButton>
        }
      />
      <Content>
        <ScreenTitle title="Workouts" eyebrow={formatDayHeading(todayKey())}>
          <IonSearchbar
            className="gt-search"
            placeholder="Search Workouts"
            value={query}
            debounce={100}
            onIonInput={(e) => setQuery(e.detail.value ?? '')}
          />
          {!editing && <ResumeCard />}
        </ScreenTitle>
        {empty && (
          <EmptyState
            fill
            icon={DumbbellIcon}
            message={EMPTY.workouts.message}
            action={EMPTY.workouts.action}
            onAction={() => void addTemplate()}
          />
        )}

        {editing ? (
          <>
            {/* PD-5: tap a name to rename, drag to reorder, swipe left to delete */}
            <p className="gt-edit-hint">
              Tap a group or template to edit it. Drag ≡ to reorder, swipe left to delete.
            </p>
            <IonList inset>
              <div className="gt-section-header ion-padding-start ion-padding-top">Groups</div>
              <IonReorderGroup
                disabled={false}
                onIonItemReorder={(e) => {
                  const ids = e.detail.complete(groups.map((g) => g.id)) as string[];
                  void mutate((db) => wo.reorderGroups(db, ids));
                }}
              >
                {groups.map((g) => (
                  <IonItemSliding key={g.id} disabled={g.isDefault}>
                    <IonItem button detail={false} onClick={() => void groupMenu(g)}>
                      <span slot="start">
                        <CategoryDot color={g.color} size={12} />
                      </span>
                      <IonLabel className="truncate">{g.name}</IonLabel>
                      <IonReorder slot="end" />
                    </IonItem>
                    <IonItemOptions side="end">
                      <IonItemOption color="danger" onClick={() => void deleteGroup(g)}>
                        Delete
                      </IonItemOption>
                    </IonItemOptions>
                  </IonItemSliding>
                ))}
              </IonReorderGroup>
              <IonItem button detail={false} lines="none" onClick={() => void addGroup()}>
                <Icon slot="start" icon={PlusIcon} color="primary" />
                <IonLabel color="primary">Add Workout Group</IonLabel>
              </IonItem>
            </IonList>
            {groups.map((g) => {
              const list = templates.filter((t) => t.groupId === g.id);
              return (
                <IonList inset key={g.id}>
                  <div className="gt-section-header ion-padding-start ion-padding-top truncate">
                    {g.name}
                  </div>
                  <IonReorderGroup
                    disabled={false}
                    onIonItemReorder={(e) => {
                      const ids = e.detail.complete(list.map((t) => t.id)) as string[];
                      void mutate((db) => wo.reorderTemplates(db, g.id, ids));
                    }}
                  >
                    {list.map((t) => (
                      <IonItemSliding key={t.id}>
                        <IonItem button detail={false} onClick={() => void templateMenu(t)}>
                          <IonLabel className="truncate">{t.name}</IonLabel>
                          <IonReorder slot="end" />
                        </IonItem>
                        <IonItemOptions side="end">
                          <IonItemOption color="danger" onClick={() => void deleteTemplate(t)}>
                            Delete
                          </IonItemOption>
                        </IonItemOptions>
                      </IonItemSliding>
                    ))}
                  </IonReorderGroup>
                  <IonItem
                    button
                    detail={false}
                    lines="none"
                    onClick={() => void addTemplate(g.id)}
                  >
                    <Icon slot="start" icon={PlusIcon} color="primary" />
                    <IonLabel color="primary">Add Workout Template</IonLabel>
                  </IonItem>
                </IonList>
              );
            })}
          </>
        ) : (
          !empty &&
          groups.map((g) => {
            const list = byGroup.get(g.id) ?? [];
            if (q && list.length === 0) return null;
            const open = q ? true : g.expanded;
            return (
              <section key={g.id} className="gt-wgroup">
                {/* WO-2: collapsible group header */}
                <button
                  type="button"
                  className="gt-wgroup__head"
                  aria-expanded={open}
                  onClick={() =>
                    !q && void mutate((db) => wo.updateGroup(db, g.id, { expanded: !g.expanded }))
                  }
                >
                  <CategoryDot color={g.color} size={10} halo />
                  <span className="gt-wgroup__name">{g.name}</span>
                  <span className="gt-wgroup__count">{MSG_EXTRA.templateCount(list.length)}</span>
                  <span className={`gt-wgroup__chev ${open ? '' : 'is-closed'}`}>
                    <Icon icon={ChevronDownIcon} />
                  </span>
                </button>
                <div className={`gt-collapse ${open ? 'is-open' : ''}`} inert={!open}>
                  <div className="gt-collapse__inner">
                    <IonList lines="none" className="gt-cards">
                      {list.map((t) => (
                        <IonItem
                          key={t.id}
                          button
                          detail={false}
                          routerLink={`/workouts/${t.id}`}
                          className="gt-card-item"
                        >
                          <span
                            slot="start"
                            className="gt-tile"
                            style={{ '--gt-tile': g.color } as React.CSSProperties}
                          >
                            <Icon icon={DumbbellIcon} />
                          </span>
                          <IonLabel>
                            <h2>{t.name}</h2>
                            {/* WO-3 / BR-10 */}
                            <p>
                              Last completed{' '}
                              {t.lastCompletedUtc
                                ? formatDateShort(t.lastCompletedUtc, t.lastCompletedOffsetMin ?? 0)
                                : 'never'}
                            </p>
                            <div
                              className="gt-chips"
                              role="group"
                              aria-label={`Next Workout: ${formatTotals(t)}`}
                            >
                              {totalsParts(t).map((part) => (
                                <span key={part} className="gt-chip-sm">
                                  {part}
                                </span>
                              ))}
                            </div>
                          </IonLabel>
                          <Icon slot="end" icon={ChevronRightIcon} className="gt-row-chev" />
                        </IonItem>
                      ))}
                      {list.length === 0 && (
                        <IonItem
                          button
                          detail={false}
                          className="gt-card-item gt-card-item--add"
                          onClick={() => void addTemplate(g.id)}
                        >
                          <Icon slot="start" icon={PlusIcon} color="primary" />
                          <IonLabel color="primary">Add Workout Template</IonLabel>
                        </IonItem>
                      )}
                    </IonList>
                  </div>
                </div>
              </section>
            );
          })
        )}
        {q && data && byGroup.size === 0 && templates.length > 0 && (
          <EmptyState fill icon={DumbbellIcon} message={MSG_EXTRA.noWorkoutsMatch(query.trim())} />
        )}
        <div className="gt-fab-space" />
        {/* NAV-4: the + menu stays available in edit mode too */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" className="gt-fab hide-on-keyboard">
          <IonFabButton aria-label="Add" onClick={() => void onFab()}>
            <Icon icon={PlusIcon} />
          </IonFabButton>
        </IonFab>
      </Content>
      <OptionSheet
        isOpen={recolor !== null}
        title={recolor ? `Colour for ${recolor.name}` : 'Colour'}
        options={CATEGORY_COLORS.map((c) => ({ ...c, color: c.value }))}
        selected={recolor?.color ?? null}
        onDismiss={() => setRecolor(null)}
        onSelect={(color) =>
          recolor && void mutate((db) => wo.updateGroup(db, recolor.id, { color }))
        }
      />
    </IonPage>
  );
}
