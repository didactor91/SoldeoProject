// src/app/store/types.test.ts
import { describe, it, expect } from 'vitest';
import type {
  ElectrodeType,
  DifficultyLevel,
  DefectType,
  SessionPhase,
  ElectrodeState,
  ArcState,
  InputState,
  WeldPoint,
  SessionState,
  FrameResult,
} from './types';

describe('Primitive type aliases', () => {
  it('ElectrodeType allows E6013 and E7018', () => {
    const e1: ElectrodeType = 'E6013';
    const e2: ElectrodeType = 'E7018';
    expect(e1).toBe('E6013');
    expect(e2).toBe('E7018');
  });

  it('DifficultyLevel allows school, professional, expert', () => {
    const d1: DifficultyLevel = 'school';
    const d2: DifficultyLevel = 'professional';
    const d3: DifficultyLevel = 'expert';
    expect(d1).toBe('school');
    expect(d2).toBe('professional');
    expect(d3).toBe('expert');
  });

  it('DefectType includes all defect types', () => {
    const defects: DefectType[] = [
      'undercut', 'overlap', 'porosity', 'spatter',
      'incomplete_fusion', 'burn_through', 'none',
    ];
    defects.forEach(d => expect(d).toBeTruthy());
  });

  it('SessionPhase allows setup, welding, heatmap', () => {
    const p1: SessionPhase = 'setup';
    const p2: SessionPhase = 'welding';
    const p3: SessionPhase = 'heatmap';
    expect(p1).toBe('setup');
    expect(p2).toBe('welding');
    expect(p3).toBe('heatmap');
  });
});

describe('Interface structures', () => {
  it('ElectrodeState has correct shape', () => {
    const e: ElectrodeState = {
      type: 'E6013',
      initialLength: 350,
      currentLength: 350,
      remainingMass: 1.0,
      temperature: 20,
      isStuck: false,
    };
    expect(e.type).toBe('E6013');
    expect(e.initialLength).toBe(350);
    expect(e.currentLength).toBe(350);
    expect(e.remainingMass).toBe(1.0);
    expect(e.temperature).toBe(20);
    expect(e.isStuck).toBe(false);
  });

  it('ArcState has correct shape', () => {
    const a: ArcState = {
      isActive: true,
      arcLength: 3.2,
      voltage: 28,
      amperage: 100,
      stability: 1.0,
    };
    expect(a.isActive).toBe(true);
    expect(a.arcLength).toBe(3.2);
    expect(a.voltage).toBe(28);
    expect(a.amperage).toBe(100);
    expect(a.stability).toBe(1.0);
  });

  it('InputState has correct shape', () => {
    const i: InputState = {
      rawArcLength: 3.2,
      rawWorkAngle: 90,
      rawDragAngle: 70,
      rawPositionX: 0,
      rawPositionZ: 0,
      arcLength: 3.2,
      workAngle: 90,
      dragAngle: 70,
      positionX: 0,
      positionZ: 0,
      travelSpeed: 2.5,
    };
    expect(i.rawArcLength).toBe(3.2);
    expect(i.travelSpeed).toBe(2.5);
  });

  it('WeldPoint has correct shape', () => {
    const w: WeldPoint = {
      position: [0, 0, 0],
      width: 8,
      height: 2.5,
      penetration: 2.0,
      coolingProgress: 0,
      instantQuality: 1.0,
      defect: 'none',
    };
    expect(w.position).toEqual([0, 0, 0]);
    expect(w.instantQuality).toBe(1.0);
  });

  it('SessionState has correct shape', () => {
    const s: SessionState = {
      phase: 'setup',
      difficulty: 'school',
      elapsedTime: 0,
      weldPoints: [],
      averageQuality: 0,
      worstDefect: 'none',
    };
    expect(s.phase).toBe('setup');
    expect(s.weldPoints).toEqual([]);
  });

  it('FrameResult has correct shape', () => {
    const f: FrameResult = {
      electrode: {},
      arc: { arcLength: 0, voltage: 0, stability: 0, isActive: false },
      input: {
        rawArcLength: 0, rawWorkAngle: 0, rawDragAngle: 0, rawPositionX: 0, rawPositionZ: 0,
        arcLength: 0, workAngle: 0, dragAngle: 0, positionX: 0, positionZ: 0, travelSpeed: 0,
      },
      newWeldPoint: null,
      spatterBurst: false,
    };
    expect(f.newWeldPoint).toBeNull();
    expect(f.spatterBurst).toBe(false);
  });
});
