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
    <main
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "40px 24px",
      }}
    >
      <h1 style={{ fontFamily: "var(--font-display-face)", fontSize: 32, lineHeight: 1.6 }}>
        બાળ સભા
      </h1>

      <p style={{ fontFamily: "var(--font-ui-face), sans-serif", fontSize: 16, lineHeight: 1.6 }}>
        હાજરી પત્રક
      </p>

      <p
        style={{
          fontFamily: "var(--font-ui-face), sans-serif",
          fontSize: 16,
          lineHeight: 1.6,
          marginTop: 12,
        }}
      >
        શ્રી ત્રિ કિ ર્ય ક્ષ જ્ઞ
      </p>

      <p style={{ fontFamily: "var(--font-ui-face), sans-serif", fontSize: 16, lineHeight: 1.6, marginTop: 12 }}>
        ૦૧૨૩૪૫૬૭૮૯
      </p>

      <p
        style={{
          fontFamily: "var(--font-data-face), monospace",
          fontSize: 16,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.6,
          marginTop: 12,
        }}
      >
        1234567890
      </p>

      <h2
        style={{
          fontFamily: "var(--font-ui-face), sans-serif",
          fontSize: 20,
          fontWeight: 600,
          marginTop: 40,
          marginBottom: 16,
          lineHeight: 1.6,
        }}
      >
        Colour Tokens
      </h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
          gap: 16,
        }}
      >
        {colorTokens.map((token) => (
          <div key={token.name} style={{ textAlign: "center" }}>
            <div
              style={{
                width: 64,
                height: 64,
                backgroundColor: token.var,
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--rule)",
                margin: "0 auto 8px",
              }}
            />
            <span
              style={{
                fontFamily: "var(--font-data-face), monospace",
                fontSize: 11,
                color: "var(--ink-soft)",
                lineHeight: 1.6,
              }}
            >
              {token.name}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}
