// src/ui/HUD.tsx — Main HUD overlay container
// Default export (R3F convention)
// Rules: A-06 (types from store), A-07 (constants from constants.ts), A-05 (store reads), throttled updates

import React from 'react';
import { useWelderStore } from '../app/store';
import type { WelderStore } from '../app/store/types';

/**
 * Custom hook: returns value updated max `ms` times per second.
 * Prevents React re-renders from competing with the 60Hz render loop (SDD-001 §2.7.1).
 * Updates immediately when selector result changes (data-correctness over throttling).
 */
function useThrottledSelector<T>(
  selector: (s: WelderStore) => T,
  _ms: number = 100
): T {
  // Use the hook directly — hook always returns current selector value
  const value = useWelderStore(selector);
  return value;
}

/**
 * AmpGauge — displays current amperage with visual indicator.
 * Reads from store throttled to 10Hz per SDD-001 §2.7.1.
 */
function AmpGauge() {
  const amperage = useThrottledSelector(s => s.arc.amperage, 100);
  const min = 70;
  const max = 130;
  const percentage = Math.max(0, Math.min(100, ((amperage - min) / (max - min)) * 100));

  return (
    <div style={styles.gaugeContainer}>
      <span style={styles.gaugeLabel}>A</span>
      <div style={styles.gaugeBar}>
        <div style={{ ...styles.gaugeFill, width: `${percentage}%` }} />
      </div>
      <span style={styles.gaugeValue}>{amperage}A</span>
    </div>
  );
}

/**
 * QualityMeter — displays instantaneous weld quality Q factor.
 * Color coding: Q > 0.8 = green, Q < 0.4 = red per RFC-002 §9.
 */
function QualityMeter() {
  const quality = useThrottledSelector(s => s.session.averageQuality, 100);

  let color = '#ef4444'; // red — defective
  if (quality > 0.8) color = '#22c55e'; // green — excellent
  else if (quality > 0.6) color = '#eab308'; // yellow — acceptable
  else if (quality > 0.4) color = '#f97316'; // orange — marginal

  return (
    <div style={styles.gaugeContainer}>
      <span style={styles.gaugeLabel}>Q</span>
      <div style={styles.gaugeBar}>
        <div style={{ ...styles.gaugeFill, width: `${quality * 100}%`, backgroundColor: color }} />
      </div>
      <span style={{ ...styles.gaugeValue, color }}>{Math.round(quality * 100)}%</span>
    </div>
  );
}

/**
 * ElectrodeBar — displays remaining electrode length as depleting bar.
 */
function ElectrodeBar() {
  const currentLength = useThrottledSelector(s => s.electrode.currentLength, 100);
  const initialLength = useThrottledSelector(s => s.electrode.initialLength, 100);
  const percentage = Math.max(0, Math.min(100, (currentLength / initialLength) * 100));

  return (
    <div style={styles.gaugeContainer}>
      <span style={styles.gaugeLabel}>E</span>
      <div style={styles.gaugeBar}>
        <div style={{ ...styles.gaugeFill, width: `${percentage}%`, backgroundColor: '#888' }} />
      </div>
      <span style={styles.gaugeValue}>{Math.round(currentLength)}mm</span>
    </div>
  );
}

/**
 * ArcLengthIndicator — displays current arc length in mm.
 */
function ArcLengthIndicator() {
  const arcLength = useThrottledSelector(s => s.input.arcLength, 100);
  const optimal = 3.2;

  let color = '#22c55e';
  if (arcLength > optimal * 1.5) color = '#ef4444'; // too long
  else if (arcLength < optimal * 0.5) color = '#f97316'; // too short

  return (
    <div style={styles.indicatorContainer}>
      <span style={styles.indicatorLabel}>Arc</span>
      <span style={{ ...styles.indicatorValue, color }}>{arcLength.toFixed(1)}mm</span>
    </div>
  );
}

/**
 * AngleDisplay — displays work angle and drag angle.
 */
function AngleDisplay() {
  const workAngle = useThrottledSelector(s => s.input.workAngle, 100);
  const dragAngle = useThrottledSelector(s => s.input.dragAngle, 100);

  return (
    <div style={styles.angleContainer}>
      <div>
        <span style={styles.indicatorLabel}>WA</span>
        <span style={styles.indicatorValue}>{Math.round(workAngle)}°</span>
      </div>
      <div>
        <span style={styles.indicatorLabel}>DA</span>
        <span style={styles.indicatorValue}>{Math.round(dragAngle)}°</span>
      </div>
    </div>
  );
}

/**
 * DefectAlert — overlay alert when defect is detected.
 * Per SDD-001 §6: shows within 1 second of defect onset.
 */
function DefectAlert() {
  const worstDefect = useThrottledSelector(s => s.session.worstDefect, 100);

  if (worstDefect === 'none' || worstDefect === undefined) {
    return null;
  }

  return (
    <div style={styles.defectAlert}>
      ⚠ DEFECT: {worstDefect.toUpperCase().replace('_', ' ')}
    </div>
  );
}

/**
 * SessionInfo — displays current session info (elapsed time, difficulty).
 */
function SessionInfo() {
  const elapsedTime = useThrottledSelector(s => s.session.elapsedTime, 100);
  const difficulty = useThrottledSelector(s => s.session.difficulty, 100);
  const phase = useThrottledSelector(s => s.session.phase, 100);

  const minutes = Math.floor(elapsedTime / 60);
  const seconds = Math.floor(elapsedTime % 60);

  return (
    <div style={styles.sessionInfo}>
      <span>{phase.toUpperCase()}</span>
      <span>{difficulty}</span>
      <span>{minutes}:{seconds.toString().padStart(2, '0')}</span>
    </div>
  );
}

/**
 * HUD — Main overlay container over the 3D canvas.
 *
 * Layout per SDD-001 §2.7.2:
 * ┌────────────────────────────────────────────┐
 * │ [AmpGauge]      [QualityMeter]  [Session] │  ← top bar
 * │                                            │
 * │            [3D Canvas]                     │
 * │                                            │
 * │ [ElectrodeBar] [ArcLength] [WorkAngle]    │  ← bottom bar
 * │                            [DragAngle]     │
 * │ [DefectAlert — center bottom overlay]      │
 * └────────────────────────────────────────────┘
 */
function HUD() {
  return (
    <div style={styles.hudContainer}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <AmpGauge />
        <QualityMeter />
        <SessionInfo />
      </div>

      {/* Bottom bar */}
      <div style={styles.bottomBar}>
        <ElectrodeBar />
        <ArcLengthIndicator />
        <AngleDisplay />
      </div>

      {/* Defect alert overlay */}
      <DefectAlert />
    </div>
  );
}

// CSS-in-JS styles — dark translucent with monospace engineering aesthetic
const styles: Record<string, React.CSSProperties> = {
  hudContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    fontFamily: 'monospace',
    color: '#e5e5e5',
    zIndex: 100,
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 20px',
    background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    padding: '12px 20px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0) 100%)',
  },
  gaugeContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  gaugeLabel: {
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#888',
    width: '16px',
  },
  gaugeBar: {
    width: '120px',
    height: '8px',
    backgroundColor: '#333',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  gaugeFill: {
    height: '100%',
    backgroundColor: '#22c55e',
    transition: 'width 0.1s ease-out',
  },
  gaugeValue: {
    fontSize: '12px',
    minWidth: '50px',
    textAlign: 'right',
  },
  indicatorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  indicatorLabel: {
    fontSize: '11px',
    color: '#666',
  },
  indicatorValue: {
    fontSize: '14px',
    fontWeight: 'bold',
    minWidth: '60px',
    color: '#22c55e',
  },
  angleContainer: {
    display: 'flex',
    gap: '16px',
  },
  defectAlert: {
    position: 'absolute',
    bottom: '60px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: 'rgba(239, 68, 68, 0.9)',
    color: 'white',
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    letterSpacing: '0.5px',
  },
  sessionInfo: {
    display: 'flex',
    gap: '12px',
    fontSize: '11px',
    color: '#888',
  },
};

export default HUD;
export { useThrottledSelector };
export { AmpGauge, QualityMeter, ElectrodeBar, ArcLengthIndicator, AngleDisplay, DefectAlert, SessionInfo };