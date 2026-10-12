/** Card heading with an optional right-hand slot (original: `dt`). */
export function SectionHeader({ children, right }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
      <h2 className="text-base font-bold">{children}</h2>
      {right}
    </div>
  );
}

export default SectionHeader;
