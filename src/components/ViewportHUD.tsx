import React from 'react';
import { Crosshair, Maximize2, MousePointer, Move, RotateCw } from 'lucide-react';
import type { CameraPreset, GizmoMode, StudioMode } from '../types/studio';

interface ViewportHUDProps {
  mode: StudioMode;
  fps: number;
  simTime: number;
  statusText: string;
  gizmoMode: GizmoMode;
  onGizmoChange: (g: GizmoMode) => void;
  onCameraPreset: (p: CameraPreset) => void;
  onFocusSelected: () => void;
}

export const ViewportHUD: React.FC<ViewportHUDProps> = ({
  mode,
  fps,
  simTime,
  statusText,
  gizmoMode,
  onGizmoChange,
  onCameraPreset,
  onFocusSelected,
}) => {
  const showGizmos = mode === 'physics' || mode === 'cad' || mode === 'experiments';

  return (
    <>
      <div className="hud-top-left">
        <div className="hud-pill">
          <span>
            FPS <strong>{fps}</strong>
          </span>
          <span>
            t = <strong>{simTime.toFixed(2)}s</strong>
          </span>
          <span>{statusText}</span>
        </div>
      </div>

      <div className="hud-top-right">
        {(['persp', 'top', 'front', 'right', 'iso'] as CameraPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            className="hud-btn"
            onClick={() => onCameraPreset(p)}
          >
            {p.toUpperCase()}
          </button>
        ))}
        <button
          type="button"
          className="hud-btn"
          onClick={onFocusSelected}
          title="Focus Camera on Selected Object"
        >
          <Crosshair size={12} />
        </button>
      </div>

      {showGizmos && (
        <div className="hud-bottom-left" role="group" aria-label="Transform Gizmo">
          <button
            type="button"
            className={`hud-btn ${gizmoMode === 'select' ? 'active' : ''}`}
            onClick={() => onGizmoChange('select')}
            title="Select (Q)"
          >
            <MousePointer size={12} />
          </button>
          <button
            type="button"
            className={`hud-btn ${gizmoMode === 'translate' ? 'active' : ''}`}
            onClick={() => onGizmoChange('translate')}
            title="Move (W)"
          >
            <Move size={12} />
          </button>
          <button
            type="button"
            className={`hud-btn ${gizmoMode === 'rotate' ? 'active' : ''}`}
            onClick={() => onGizmoChange('rotate')}
            title="Rotate (E)"
          >
            <RotateCw size={12} />
          </button>
          <button
            type="button"
            className={`hud-btn ${gizmoMode === 'scale' ? 'active' : ''}`}
            onClick={() => onGizmoChange('scale')}
            title="Scale (R)"
          >
            <Maximize2 size={12} />
          </button>
        </div>
      )}
    </>
  );
};
