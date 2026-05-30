// src/ui/screens/HeatmapScreen.tsx — Post-weld quality analysis view
// Default export (R3F convention)

import { useWelderStore } from '../../app/store';

/**
 * HeatmapScreen — Post-weld analysis view (SDD-001 §2.7).
 * Shows after session ends — displays quality color coding and defect labels.
 *
 * Color coding per RFC-002 §9:
 * - Q > 0.80 → #22c55e (bright green — excellent)
 * - 0.60 < Q ≤ 0.80 → #eab308 (yellow — acceptable)
 * - 0.40 < Q ≤ 0.60 → #f97316 (orange — marginal)
 * - Q ≤ 0.40 → #ef4444 (red — defective)
 */
function HeatmapScreen() {
  const session = useWelderStore(s => s.session);
  const resetSession = useWelderStore(s => s.resetSession);
  const { averageQuality, worstDefect, weldPoints, elapsedTime } = session;

  const qualityColor = averageQuality > 0.8 ? '#22c55e'
    : averageQuality > 0.6 ? '#eab308'
    : averageQuality > 0.4 ? '#f97316'
    : '#ef4444';

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>WELD ANALYSIS</h1>
        <p style={styles.subtitle}>Post-weld quality report</p>
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Average Quality</span>
          <span style={{ ...styles.statValue, color: qualityColor }}>
            {(averageQuality * 100).toFixed(1)}%
          </span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Worst Defect</span>
          <span style={styles.statValue}>
            {worstDefect === 'none' ? 'NONE' : worstDefect.toUpperCase().replace('_', ' ')}
          </span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Total Points</span>
          <span style={styles.statValue}>{weldPoints.length}</span>
        </div>

        <div style={styles.statCard}>
          <span style={styles.statLabel}>Duration</span>
          <span style={styles.statValue}>{minutes}:{seconds.toString().padStart(2, '0')}</span>
        </div>
      </div>

      <div style={styles.legend}>
        <h3 style={styles.legendTitle}>Quality Scale</h3>
        <div style={styles.legendItems}>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#22c55e' }} />
            <span>{'Excellent (Q > 80%)'}</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#eab308' }} />
            <span>Acceptable (60-80%)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#f97316' }} />
            <span>Marginal (40-60%)</span>
          </div>
          <div style={styles.legendItem}>
            <span style={{ ...styles.legendColor, backgroundColor: '#ef4444' }} />
            <span>{'Defective (Q < 40%)'}</span>
          </div>
        </div>
      </div>

      <div style={styles.actions}>
        <button
          style={styles.button}
          onClick={resetSession}
        >
          NEW WELD
        </button>
        <button style={{ ...styles.button, ...styles.buttonSecondary }}>
          EXPORT DATA
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'monospace',
    padding: '40px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: '0 0 8px 0',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 200px)',
    gap: '20px',
    marginBottom: '40px',
  },
  statCard: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    textAlign: 'center',
  },
  statLabel: {
    display: 'block',
    fontSize: '11px',
    color: '#666',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  statValue: {
    display: 'block',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#e5e5e5',
  },
  legend: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '40px',
  },
  legendTitle: {
    fontSize: '12px',
    color: '#666',
    margin: '0 0 12px 0',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  legendItems: {
    display: 'flex',
    gap: '20px',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#aaa',
  },
  legendColor: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
  },
  actions: {
    display: 'flex',
    gap: '16px',
  },
  button: {
    padding: '12px 32px',
    fontSize: '14px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    backgroundColor: '#22c55e',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    letterSpacing: '1px',
  },
  buttonSecondary: {
    backgroundColor: '#333',
    color: '#e5e5e5',
  },
};

export default HeatmapScreen;
