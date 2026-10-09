import { useState, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Select } from '../components/ResidentControls';
import { TIE, Tree, TreeItem, TreeStub } from '../components/Tree';
import { FieldInput } from './FieldInput';
import { LAND, METRIC_LABELS, USAGE, parseDecimal, round, takesDirectValues, usageChildren, type UsageCategory } from './land';
import { numbers } from './numbers';
import { visible, type Errors } from './schema';
import { buildingSections, landCalculation, updateBuilding, vehicleTotal } from './steps';
import type { BuildingData, HouseholdCatalog, LandData, LivestockData, TreeType, VehicleData } from './types';
import { AddRow, Amount, Card, Cell, CountBox, DeleteIcon, DeleteText, ErrorText, Grid, Header, LawNumber, Stepper, useColumns, web } from './web';

const format = (value: number) => String(round(value));
const count = (value: number | undefined) => value ? String(value) : '';

// ─── Tikililər (BuildingForm.cshtml) ────────────────────────────────────────────────────────────

/** Tbu.Web's building form: the building, its auxiliary buildings, the living conditions and the devices, in that order. */
export function BuildingEditor({ building, catalog, errors, onChange }: { building: BuildingData; catalog: HouseholdCatalog; errors: Errors; onChange(building: BuildingData): void }) {
  const f = building.fields;
  const set = (name: string, value: BuildingData['fields'][string]) => onChange({ ...building, fields: updateBuilding(f, name, value, catalog) });
  const section = (index: number) => <Card title={buildingSections[index].title}><Grid>
    {buildingSections[index].fields.filter(field => visible(field, f, catalog)).map(field => {
      const content = <FieldInput field={field} number={numbers.building(field.name)} data={f} catalog={catalog} errors={errors} set={set}
        setAll={fields => onChange({ ...building, fields })} />;
      // The web grid's full-width selects and radios keep half a row; only the address spans it.
      return <Cell key={field.name} full={field.kind === 'address'}>{content}</Cell>;
    })}
  </Grid></Card>;
  // The web form always shows one row of each list, so an empty building still offers it.
  const auxiliaries = building.auxiliaries.length ? building.auxiliaries : [{ typeId: null, area: '' }];
  const devices = building.devices.length ? building.devices : [{ typeId: null, count: '' }];
  return <View style={{ gap: 28 }}>
    {section(0)}
    <Card title="Yardımçı tikili haqqında məlumatlar">
      <View style={{ gap: 20 }}>{auxiliaries.map((row, index) => <DynamicRow key={index} first={index === 0}
        onDelete={() => onChange({ ...building, auxiliaries: auxiliaries.filter((_, i) => i !== index) })} label="Yardımçı tikilini sil"
        type={<Select label="Yardımçı tikilinin növü" number="2.1" hideLabel={index > 0} value={row.typeId} items={catalog.lookups.buildingAuxiliary ?? []}
          onChange={v => onChange({ ...building, auxiliaries: auxiliaries.map((x, i) => i === index ? { ...x, typeId: v as number | null } : x) })} />}
        value={<Amount label="Sahəsi (kv. metr)" number="2.2" hideLabel={index > 0} value={row.area}
          onChange={area => onChange({ ...building, auxiliaries: auxiliaries.map((x, i) => i === index ? { ...x, area } : x) })} />} />)}</View>
      <ErrorText text={errors.auxiliaries} />
      <View style={{ marginTop: 20 }}><AddRow onPress={() => onChange({ ...building, auxiliaries: [...auxiliaries, { typeId: null, area: '' }] })} /></View>
    </Card>
    {section(1)}
    <Card title="Texnoloji cihazlar">
      <View style={{ gap: 20 }}>{devices.map((row, index) => <DynamicRow key={index} first={index === 0}
        onDelete={() => onChange({ ...building, devices: devices.filter((_, i) => i !== index) })} label="Texnoloji cihazı sil"
        type={<Select label="Cihazın növü" number="3.10.1" hideLabel={index > 0} value={row.typeId} items={catalog.lookups.buildingTechnologyDevice ?? []}
          onChange={v => onChange({ ...building, devices: devices.map((x, i) => i === index ? { ...x, typeId: v as number | null } : x) })} />}
        value={<Stepper label="Sayı" number="3.10.2" hideLabel={index > 0} value={row.count}
          onChange={value => onChange({ ...building, devices: devices.map((x, i) => i === index ? { ...x, count: value } : x) })} />} />)}</View>
      <ErrorText text={errors.devices} />
      <View style={{ marginTop: 20 }}><AddRow onPress={() => onChange({ ...building, devices: [...devices, { typeId: null, count: '' }] })} /></View>
    </Card>
  </View>;
}
/** A web dynamic row: type and value side by side and the bin at the end; labels on the first row only. */
function DynamicRow({ type, value, label, onDelete, first }: { type: ReactNode; value: ReactNode; label: string; onDelete(): void; first: boolean }) {
  const columns = useColumns();
  if (!columns) return <View style={[styles.stackRow, !first && styles.rowDivider]}>{type}
    <View style={styles.inline}><View style={{ flex: 1 }}>{value}</View><DeleteIcon label={label} onPress={onDelete} /></View></View>;
  return <View style={[styles.inline, { alignItems: 'flex-end' }]}><View style={{ flex: 1 }}>{type}</View><View style={{ flex: 1 }}>{value}</View><DeleteIcon label={label} onPress={onDelete} /></View>;
}

// ─── Avtonəqliyyat və texnikalar (Vehicles.cshtml) ─────────────────────────────────────────────

/** Each vehicle type is a row: its count on the left, the operational count on the right; tractor kinds are indented under their computed total. */
export function VehiclesStep({ vehicles, catalog, errors, onChange }: { vehicles: VehicleData; catalog: HouseholdCatalog; errors: Errors; onChange(vehicles: VehicleData): void }) {
  const columns = useColumns();
  const set = (key: 'counts' | 'operational', id: number, value: string) => onChange({ ...vehicles, [key]: { ...vehicles[key], [id]: value ? Number(value) : 0 } });
  const row = (type: HouseholdCatalog['vehicleTypes'][number]) => <View style={{ gap: 4 }}><View style={[styles.inline, { alignItems: 'flex-end' }]}>
      <View style={{ flex: 1 }}><Stepper label={type.label} number={type.isComputed ? undefined : numbers.vehicle(type.label, false)} calculated={type.isComputed}
        value={count(vehicleTotal(vehicles, catalog, type.id, false))} onChange={v => set('counts', type.id, v)} /></View>
      <View style={{ flex: 1 }}><Stepper label="Saz vəziyyətdə olanlar" number={type.isComputed ? undefined : numbers.vehicle(type.label, true)} calculated={type.isComputed}
        value={count(vehicleTotal(vehicles, catalog, type.id, true))} onChange={v => set('operational', type.id, v)} /></View>
    </View><ErrorText text={errors[`vehicle:${type.id}`]} /></View>;
  // Tbu.Web's .vehicle-field-row-indented: the kinds of a computed total hang 28 px in, on a spine 13 px in that ties into each.
  const types = (parentId: number | null) => catalog.vehicleTypes.filter(x => x.parentId === parentId);
  const node = (type: HouseholdCatalog['vehicleTypes'][number]): ReactNode => {
    const kinds = types(type.id);
    return <View key={type.id} style={{ gap: 28 }}>{row(type)}
      {kinds.length > 0 && <View style={{ paddingLeft: 28 }}><Tree start={28} gap={28}>
        {kinds.map(kind => <TreeItem key={kind.id} offset={15}>{node(kind)}</TreeItem>)}</Tree></View>}</View>;
  };
  const others = vehicles.others;
  const setOther = (index: number, change: Partial<VehicleData['others'][number]>) =>
    onChange({ ...vehicles, others: others.map((x, i) => i === index ? { ...x, ...change } : x) });
  return <View style={{ gap: 28 }}>
    <View style={{ gap: 28 }}>{types(null).map(node)}</View>
    <View>
      <Text accessibilityRole="header" style={styles.h3}>Digər texnikalar</Text>
      {columns && others.length > 0 && <View style={[styles.inline, { marginBottom: 6 }]}>
        {['Texnikanın növü', 'Sayı', 'Saz vəziyyətdə olanlar'].map(x => <Text key={x} style={[styles.columnLabel, { flex: 1 }]}>{x}</Text>)}<View style={{ width: 48 }} /></View>}
      <View style={{ gap: 16 }}>{others.map((row, index) => {
        const type = <Select label="Texnikanın növü" hideLabel={columns} value={row.typeId} items={catalog.otherEquipmentTypes} onChange={v => setOther(index, { typeId: v as number | null })} />;
        const total = <Stepper label="Sayı" hideLabel={columns} value={count(row.count)} onChange={v => setOther(index, { count: Number(v || 0) })} />;
        const operational = <Stepper label="Saz vəziyyətdə olanlar" hideLabel={columns} value={count(row.operational)} onChange={v => setOther(index, { operational: Number(v || 0) })} />;
        const remove = <DeleteIcon label="Digər texnikanı sil" onPress={() => onChange({ ...vehicles, others: others.filter((_, i) => i !== index) })} />;
        return columns ? <View key={index} style={styles.inline}><View style={{ flex: 1 }}>{type}</View><View style={{ flex: 1 }}>{total}</View>
          <View style={{ flex: 1 }}>{operational}</View>{remove}</View>
          : <View key={index} style={[styles.stackRow, index > 0 && styles.rowDivider]}>{type}
            <View style={[styles.inline, { alignItems: 'flex-end' }]}><View style={{ flex: 1 }}>{total}</View><View style={{ flex: 1 }}>{operational}</View>{remove}</View></View>;
      })}</View>
      <ErrorText text={errors.others} />
      <View style={{ marginTop: 16 }}><AddRow onPress={() => onChange({ ...vehicles, others: [...others, { typeId: null, count: 0, operational: 0 }] })} /></View>
    </View>
  </View>;
}

// ─── Heyvanlar (Animals.cshtml) ────────────────────────────────────────────────────────────────

const groupLabel = (label: string) => label.trim().replace(/:$/, '').replace(/ cəmi$/i, '').trim();
const FIELD_LABELS: Record<string, string> = { 'Ana qoyun': 'Ana qoyunlar', 'Törədici qoç': 'Törədici qoçlar', 'Şişək': 'Şişəklər', 'Erkək toğlu': 'Erkək toğlular', Quzu: 'Quzular' };
const fieldLabel = (label: string) => { const value = label.trim().replace(/:$/, ''); return FIELD_LABELS[value] ?? value; };
const PRODUCTION = [
  { code: '8.1', label: 'Kəsim üçün satılmış və (və ya) təsərrüfatda kəsilmiş heyvan və quşların diri çəkisi (kiloqram)', fields: [
    ['slaughterCattleAndBuffaloWeightKg', 'İnək və camış', '8.1.1'], ['slaughterSheepAndGoatWeightKg', 'Qoyun və keçi', '8.1.2'],
    ['slaughterPigWeightKg', 'Donuz', '8.1.3'], ['slaughterPoultryWeightKg', 'Quş', '8.1.4']] },
  { code: '8.2', label: 'Süd sağılmışdır (kiloqram)', fields: [['cattleAndBuffaloMilkKg', 'İnək və camış südü', '8.2.1'], ['sheepAndGoatMilkKg', 'Qoyun və keçi südü', '8.2.2']] },
  { code: '8.3', label: 'Yumurta əldə edilmişdir (ədəd)', fields: [['chickenEggCount', 'Toyuq yumurtası', '8.3.1'], ['otherEggCount', 'Digər', undefined]] },
  { code: '8.4', label: 'Qoyun yunu qırxılmışdır (kiloqram)', fields: [['sheepWoolKg', 'Qoyun yunu qırxılmışdır (kiloqram)', undefined]] },
  { code: '8.5', label: 'Barama istehsal edilmişdir (kiloqram)', fields: [['silkwormCocoonKg', 'Barama istehsal edilmişdir (kiloqram)', undefined]] },
] as const;

/** Tbu.Web's animal page: each root a card with its total, herds with their own totals, "ondan" counts beside their parent, then production (8). */
export function LivestockStep({ livestock, catalog, errors, onChange }: { livestock: LivestockData; catalog: HouseholdCatalog; errors: Errors; onChange(livestock: LivestockData): void }) {
  const types = catalog.animals;
  const children = (id: number) => types.filter(x => x.parentId === id);
  const total = (item: TreeType): number => item.isComputed ? children(item.id).reduce((sum, child) => sum + total(child), 0) : livestock.counts[item.id] ?? 0;
  const set = (id: number, value: string) => onChange({ ...livestock, counts: { ...livestock.counts, [id]: Math.min(2147483647, Number(value || 0)) } });
  const field = (item: TreeType) => <Stepper key={item.id} label={fieldLabel(item.label)} number={numbers.animal(item.code)} calculated={item.isComputed}
    value={count(total(item))} onChange={v => set(item.id, v)} error={errors[`animal:${item.id}`]} />;
  // A row is the item with its "ondan" leaves beside it; nested children follow indented.
  const row = (item: TreeType): ReactNode => {
    const kids = children(item.id);
    const inline = item.isComputed ? [] : kids.filter(x => !children(x.id).length);
    const nested = item.isComputed ? kids : kids.filter(x => children(x.id).length);
    return <View key={item.id} style={{ gap: 20 }}>
      <View style={styles.fieldRow}>{[item, ...inline].map(x => <View key={x.id} style={styles.fieldCell}>{field(x)}</View>)}</View>
      {nested.length > 0 && <View style={{ paddingLeft: 28 }}><Tree>{nested.map(x => <TreeItem key={x.id}>{row(x)}</TreeItem>)}</Tree></View>}
    </View>;
  };
  return <View style={{ gap: 20 }}>
    {types.filter(x => x.parentId == null).map(root => {
      const kids = children(root.id);
      if (!kids.length) return <Card key={root.id} style={styles.standalone}><View style={styles.inline}>
        <Text style={[styles.rootLabel, { flex: 1 }]}>{groupLabel(root.label)}</Text>
        <View style={{ width: 96 }}><Amount hideLabel decimal={false} label={groupLabel(root.label)} value={count(livestock.counts[root.id])} onChange={v => set(root.id, v)} /></View>
      </View><ErrorText text={errors[`animal:${root.id}`]} /></Card>;
      const herds = kids.some(x => children(x.id).length);
      return <Fold key={root.id} title={groupLabel(root.label)} total={<CountBox label={`${groupLabel(root.label)} üzrə cəmi`} value={kids.reduce((sum, x) => sum + total(x), 0)} />}>
        {herds ? kids.map(herd => <Branch key={herd.id} tree title={groupLabel(herd.label)}>
          {children(herd.id).length ? <Tree>
            <TreeItem y={TIE.total}><View style={{ gap: 7 }}><Text style={styles.small}>Cəmi</Text><CountBox label={`${groupLabel(herd.label)} üzrə cəmi`} value={children(herd.id).reduce((sum, x) => sum + total(x), 0)} /></View></TreeItem>
            {children(herd.id).map(x => <TreeItem key={x.id}>{row(x)}</TreeItem>)}
          </Tree> : <Tree><TreeItem><View style={styles.fieldCell}>{field(herd)}</View></TreeItem></Tree>}
        </Branch>) : <View style={{ paddingLeft: 28 }}><Tree start={16} gap={16}>{kids.map(x => <TreeItem key={x.id}><View style={{ maxWidth: 328 }}>{field(x)}</View></TreeItem>)}</Tree></View>}
      </Fold>;
    })}
    <Fold title="Heyvandarlıq məhsullarının istehsalı (8)" initiallyOpen>
      {PRODUCTION.map(section => {
        const sum = section.fields.reduce((acc, [name]) => acc + (parseDecimal(livestock.production[name] ?? '') || 0), 0);
        return <Branch key={section.code} tree title={`${section.label} (${section.code})`}><Tree>
          {section.fields.length > 1 && <TreeItem y={TIE.total}><View style={{ gap: 7 }}><Text style={styles.small}>Cəmi</Text><CountBox label={`${section.label} üzrə cəmi`} value={format(sum)} /></View></TreeItem>}
          {section.fields.map(([name, label, number]) => <TreeItem key={name} y={section.fields.length === 1 ? TIE.bare : TIE.field}><View style={{ maxWidth: 260 }}>
            <Amount label={label} number={number} hideLabel={section.fields.length === 1} decimal={!name.endsWith('Count')} value={livestock.production[name] ?? ''}
              error={errors[name]} onChange={value => onChange({ ...livestock, production: { ...livestock.production, [name]: value } })} /></View></TreeItem>)}
        </Tree></Branch>;
      })}
    </Fold>
  </View>;
}
/** A root card of the web trees: closed until opened, the total on the header's right. */
function Fold({ title, number, total, initiallyOpen = false, info, error, children }: {
  title: string; number?: string; total?: ReactNode; initiallyOpen?: boolean; info?: string; error?: string; children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View style={styles.fold}>
    <View style={styles.foldHeader}><Header title={title} number={number} open={open} onPress={() => setOpen(!open)} total={total} info={info} />
      <ErrorText text={error} /></View>
    {open && <View style={styles.foldPanel}>{children}</View>}
  </View>;
}
/**
 * A branch inside a card: its own toggle, open by default, and its content indented under it.
 * A `tree` branch holds a <Tree>, whose spine starts under the toggle (its centre is 10 px in, its foot 24 px down).
 */
function Branch({ title, number, initiallyOpen = true, total, info, tree = false, children }: {
  title: string; number?: string; initiallyOpen?: boolean; total?: ReactNode; info?: string; tree?: boolean; children: ReactNode;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  return <View>
    <View><Header title={title} number={number} open={open} onPress={() => setOpen(!open)} total={total} info={info} />
      {open && tree && <TreeStub x={10} from={24} />}</View>
    {open && <View style={styles.branchPanel}>{children}</View>}
  </View>;
}

// ─── Torpaqlar (LandForm.cshtml) ───────────────────────────────────────────────────────────────

type Node = HouseholdCatalog['landCategories'][number];
const FARM_TOTAL_HINT = '= təsərrüfatın mülkiyyətində və (və ya) istifadəsində olan torpaq + icarəyə götürülmüş torpaq + başqasından əvəzsiz istifadəyə götürülmüş torpaq + istifadə etdiyi digər torpaqlar - başqasına icarəyə (istifadəyə) verilmiş torpaq';
const USAGE_HINT = 'Bu rəqəm təsərrüfat üzrə torpaqların cəminə bərabər olmalıdır';
const IRRIGATION_HINT = 'Bu rəqəm faktiki suvarılan torpaqların cəminə bərabər olmalıdır';

/** One land record in hectares, card by card as on the web form; totals are calculated as the server does. */
export function LandEditor({ land, catalog, errors, onChange }: { land: LandData; catalog: HouseholdCatalog; errors: Errors; onChange(land: LandData): void }) {
  const result = landCalculation(land, catalog);
  const usageCodes = new Set(USAGE.map(x => x.code));
  const categories = catalog.landCategories.filter(x => !usageCodes.has(x.code));
  const ids = new Set(categories.map(x => x.id));
  const kids = (node: Node) => categories.filter(x => x.parentId === node.id);
  const byCode = (code: string) => categories.find(x => x.code === code && (x.parentId == null || !ids.has(x.parentId)));
  const value = (node: Node) => node.isComputed ? format(result.values[node.code] ?? 0) : land.areas[node.id] ?? '';
  const setArea = (node: Node, text: string) => onChange({ ...land, areas: { ...land.areas, [node.id]: text } });
  const area = (node: Node, hideLabel = false) => <Amount key={node.id} label={node.label} number={numbers.land(node.code)} hideLabel={hideLabel}
    calculated={node.isComputed} value={value(node)} onChange={text => setArea(node, text)} error={errors[`area:${node.id}`]} />;
  const totalBox = (node: Node) => <CountBox label={`${node.label} üzrə cəmi`} value={format(result.values[node.code] ?? 0)} />;

  // _LandTreeNode: an editable node shows its own input (label hidden, number in the header); a computed one its "Cəmi".
  const treeNode = (node: Node): ReactNode => {
    const children = kids(node), irrigation = node.code === LAND.traditional || node.code === LAND.modern;
    const number = numbers.land(node.code);
    const bare = !irrigation || children.length > 0;
    return <Branch key={node.id} tree title={node.label} number={!node.isComputed && !irrigation ? number : undefined} initiallyOpen={false}><Tree>
      <TreeItem y={node.isComputed ? TIE.total : bare ? TIE.bare : TIE.field}>{node.isComputed
        ? <View style={{ gap: 7, width: 80 }}><Text style={styles.small}>Cəmi<LawNumber number={number} /></Text>{totalBox(node)}</View>
        : <View style={styles.landField}>{area(node, bare)}</View>}</TreeItem>
      {children.map(child => child.code === LAND.rainSprinkling
        ? <TreeItem key={child.id}><View style={[styles.landField, { gap: 20 }]}>{area(child)}
          <View style={{ paddingLeft: 28 }}><Tree>{kids(child).map(x => <TreeItem key={x.id}>{area(x)}</TreeItem>)}</Tree></View></View></TreeItem>
        : <TreeItem key={child.id} y={kids(child).length ? TIE.header : TIE.field}><View style={styles.landField}>{kids(child).length ? treeNode(child) : area(child)}</View></TreeItem>)}
    </Tree></Branch>;
  };
  // _LandTreeGroup: the group's total and, for the farm total, the rainfed land beside it.
  const treeGroup = (node: Node) => {
    const rainfed = kids(node).find(x => x.code === '1.6.1'), rest = kids(node).filter(x => x !== rainfed);
    // Beside the rainfed input the "Cəmi" box sits at the row's foot: 76 px row, 32 px box.
    return <Branch key={node.id} tree title={node.label} initiallyOpen={false} info={node.code === LAND.farmTotal ? FARM_TOTAL_HINT : undefined}><Tree>
      <TreeItem y={rainfed ? 60 : TIE.total}><View style={{ gap: 20 }}><View style={[styles.inline, { alignItems: 'flex-end' }]}>
        <View style={{ gap: 7 }}><Text style={styles.small}>Cəmi<LawNumber number={numbers.land(node.code)} /></Text>{totalBox(node)}</View>
        {rainfed && <View style={{ flex: 1, maxWidth: 236 }}>{area(rainfed)}</View>}
      </View>
      {node.code === LAND.farmTotal && <ErrorText text={errors.farmTotal} />}</View></TreeItem>
      {rest.map(child => <TreeItem key={child.id} y={TIE.header}>{treeNode(child)}</TreeItem>)}
    </Tree></Branch>;
  };
  const primary = byCode(LAND.agricultural), irrigated = byCode(LAND.irrigated), methods = byCode(LAND.irrigationMethods), grand = byCode(LAND.grandTotal);
  const summaries = [LAND.forest, LAND.aquaculture, LAND.other].map(byCode).filter((x): x is Node => !!x);
  return <View style={{ gap: 20 }}>
    {primary && <Fold title={primary.label} number={numbers.land(primary.code)}>
      {kids(primary).map(child => kids(child).length ? treeGroup(child) : <View key={child.id} style={styles.landField}>{area(child)}</View>)}
    </Fold>}
    {irrigated && <Fold title={irrigated.label} number={numbers.land(irrigated.code)} total={totalBox(irrigated)}>
      {kids(irrigated).map(treeNode)}</Fold>}
    {methods && <Fold title={methods.label} number={numbers.land(methods.code)} total={totalBox(methods)} info={IRRIGATION_HINT} error={errors.irrigation}>
      {kids(methods).map(treeNode)}</Fold>}
    <Fold title="Torpaqdan istifadə" number="2" info={USAGE_HINT} error={errors.usage}
      total={<CountBox label="Torpaqdan istifadə üzrə cəmi" value={format(result.usageTotal)} />}>
      <View style={{ paddingLeft: 28 }}><Metrics category={USAGE[0]} values={null} totals={result.usage} /></View>
      <View style={{ paddingLeft: 28, gap: 16 }}>{usageChildren(LAND.usage).map(category => <UsageNode key={category.code} category={category} land={land}
        catalog={catalog} totals={result.usage} errors={errors} onChange={onChange} />)}</View>
    </Fold>
    {summaries.map(node => <Card key={node.id} style={styles.summary}><View style={[styles.inline, { alignItems: 'center' }]}>
      <Text style={[styles.rootLabel, { flex: 1 }]}>{node.label}<LawNumber number={numbers.land(node.code)} /></Text>
      <View style={{ width: 96 }}><Amount hideLabel label={node.label} calculated={node.isComputed} value={value(node)} onChange={text => setArea(node, text)} /></View>
    </View><ErrorText text={errors[`area:${node.id}`]} /></Card>)}
    {grand && <Fold title={grand.label} number={numbers.land(grand.code)} total={totalBox(grand)}>
      <Grid>{kids(grand).map(child => <Cell key={child.id}>{area(child)}</Cell>)}</Grid></Fold>}
  </View>;
}
/** The metric inputs of a usage category or crop row; a calculated category shows its totals, disabled. */
function Metrics({ category, values, totals, onSet, row }: {
  category: UsageCategory; values: Record<string, string> | null; totals: Record<string, Record<string, number>>; onSet?(metric: string, value: string): void; row?: boolean;
}) {
  const columns = useColumns();
  return <View style={styles.metrics}>{category.metrics.map(metric => <View key={metric} style={[styles.metric, (columns || row) && { width: '48.5%' }]}>
    <Amount label={row && metric === 'AreaHa' ? 'Cəmi (ha)' : METRIC_LABELS[metric]} calculated={!values}
      value={values ? values[metric] ?? '' : format(totals[category.code]?.[metric] ?? 0)} onChange={onSet && (text => onSet(metric, text))} />
  </View>)}</View>;
}
/** _LandUsageNode: the category's metrics, its children, then its crop rows and their "+ … əlavə et". */
function UsageNode({ category, land, catalog, totals, errors, onChange }: {
  category: UsageCategory; land: LandData; catalog: HouseholdCatalog; totals: Record<string, Record<string, number>>; errors: Errors; onChange(land: LandData): void;
}) {
  const entry = land.usage[category.code] ?? { metrics: {}, rows: [] };
  const setEntry = (next: typeof entry) => onChange({ ...land, usage: { ...land.usage, [category.code]: next } });
  const children = usageChildren(category.code), direct = takesDirectValues(category);
  // A category made only of crop rows shows its totals once it has a row.
  const onlyRows = (c: UsageCategory): boolean => !!c.rows || (usageChildren(c.code).length > 0 && usageChildren(c.code).every(onlyRows));
  const cropTypes = (catalog.lookups.landCropType ?? []).filter(x => x.code === category.code);
  return <Branch title={category.label} number={category.code} initiallyOpen={false}>
    <ErrorText text={errors[`usage:${category.code}`]} />
    {!(onlyRows(category) && !entry.rows.length && category.rows) && <Metrics category={category} values={direct ? entry.metrics : null} totals={totals}
      onSet={direct ? (metric, text) => setEntry({ ...entry, metrics: { ...entry.metrics, [metric]: text } }) : undefined} />}
    {children.length > 0 && <View style={{ gap: 16 }}>{children.map(child => <UsageNode key={child.code} category={child} land={land} catalog={catalog}
      totals={totals} errors={errors} onChange={onChange} />)}</View>}
    {category.rows && <>
      {entry.rows.map((row, index) => <View key={row.key} style={styles.cropRow}>
        <Select label={category.rows!.type} value={row.cropTypeId} items={cropTypes}
          onChange={v => setEntry({ ...entry, rows: entry.rows.map((x, i) => i === index ? { ...x, cropTypeId: v as number | null } : x) })} />
        <Metrics row category={category} values={row.metrics} totals={totals}
          onSet={(metric, text) => setEntry({ ...entry, rows: entry.rows.map((x, i) => i === index ? { ...x, metrics: { ...x.metrics, [metric]: text } } : x) })} />
        <View style={{ alignItems: 'flex-end' }}><DeleteText label={`${category.label} sətrini sil`} onPress={() => setEntry({ ...entry, rows: entry.rows.filter((_, i) => i !== index) })} /></View>
      </View>)}
      <AddRow label={category.rows.add} onPress={() => setEntry({ ...entry, rows: [...entry.rows, { key: `${Date.now()}-${entry.rows.length}`, cropTypeId: null, metrics: {} }] })} />
    </>}
  </Branch>;
}
export const usageLabel = (code: string) => USAGE.find(x => x.code === code)?.label ?? code;
export const landArea = (land: LandData, catalog: HouseholdCatalog) => format(landCalculation(land, catalog).values[LAND.grandTotal] ?? 0);

const styles = StyleSheet.create({
  inline: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stackRow: { gap: 12 }, rowDivider: { paddingTop: 20, borderTopWidth: 1, borderTopColor: web.line },
  h3: { marginBottom: 20, color: web.text, fontSize: 14, fontWeight: '600', lineHeight: 20 },
  columnLabel: { color: web.text, fontSize: 14, lineHeight: 20 },
  small: { color: web.text, fontSize: 14, lineHeight: 20 },
  rootLabel: { color: web.text, fontSize: 14, fontWeight: '500', lineHeight: 20 },
  standalone: { paddingVertical: 15 },
  fold: { borderWidth: 1, borderColor: web.border, borderRadius: 14, backgroundColor: '#FFF' },
  foldHeader: { paddingHorizontal: 16, paddingVertical: 15, gap: 6 },
  foldPanel: { padding: 16, gap: 20, borderTopWidth: 1, borderTopColor: web.line },
  branchPanel: { paddingTop: 20, paddingLeft: 28, gap: 20 },
  fieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, fieldCell: { flexGrow: 1, flexBasis: 150, maxWidth: 328 },
  landField: { width: '100%', maxWidth: 300 },
  summary: { paddingVertical: 12 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 20 }, metric: { width: '100%' },
  cropRow: { gap: 20, paddingVertical: 16, paddingHorizontal: 16, borderWidth: 1, borderColor: web.border, borderRadius: 14 },
});
