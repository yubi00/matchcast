import { Header } from './components/layout/Header';
import { MatchList } from './components/matches/MatchList';

function App() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <Header />
      <main style={{ maxWidth: '680px', margin: '0 auto', padding: '20px 16px' }}>
        <MatchList />
      </main>
    </div>
  );
}

export default App;
