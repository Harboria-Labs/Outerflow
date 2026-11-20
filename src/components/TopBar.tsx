import React, { useRef, useState } from 'react';
import {
  Atom,
  Box,
  Cpu,
  Download,
  Eye,
  FlaskConical,
  Grid3x3,
  Layers,
  Sigma,
  Sun,
  Upload,
  Waves,
} from 'lucide-react';
import type { LightingPreset, StudioMode, ViewportOverlays } from '../types/studio';

interface TopBarProps {
  mode: StudioMode;
  onModeChange: (m: StudioMode) => void;
  overlays: ViewportOverlays;
  onOverlaysChange: (next: ViewportOverlays) => void;
  onSaveScene: () => void;
  onLoadScene: (file: File) => void;
  onExportGLB: () => void;
  onExportSTL: () => void;
  onExportOBJ: () => void;
  onCapturePNG: () => void;
}

const MODES: { id: StudioMode; label: string; icon: React.ReactNode }[] = [
  { id: 'physics', label: 'Physics', icon: <Atom size={14} /> },
  { id: 'cad', label: 'CAD & CSG', icon: <Box size={14} /> },
  { id: 'math', label: 'Mathematics', icon: <Sigma size={14} /> },
  { id: 'soft', label: 'Fields & Soft', icon: <Waves size={14} /> },
  { id: 'experiments', label: 'Experiments', icon: <FlaskConical size={14} /> },
];

export const TopBar: React.FC<TopBarProps> = ({
  mode,
  onModeChange,
  overlays,
  onOverlaysChange,
  onSaveScene,
  onLoadScene,
  onExportGLB,
  onExportSTL,
  onExportOBJ,
  onCapturePNG,
}) => {
  const [exportOpen, setExportOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const toggleOverlay = (key: 'showGrid' | 'showAxes' | 'showWireframe' | 'showColliders') => {
    onOverlaysChange({ ...overlays, [key]: !overlays[key] });
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">
          <Cpu size={15} />
        </div>
        <div className="brand-title">
          <span className="brand-name">OUTERFLOW</span>
          <span className="brand-sub">Harboria Labs · 3D Studio</span>
        </div>
      </div>

      <nav className="mode-tabs" aria-label="Studio Modes">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`mode-tab ${mode === m.id ? 'active' : ''}`}
            onClick={() => onModeChange(m.id)}
          >
            {m.icon}
            <span>{m.label}</span>
          </button>
        ))}
      </nav>

      <div className="topbar-actions">
        <button
          type="button"
          className={`icon-btn ${overlays.showGrid ? 'active' : ''}`}
          onClick={() => toggleOverlay('showGrid')}
          title="Toggle Floor Grid"
        >
          <Grid3x3 size={13} />
          <span>Grid</span>
        </button>

        <button
          type="button"
          className={`icon-btn ${overlays.showWireframe ? 'active' : ''}`}
          onClick={() => toggleOverlay('showWireframe')}
          title="Toggle Wireframe Shading"
        >
          <Layers size={13} />
          <span>Wire</span>
        </button>

        <button
          type="button"
          className={`icon-btn ${overlays.showColliders ? 'active' : ''}`}
          onClick={() => toggleOverlay('showColliders')}
          title="Toggle Physics Collider Outlines"
        >
          <Eye size={13} />
          <span>Colliders</span>
        </button>

        <div className="icon-btn" style={{ padding: '0 6px' }} title="Studio Lighting Preset">
          <Sun size={13} />
          <select
            aria-label="Lighting Preset"
            className="input-select"
            style={{ border: 'none', background: 'transparent', padding: 0, width: 'auto' }}
            value={overlays.lighting}
            onChange={(e) =>
              onOverlaysChange({ ...overlays, lighting: e.target.value as LightingPreset })
            }
          >
            <option value="studio">Studio</option>
            <option value="blueprint">Blueprint</option>
            <option value="lab">Bright Lab</option>
            <option value="aerospace">Aerospace</option>
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.outerflow.json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onLoadScene(f);
            e.target.value = '';
          }}
        />

        <button
          type="button"
          className="icon-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Open .outerflow.json scene"
        >
          <Upload size={13} />
          <span>Load</span>
        </button>

        <button
          type="button"
          className="icon-btn primary"
          onClick={() => setExportOpen((o) => !o)}
          title="Save & Export Scene or 3D Geometry"
        >
          <Download size={13} />
          <span>Export</span>
        </button>

        {exportOpen && (
          <div className="dropdown-menu" onMouseLeave={() => setExportOpen(false)}>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onSaveScene();
                setExportOpen(false);
              }}
            >
              <span>Save Scene JSON</span>
              <span className="hierarchy-tag">.json</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportGLB();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Scene (GLB)</span>
              <span className="hierarchy-tag">.glb</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportSTL();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Mesh (STL)</span>
              <span className="hierarchy-tag">.stl</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onExportOBJ();
                setExportOpen(false);
              }}
            >
              <span>Export 3D Mesh (OBJ)</span>
              <span className="hierarchy-tag">.obj</span>
            </button>
            <button
              type="button"
              className="dropdown-item"
              onClick={() => {
                onCapturePNG();
                setExportOpen(false);
              }}
            >
              <span>Capture Viewport PNG</span>
              <span className="hierarchy-tag">.png</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
