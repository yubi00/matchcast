export function Header() {
  return (
    <header style={{
      background: 'var(--surface)',
      borderBottom: '1px solid var(--border)',
      padding: '12px 16px',
    }}>
      <img src="/matchcast_banner.png" alt="MatchCast" style={{ height: '56px', width: 'auto' }} />
    </header>
  );
}
