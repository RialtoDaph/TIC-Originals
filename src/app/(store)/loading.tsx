// Shown while a storefront page loads (not in the designs).
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ width: 22, height: 22, border: '2px solid #E4E4E4', borderTopColor: '#111', borderRadius: '50%', animation: 'tic-spin .8s linear infinite' }} />
    </div>
  );
}
