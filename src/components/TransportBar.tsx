import React from 'react';
import { Circle, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import type { Vec3 } from '../types/studio';

interface TransportBarProps {
  running: boolean;
  onToggleRun: () => void;
  onStep: () => void;
  onReset: () => void;
  timeScale: number;
  onTimeScaleChange: (s: number) => void;
  gravity: Vec3;
  onGravityChange: (g: Vec3) => void;
  recording: boolean;
  onToggleRecord: () => void;
  recordedFramesCount: number;
  playbackIndex: number | null;
  onScrubFrame: (idx: number | null) => void;
}

const GRAVITY_PRESETS: { label: string; vec: Vec3 }[] = [
  { label: 'Earth (-9.81)', vec: [0, -9.81, 0] },
  { label: 'Moon (-1.62)', vec: [0, -1.62, 0] },
  { label: 'Mars (-3.72)', vec: [0, -3.72, 0] },
  { label: 'Zero-G (0)', vec: [0, 0, 0] },
];

export const TransportBar: React.FC<TransportBarProps> = ({
  running,
  onToggleRun,
  onStep,
  onReset,
  timeScale,
  onTimeScaleChange,
  gravity,
  onGravityChange,
  recording,
  onToggleRecord,
  recordedFramesCount,
  playbackIndex,
  onScrubFrame,
}) => {
  return (
    <div className="transport-bar">
      <div className="transport-group">
        <button
          type="button"
          className="icon-btn"
          onClick={onReset}
          title="Reset Simulation State"
        >
          <RotateCcw size={13} />
          <span>Reset</span>
        </button>

        <button
          type="button"
          className={`icon-btn ${running ? 'amber' : 'primary'}`}
          onClick={onToggleRun}
          title="Play / Pause Simulation (Space)"
        >
          {running ? <Pause size={13} /> : <Play size={13} />}
          <span>{running ? 'Pause' : 'Run'}</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={onStep}
          title="Advance 1 Fixed Step (1/60s)"
        >
          <StepForward size={13} />
          <span>Step</span>
        </button>

        <button
          type="button"
          className={`icon-btn ${recording ? 'danger' : ''}`}
          style={
            recording
              ? {
                  borderColor: 'rgba(251, 113, 133, 0.7)',
                  background: 'rgba(251, 113, 133, 0.16)',
                  color: '#fb7185',
                }
              : undefined
          }
          onClick={onToggleRecord}
          title="Record Motion Frames for Scrubbing"
        >
          <Circle size={11} fill={recording ? '#fb7185' : 'none'} />
          <span>{recording ? `Rec (${recordedFramesCount})` : 'Record'}</span>
        </button>

        {recordedFramesCount > 1 && (
          <div className="transport-group" style={{ marginLeft: 4 }}>
            <input
              type="range"
              min={0}
              max={recordedFramesCount - 1}
              value={playbackIndex ?? recordedFramesCount - 1}
              onChange={(e) => onScrubFrame(Number(e.target.value))}
              style={{ width: 95 }}
              title="Scrub Recorded Playback"
            />
            {playbackIndex !== null && (
              <button
                type="button"
                className="icon-btn"
                onClick={() => onScrubFrame(null)}
              >
                Live
              </button>
            )}
          </div>
        )}
      </div>

      <div className="transport-group">
        <span className="field-label">Speed</span>
        <input
          type="range"
          min={0.1}
          max={2.0}
          step={0.1}
          value={timeScale}
          onChange={(e) => onTimeScaleChange(Number(e.target.value))}
          style={{ width: 78 }}
          aria-label="Time Scale"
        />
        <span className="slider-val" style={{ width: 32 }}>
          {timeScale.toFixed(1)}x
        </span>

        <div className="gravity-pills" role="group" aria-label="Gravity Presets">
          {GRAVITY_PRESETS.map((gp) => {
            const active = Math.abs(gravity[1] - gp.vec[1]) < 0.05 && gravity[0] === 0;
            return (
              <button
                key={gp.label}
                type="button"
                className={`gravity-pill ${active ? 'active' : ''}`}
                onClick={() => onGravityChange(gp.vec)}
              >
                {gp.label.split(' ')[0]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
