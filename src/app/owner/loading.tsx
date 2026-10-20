export default function Loading() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#9AA1AC', fontSize: 14 }} role="status">
      <span className="o-spinner" />
    </div>
  );
}
