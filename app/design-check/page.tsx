import { Chandlo } from '@/components/ui/Chandlo';
import { Row } from '@/components/ui/Row';
import { Pill } from '@/components/ui/Pill';
import { Stat, StatGroup } from '@/components/ui/Stat';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { PhotoPicker } from '@/components/balak/PhotoPicker';

export default function DesignCheckPage() {
  const colorTokens = [
    { name: "paper", var: "var(--paper)" },
    { name: "sheet", var: "var(--sheet)" },
    { name: "rule", var: "var(--rule)" },
    { name: "rule-strong", var: "var(--rule-strong)" },
    { name: "ink", var: "var(--ink)" },
    { name: "ink-soft", var: "var(--ink-soft)" },
    { name: "ink-faint", var: "var(--ink-faint)" },
    { name: "kumkum", var: "var(--kumkum)" },
    { name: "kumkum-deep", var: "var(--kumkum-deep)" },
    { name: "kumkum-wash", var: "var(--kumkum-wash)" },
    { name: "indigo", var: "var(--indigo)" },
    { name: "indigo-wash", var: "var(--indigo-wash)" },
    { name: "amber", var: "var(--amber)" },
    { name: "amber-wash", var: "var(--amber-wash)" },
    { name: "slate", var: "var(--slate)" },
  ];

  return (
    <main className="max-w-[720px] mx-auto px-6 py-10 space-y-10">
      {/* Typography & Font Check */}
      <section className="space-y-3">
        <SectionHeader>મુખ્ય લખાણ અને અંકો</SectionHeader>
        <h1 className="font-display text-[32px] text-ink leading-relaxed">
          બાળ સભા
        </h1>
        <p className="font-ui text-[16px] text-ink leading-relaxed">
          હાજરી પત્રક
        </p>
        <p className="font-ui text-[16px] text-ink leading-relaxed">
          શ્રી ત્રિ કિ ર્ય ક્ષ જ્ઞ
        </p>
        <p className="font-ui text-[16px] text-ink leading-relaxed">
          ૦૧૨૩૪૫૬૭૮૯
        </p>
        <p className="font-data text-[16px] text-ink leading-relaxed [font-variant-numeric:tabular-nums]">
          1234567890
        </p>
      </section>

      {/* Primitive 1: Chandlo (Three states) */}
      <section className="space-y-3">
        <SectionHeader>ચાંદલો સ્ટેટ (Chandlo States)</SectionHeader>
        <div className="flex items-center gap-4 bg-sheet p-4 border border-rule rounded-md">
          <div className="flex items-center gap-2">
            <Chandlo state="done" label="Done state" />
            <span className="text-[14px] text-ink-soft">Done</span>
          </div>
          <div className="flex items-center gap-2">
            <Chandlo state="not-done" label="Not done state" />
            <span className="text-[14px] text-ink-soft">Not Done</span>
          </div>
          <div className="flex items-center gap-2">
            <Chandlo state="pending" label="Pending state" />
            <span className="text-[14px] text-ink-soft">Pending</span>
          </div>
        </div>
      </section>

      {/* Primitive 2: Row (Normal & Active) */}
      <section className="space-y-3">
        <SectionHeader>યાદી હરોળ (Row Variants)</SectionHeader>
        <div className="border border-rule rounded-md overflow-hidden bg-sheet">
          <Row
            left={<Chandlo state="done" label="Attendance marked" />}
            title="હર્ષદ પટેલ"
            subtitle="ધોરણ ૫ • પાલડી સભા"
            right={<span className="font-data text-[14px] text-ink-soft">૧૫/૨૦</span>}
          />
          <Row
            active={true}
            left={<Chandlo state="pending" label="Followup pending" />}
            title="જય શાહ (સક્રિય વિગત)"
            subtitle="આજના કામ માટે સંપર્ક બાકી છે"
            right={<span className="font-data text-[14px] text-kumkum font-semibold">બાકી</span>}
          />
        </div>
      </section>

      {/* Primitive 3: Pill (Default & Selected) */}
      <section className="space-y-3">
        <SectionHeader>પિલ વેરિઅન્ટ (Pill Variants)</SectionHeader>
        <div className="flex items-center gap-3">
          <Pill label="સામાન્ય નિયમ" selected={false} />
          <Pill label="પસંદ કરેલ નિયમ" selected={true} />
        </div>
      </section>

      {/* Primitive 4: Stats in a row */}
      <section className="space-y-3">
        <SectionHeader>આંકડા દર્શક (Stats in a row)</SectionHeader>
        <StatGroup className="bg-sheet rounded-md">
          <Stat value="૮૫" label="કુલ બાળકો" className="flex-1" />
          <Stat value="૯૨%" label="હાજરી ટકાવારી" className="flex-1" />
          <Stat value="૩" label="બાકી કામ" className="flex-1" />
        </StatGroup>
      </section>

      {/* Primitive 5: PhotoPicker */}
      <section className="space-y-3">
        <SectionHeader>બાળક ફોટો (PhotoPicker)</SectionHeader>
        <div className="bg-sheet p-6 border border-rule rounded-md flex justify-center">
          <PhotoPicker vistarId="demo-vistar" balakId="demo-balak" />
        </div>
      </section>

      {/* Colour Tokens */}
      <section className="space-y-3">
        <SectionHeader>કલર ટોકન્સ (Colour Tokens)</SectionHeader>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
          {colorTokens.map((token) => (
            <div key={token.name} className="text-center">
              <div
                className="w-16 h-16 rounded-sm border border-rule mx-auto mb-2"
                style={{ backgroundColor: token.var }}
              />
              <span className="font-data text-[11px] text-ink-soft block">
                {token.name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
