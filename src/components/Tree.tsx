import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

// Tbu.Web's tree lines (evtas.css .animal-* and .land-tree-*): a 1 px #cbd5e1 spine runs down from the
// parent's toggle and a tie runs into each child at the middle of its first control. Children sit
// `offset` px to the right of the spine.

/** Where a child's tie meets it: a branch header's toggle, a labelled input, an input alone, a "Cəmi" box. */
export const TIE = { header: 14, field: 52, bare: 24, total: 43 } as const;
const LINE = '#CBD5E1';

type ItemProps = { y?: number; offset?: number; children: ReactNode; top?: number; last?: boolean };
/** One child of a tree; `y` is where its tie meets it. `top` and `last` are set by its Tree. */
export function TreeItem({ y = TIE.field, offset = 18, children, top = 20, last = false }: ItemProps) {
  return <View>
    {/* The spine from the item above (or the parent) down to this tie, and on past it unless this is the last child. */}
    <View pointerEvents="none" style={[styles.spine, { left: -offset, top: -top }, last ? { height: top + y + 1 } : { bottom: 0 }]} />
    <View pointerEvents="none" style={[styles.tie, { left: -offset, width: offset, top: y }]} />
    {children}
  </View>;
}

/** Children laid out as a tree: `start` is the space above the first one, which its spine bridges; `gap` the space between. */
export function Tree({ start = 20, gap = 20, children }: { start?: number; gap?: number; children: ReactNode }) {
  const items = Children.toArray(children).filter(isValidElement) as ReactElement<ItemProps>[];
  return <View style={{ gap }}>{items.map((item, index) => cloneElement(item, { top: index === 0 ? start : gap, last: index === items.length - 1 }))}</View>;
}

/**
 * The part of a spine between a parent's toggle and its first child. Placed inside the parent's header,
 * it runs from `from` to the header's foot, so the header is never measured (and its subtree never rendered twice).
 */
export function TreeStub({ x, from, centred = false }: { x: number; from: number; centred?: boolean }) {
  // `centred` counts `from` from the header's middle, for a toggle centred in a header of any height.
  return <View pointerEvents="none" style={[styles.spine, { left: x, bottom: 0 }, centred ? { top: '50%', marginTop: from } : { top: from }]} />;
}

const styles = StyleSheet.create({
  spine: { position: 'absolute', width: 1, backgroundColor: LINE },
  tie: { position: 'absolute', height: 1, backgroundColor: LINE },
});
