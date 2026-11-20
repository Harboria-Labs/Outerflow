import React from 'react';
import { Circle, Pause, Play, RotateCcw, StepForward } from 'lucide-react';
import type { Vec3 } from '../types/studio';

interface TransportBarProps {
  simTime: number;
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

const SPEED_OPTIONS = [0.5, 1, 2, 5];

function formatClock(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const TransportBar: React.FC<TransportBarProps> = ({
  simTime,
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
  const gravityKey =
    Math.abs(gravity[1] + 9.81) < 0.05
      ? 'earth'
      : Math.abs(gravity[1] + 1.62) < 0.05
      ? 'moon'
      : Math.abs(gravity[1] + 3.72) < 0.05
      ? 'mars'
      : 'zerog';

  return (
    <div className="floating-playback-bar">
      <button
        type="button"
        className="play-pill-btn"
        onClick={onReset}
        title="Reset Simulation"
      >
        <RotateCcw size={13} />
      </button>

      <button
        type="button"
        className={`play-pill-btn ${running ? 'running' : 'active'}`}
        onClick={onToggleRun}
        title="Play / Pause (Space)"
      >
        {running ? <Pause size={13} /> : <Play size={13} />}
      </button>

      <button
        type="button"
        className="play-pill-btn"
        onClick={onStep}
        title="Step 1 Frame (1/60s)"
      >
        <StepForward size={13} />
      </button>

      <span className="hud-divider" />

      {SPEED_OPTIONS.map((spd) => (
        <button
          key={spd}
          type="button"
          className={`play-pill-btn ${Math.abs(timeScale - spd) < 0.05 ? 'active' : ''}`}
          onClick={() => onTimeScaleChange(spd)}
        >
          {spd}x
        </button>
      ))}

      <span className="hud-divider" />

      <button
        type="button"
        className={`play-pill-btn ${recording ? 'recording' : ''}`}
        onClick={onToggleRecord}
        title="Record Frames for Timeline Scrubbing"
      >
        <Circle size={10} fill={recording ? '#fb7185' : 'none'} />
        {recording && <span>{recordedFramesCount}</span>}
      </button>

      {recordedFramesCount > 1 && (
        <>
          <input
            type="range"
            className="studio-range"
            min={0}
            max={recordedFramesCount - 1}
            value={playbackIndex ?? recordedFramesCount - 1}
            onChange={(e) => onScrubFrame(Number(e.target.value))}
            style={{ width: 76 }}
            title="Scrub Recorded Frames"
          />
          {playbackIndex !== null && (
            <button
              type="button"
              className="play-pill-btn active"
              onClick={() => onScrubFrame(null)}
            >
              Live
            </button>
          )}
        </>
      )}

      <select
        aria-label="Gravity Preset"
        className="gravity-select-mini"
        value={gravityKey}
        onChange={(e) => {
          const v = e.target.value;
          if (v === 'earth') onGravityChange([0, -9.81, 0]);
          else if (v === 'moon') onGravityChange([0, -1.62, 0]);
          else if (v === 'mars') onGravityChange([0, -3.72, 0]);
          else onGravityChange([0, 0, 0]);
        }}
      >
        <option value="earth">Earth g</option>
        <option value="moon">Moon g</option>
        <option value="mars">Mars g</option>
        <option value="zerog">Zero-G</option>
      </select>

      <span className="playback-clock">{formatClock(simTime)}</span>
    </div>
  );
};
