// src/ui/screens/SetupScreen.tsx — Initial setup screen for amperage and difficulty
// Default export (R3F convention)

import React, { useState } from 'react';
import { useWelderStore } from '../../app/store';
import type { DifficultyLevel } from '../../app/store/types';

/**
 * SetupScreen — Initial configuration before welding.
 * Allows user to select amperage and difficulty level.
 *
 * Per OQ-02 from RFC-002: amperage is adjustable at setup only (not during welding).
 */
function SetupScreen() {
  const [amperage, setAmperage] = useState(100);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('school');

  const setAmperageAction = useWelderStore(s => s.setAmperage);
  const setDifficultyAction = useWelderStore(s => s.setDifficulty);
  const strikeArc = useWelderStore(s => s.strikeArc);

  const handleStart = () => {
    setAmperageAction(amperage);
    setDifficultyAction(difficulty);
    strikeArc();
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>SMAW WELDING SIMULATOR</h1>
        <p style={styles.subtitle}>Shielded Metal Arc Welding Training System</p>

        <div style={styles.section}>
          <label style={styles.label}>AMPERAGE (A)</label>
          <div style={styles.rangeContainer}>
            <input
              type="range"
              min={70}
              max={130}
              value={amperage}
              onChange={e => setAmperage(Number(e.target.value))}
              style={styles.range}
            />
            <span style={styles.rangeValue}>{amperage}A</span>
          </div>
          <div style={styles.rangeLabels}>
            <span>70A (min)</span>
            <span>100A (optimal)</span>
            <span>130A (max)</span>
          </div>
        </div>

        <div style={styles.section}>
          <label style={styles.label}>DIFFICULTY</label>
          <div style={styles.difficultyButtons}>
            {(['school', 'professional', 'expert'] as DifficultyLevel[]).map(level => (
              <button
                key={level}
                style={{
                  ...styles.diffButton,
                  ...(difficulty === level ? styles.diffButtonActive : {}),
                }}
                onClick={() => setDifficulty(level)}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.infoBox}>
          <p style={styles.infoTitle}>Selected Configuration</p>
          <p style={styles.infoText}>
            Electrode: E6013 | Amperage: {amperage}A | Difficulty: {difficulty}
          </p>
        </div>

        <button style={styles.startButton} onClick={handleStart}>
          STRIKE ARC
        </button>

        <div style={styles.controls}>
          <p style={styles.controlsTitle}>CONTROLS</p>
          <div style={styles.controlsGrid}>
            <span>Q/E</span><span>Arc Length</span>
            <span>W/S</span><span>Drag Angle</span>
            <span>A/D</span><span>Work Angle</span>
            <span>Mouse</span><span>Position</span>
            <span>R</span><span>Restrike</span>
            <span>Space</span><span>Strike Arc</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0a0a',
    color: '#e5e5e5',
    fontFamily: 'monospace',
  },
  card: {
    backgroundColor: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '12px',
    padding: '40px',
    width: '400px',
    textAlign: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#22c55e',
    margin: '0 0 4px 0',
    letterSpacing: '2px',
  },
  subtitle: {
    fontSize: '11px',
    color: '#666',
    margin: '0 0 32px 0',
  },
  section: {
    marginBottom: '28px',
    textAlign: 'left',
  },
  label: {
    display: 'block',
    fontSize: '11px',
    color: '#888',
    marginBottom: '12px',
    letterSpacing: '1px',
  },
  rangeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  range: {
    flex: 1,
    accentColor: '#22c55e',
  },
  rangeValue: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#22c55e',
    minWidth: '60px',
  },
  rangeLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    marginTop: '6px',
    fontSize: '10px',
    color: '#555',
  },
  difficultyButtons: {
    display: 'flex',
    gap: '8px',
  },
  diffButton: {
    flex: 1,
    padding: '10px 0',
    fontSize: '12px',
    fontFamily: 'monospace',
    backgroundColor: '#262626',
    color: '#888',
    border: '1px solid #333',
    borderRadius: '4px',
    cursor: 'pointer',
    letterSpacing: '0.5px',
  },
  diffButtonActive: {
    backgroundColor: '#22c55e',
    color: '#0a0a0a',
    borderColor: '#22c55e',
  },
  infoBox: {
    backgroundColor: '#262626',
    border: '1px solid #333',
    borderRadius: '6px',
    padding: '12px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  infoTitle: {
    fontSize: '10px',
    color: '#666',
    margin: '0 0 4px 0',
    letterSpacing: '1px',
  },
  infoText: {
    fontSize: '12px',
    color: '#aaa',
    margin: 0,
  },
  startButton: {
    width: '100%',
    padding: '14px',
    fontSize: '14px',
    fontFamily: 'monospace',
    fontWeight: 'bold',
    backgroundColor: '#22c55e',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    letterSpacing: '2px',
  },
  controls: {
    marginTop: '32px',
    textAlign: 'left',
  },
  controlsTitle: {
    fontSize: '10px',
    color: '#555',
    margin: '0 0 8px 0',
    letterSpacing: '1px',
  },
  controlsGrid: {
    display: 'grid',
    gridTemplateColumns: 'auto 1fr',
    gap: '4px 16px',
    fontSize: '11px',
    color: '#666',
  },
};

export default SetupScreen;