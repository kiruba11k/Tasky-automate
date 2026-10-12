export function NoteLine({ text, label }) {
  return text != null && text.trim() ? (
    <p className="rounded-xl bg-surface-2 px-3 py-2 text-sm">
      <span className="mr-1.5 text-xs font-semibold text-muted">{label}</span>
      {text}
    </p>
  ) : null;
}

export default NoteLine;
