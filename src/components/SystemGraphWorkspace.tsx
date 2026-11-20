import React, { useMemo, useRef, useState } from 'react';
import {
  Activity,
  Box,
  CheckCircle2,
  Cpu,
  FilePlus2,
  GitBranch,
  Layers,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import {
  DISCIPLINE_META,
  ENGINE_CONTRACTS,
  SYSTEM_GRAPH_PRESETS,
  UNIFIED_ELEMENT_REGISTRY,
  createNodeFromDefinition,
  executeSystemGraph,
  validatePortConnection,
  type ElementDiscipline,
  type GraphEdgeConnection,
  type GraphNodeInstance,
  type SystemGraphExecutionResult,
  type SystemGraphModel,
  type UnifiedElementDefinition,
} from '../engines/project/systemGraphEngine';

interface SystemGraphWorkspaceProps {
  graph: SystemGraphModel;
  onGraphChange: (next: SystemGraphModel) => void;
  onSpawnElementIn3D?: (partId: string, label: string) => void;
  onNewBlankProject?: () => void;
}

const TRACE_COLORS = ['#38bdf8', '#facc15', '#34d399', '#f472b6', '#a78bfa', '#fb923c'];

export const SystemGraphWorkspace: React.FC<SystemGraphWorkspaceProps> = ({
  graph,
  onGraphChange,
  onSpawnElementIn3D,
  onNewBlankProject,
}) => {
  const [selectedDiscipline, setSelectedDiscipline] = useState<ElementDiscipline | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(
    () => graph.nodes[0]?.id ?? null
  );
  const [pendingPort, setPendingPort] = useState<{
    nodeId: string;
    portId: string;
  } | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [durationSec, setDurationSec] = useState<number>(6.0);

  const dragNodeRef = useRef<{
    nodeId: string;
    startClientX: number;
    startClientY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const defMap = useMemo(() => {
    const m = new Map<string, UnifiedElementDefinition>();
    for (const d of UNIFIED_ELEMENT_REGISTRY) m.set(d.id, d);
    return m;
  }, []);

  const simResult = useMemo<SystemGraphExecutionResult>(
    () => executeSystemGraph(graph, { durationSec, dtSec: 1 / 60 }),
    [graph, durationSec]
  );

  const filteredRegistry = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return UNIFIED_ELEMENT_REGISTRY.filter((def) => {
      if (selectedDiscipline !== 'all' && def.discipline !== selectedDiscipline) return false;
      if (!q) return true;
      return (
        def.name.toLowerCase().includes(q) ||
        def.summary.toLowerCase().includes(q) ||
        def.discipline.toLowerCase().includes(q)
      );
    });
  }, [selectedDiscipline, searchQuery]);

  const selectedNode = useMemo(
    () => graph.nodes.find((n) => n.id === selectedNodeId) ?? null,
    [graph.nodes, selectedNodeId]
  );
  const selectedDef = selectedNode ? defMap.get(selectedNode.definitionId) ?? null : null;

  const handleAddElementNode = (def: UnifiedElementDefinition) => {
    const count = graph.nodes.length;
    const col = count % 4;
    const row = Math.floor(count / 4);
    const node = createNodeFromDefinition(def.id, {
      x: 70 + col * 245,
      y: 70 + row * 175,
    });
    const next: SystemGraphModel = {
      ...graph,
      nodes: [...graph.nodes, node],
    };
    onGraphChange(next);
    setSelectedNodeId(node.id);
    setStatusBanner(`Added "${def.name}" (${DISCIPLINE_META[def.discipline].shortLabel}) to system graph.`);
  };

  const handleDeleteNode = (nodeId: string) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.filter((n) => n.id !== nodeId),
      edges: graph.edges.filter((e) => e.fromNodeId !== nodeId && e.toNodeId !== nodeId),
    });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleDeleteEdge = (edgeId: string) => {
    onGraphChange({
      ...graph,
      edges: graph.edges.filter((e) => e.id !== edgeId),
    });
  };

  const handleUpdateNodeProp = (nodeId: string, key: string, value: number) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === nodeId
          ? { ...n, properties: { ...n.properties, [key]: value } }
          : n
      ),
    });
  };

  const handleUpdateNodeEquation = (nodeId: string, expr: string) => {
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === nodeId ? { ...n, customEquation: expr } : n
      ),
    });
  };

  const handleClickOutputPort = (nodeId: string, portId: string) => {
    setPendingPort({ nodeId, portId });
    const n = graph.nodes.find((x) => x.id === nodeId);
    setStatusBanner(
      `Connecting output "${portId}" from "${n?.name ?? nodeId}" — click any compatible Input port.`
    );
  };

  const handleClickInputPort = (toNodeId: string, toPortId: string) => {
    if (!pendingPort) {
      setStatusBanner('Select an Output port (right side of a node) first to start a connection.');
      return;
    }
    if (pendingPort.nodeId === toNodeId) {
      setPendingPort(null);
      return;
    }
    const fromNode = graph.nodes.find((n) => n.id === pendingPort.nodeId);
    const toNode = graph.nodes.find((n) => n.id === toNodeId);
    if (!fromNode || !toNode) return;

    const fromDef = defMap.get(fromNode.definitionId);
    const toDef = defMap.get(toNode.definitionId);
    if (!fromDef || !toDef) return;

    const validation = validatePortConnection(fromDef, pendingPort.portId, toDef, toPortId);
    if (!validation.valid) {
      setStatusBanner(`Connection rejected: ${validation.message}`);
      setPendingPort(null);
      return;
    }

    const newEdge: GraphEdgeConnection = {
      id: `edge-${Date.now()}`,
      fromNodeId: fromNode.id,
      fromPortId: pendingPort.portId,
      toNodeId: toNode.id,
      toPortId,
      kind: validation.kind,
      valid: true,
      validationMessage: validation.message,
    };

    onGraphChange({
      ...graph,
      edges: [
        ...graph.edges.filter(
          (e) => !(e.toNodeId === toNodeId && e.toPortId === toPortId)
        ),
        newEdge,
      ],
    });
    setStatusBanner(validation.message);
    setPendingPort(null);
  };

  const handleNodePointerDown = (
    e: React.PointerEvent<HTMLDivElement>,
    node: GraphNodeInstance
  ) => {
    if ((e.target as HTMLElement).closest('button')) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setSelectedNodeId(node.id);
    dragNodeRef.current = {
      nodeId: node.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: node.x,
      origY: node.y,
    };
  };

  const handleNodePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragNodeRef.current;
    if (!st) return;
    const dx = e.clientX - st.startClientX;
    const dy = e.clientY - st.startClientY;
    const nextX = Math.max(12, st.origX + dx);
    const nextY = Math.max(12, st.origY + dy);
    onGraphChange({
      ...graph,
      nodes: graph.nodes.map((n) =>
        n.id === st.nodeId ? { ...n, x: nextX, y: nextY } : n
      ),
    });
  };

  const handleNodePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    dragNodeRef.current = null;
  };

  // Collect up to 5 key output traces to plot in the time-series scope
  const plottedTraces = useMemo(() => {
    const list: Array<{ key: string; label: string; unit: string; color: string }> = [];
    for (const node of graph.nodes) {
      const def = defMap.get(node.definitionId);
      if (!def) continue;
      const primaryOut = def.ports.find((p) => p.direction === 'output');
      if (primaryOut) {
        list.push({
          key: `${node.id}.${primaryOut.id}`,
          label: `${node.name} · ${primaryOut.name}`,
          unit: primaryOut.unit,
          color: TRACE_COLORS[list.length % TRACE_COLORS.length],
        });
      }
      if (list.length >= 6) break;
    }
    return list;
  }, [graph.nodes, defMap]);

  return (
    <div
      className="system-graph-workspace"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 18,
        background: '#090b10',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top Multidisciplinary System Graph Bar */}
      <div
        style={{
          minHeight: 42,
          padding: '6px 14px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(13, 17, 23, 0.96)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontWeight: 700,
              fontSize: 12,
              color: '#f8fafc',
            }}
          >
            <GitBranch size={14} color="#38bdf8" />
            Multidisciplinary System Graph &amp; Co-Simulation Architecture
          </span>

          <select
            aria-label="System Graph Preset"
            className="gravity-select-mini"
            style={{ minWidth: 270 }}
            value={graph.id}
            onChange={(e) => {
              if (e.target.value === 'empty') {
                onGraphChange({
                  id: 'empty',
                  name: 'Untitled Blank System Graph',
                  description: 'Empty construction canvas — add elements from any of the 9 disciplines.',
                  nodes: [],
                  edges: [],
                });
                setSelectedNodeId(null);
                return;
              }
              const found = SYSTEM_GRAPH_PRESETS.find((p) => p.id === e.target.value);
              if (found) {
                const cloned = structuredClone(found);
                onGraphChange(cloned);
                setSelectedNodeId(cloned.nodes[0]?.id ?? null);
              }
            }}
          >
            {SYSTEM_GRAPH_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                ★ {p.name}
              </option>
            ))}
            <option value="empty">+ Empty System Graph (Construct from Scratch)</option>
          </select>

          <button
            type="button"
            className="top-btn"
            onClick={() => {
              onGraphChange({
                id: 'empty',
                name: 'Blank Engineering Project',
                description: 'Constructed from individual elements across 9 disciplines.',
                nodes: [],
                edges: [],
              });
              setSelectedNodeId(null);
              onNewBlankProject?.();
              setStatusBanner('Initialized empty project workspace — add elements from the 9-discipline library below.');
            }}
            title="Start with an Empty Project (Section 2 Fundamental Principle)"
          >
            <FilePlus2 size={13} />
            <span>New Empty System</span>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, color: '#94a3b8' }}>Sim Horizon:</span>
          <select
            aria-label="Co-Simulation Horizon"
            className="gravity-select-mini"
            value={durationSec}
            onChange={(e) => setDurationSec(Number(e.target.value) || 6)}
          >
            <option value={3}>3.0 s</option>
            <option value={6}>6.0 s</option>
            <option value={12}>12.0 s</option>
            <option value={20}>20.0 s</option>
          </select>
          <span
            className="hierarchy-tag"
            style={{
              background: simResult.ok ? 'rgba(52, 211, 153, 0.14)' : 'rgba(251, 113, 133, 0.15)',
              color: simResult.ok ? '#34d399' : '#fb7185',
              padding: '3px 8px',
            }}
          >
            <Play size={10} style={{ display: 'inline', marginRight: 4 }} />
            {simResult.steps} steps solved ({simResult.activeEngines.length} engines)
          </span>
        </div>
      </div>

      {/* Main 3-Pane Body: 9-Discipline Element Library | Interactive Node Graph Canvas | Node & Engine Inspector */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
        {/* Left: 9-Discipline Unified Element Ecosystem Browser */}
        <aside
          style={{
            width: 265,
            minWidth: 265,
            borderRight: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div style={{ padding: '8px 10px', borderBottom: '1px solid var(--border)' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: 6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>Unified Element Ecosystem</span>
              <span className="hierarchy-tag">{UNIFIED_ELEMENT_REGISTRY.length} defs</span>
            </div>

            <div style={{ position: 'relative', marginBottom: 6 }}>
              <Search
                size={12}
                style={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                }}
              />
              <input
                type="text"
                className="input-text"
                style={{ paddingLeft: 24, fontSize: 11 }}
                placeholder="Search 9 disciplines..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="cat-pill-row">
              <button
                type="button"
                className={`cat-pill ${selectedDiscipline === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedDiscipline('all')}
              >
                All (9)
              </button>
              {(Object.keys(DISCIPLINE_META) as ElementDiscipline[]).map((disc) => (
                <button
                  key={disc}
                  type="button"
                  className={`cat-pill ${selectedDiscipline === disc ? 'active' : ''}`}
                  onClick={() => setSelectedDiscipline(disc)}
                >
                  {DISCIPLINE_META[disc].shortLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="panel-scroll" style={{ padding: 8, gap: 6 }}>
            {filteredRegistry.map((def) => {
              const meta = DISCIPLINE_META[def.discipline];
              return (
                <div
                  key={def.id}
                  style={{
                    padding: '7px 9px',
                    borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--bg-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 4,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: '#f8fafc',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                      }}
                    >
                      <span
                        className="color-dot"
                        style={{ background: meta.color }}
                      />
                      {def.name}
                    </span>
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', lineHeight: 1.3 }}>
                    {def.summary}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: 2,
                    }}
                  >
                    <span className="hierarchy-tag" style={{ color: meta.color }}>
                      {meta.shortLabel} · v{def.version}
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {def.spawn3DPartId && onSpawnElementIn3D && (
                        <button
                          type="button"
                          className="cat-pill"
                          title="Also spawn 3D hardware representation in the 3D Studio Viewport"
                          onClick={() => onSpawnElementIn3D(def.spawn3DPartId!, def.name)}
                        >
                          <Box size={10} style={{ display: 'inline', marginRight: 3 }} />
                          +3D
                        </button>
                      )}
                      <button
                        type="button"
                        className="cat-pill active"
                        onClick={() => handleAddElementNode(def)}
                      >
                        <Plus size={10} style={{ display: 'inline', marginRight: 2 }} />
                        Add Node
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Center: Interactive Node Graph Canvas + Time-Series Co-Simulation Scope */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {statusBanner && (
            <div
              style={{
                padding: '4px 12px',
                fontSize: 11,
                background: 'rgba(38, 128, 235, 0.14)',
                borderBottom: '1px solid rgba(56, 189, 248, 0.3)',
                color: '#bae6fd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{statusBanner}</span>
              <button
                type="button"
                className="mini-icon-btn"
                onClick={() => {
                  setStatusBanner(null);
                  setPendingPort(null);
                }}
              >
                ✕
              </button>
            </div>
          )}

          {/* Scrollable Interactive Graph Surface */}
          <div
            style={{
              flex: 1,
              position: 'relative',
              overflow: 'auto',
              backgroundImage:
                'radial-gradient(rgba(148, 163, 184, 0.16) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }}
          >
            <div style={{ position: 'relative', minWidth: 1480, minHeight: 460 }}>
              {/* SVG Bezier Connection Wires */}
              <svg
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  pointerEvents: 'none',
                }}
              >
                {graph.edges.map((edge) => {
                  const fromNode = graph.nodes.find((n) => n.id === edge.fromNodeId);
                  const toNode = graph.nodes.find((n) => n.id === edge.toNodeId);
                  if (!fromNode || !toNode) return null;
                  const fromDef = defMap.get(fromNode.definitionId);
                  const toDef = defMap.get(toNode.definitionId);
                  const outPorts =
                    fromDef?.ports.filter((p) => p.direction === 'output') ?? [];
                  const inPorts =
                    toDef?.ports.filter((p) => p.direction === 'input') ?? [];
                  const outIdx = Math.max(
                    0,
                    outPorts.findIndex((p) => p.id === edge.fromPortId)
                  );
                  const inIdx = Math.max(
                    0,
                    inPorts.findIndex((p) => p.id === edge.toPortId)
                  );

                  const x1 = fromNode.x + 205;
                  const y1 = fromNode.y + 48 + outIdx * 22;
                  const x2 = toNode.x;
                  const y2 = toNode.y + 48 + inIdx * 22;
                  const dx = Math.max(60, Math.abs(x2 - x1) * 0.45);
                  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
                  const strokeColor =
                    edge.kind === 'electrical'
                      ? '#facc15'
                      : edge.kind === 'mechanical'
                      ? '#38bdf8'
                      : edge.kind === 'biological'
                      ? '#f472b6'
                      : edge.kind === 'mathematical'
                      ? '#a78bfa'
                      : '#34d399';

                  return (
                    <g key={edge.id}>
                      <path
                        d={d}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={2.2}
                        strokeOpacity={0.85}
                      />
                      <circle cx={x1} cy={y1} r={3.5} fill={strokeColor} />
                      <circle cx={x2} cy={y2} r={3.5} fill={strokeColor} />
                    </g>
                  );
                })}
              </svg>

              {/* Graph Nodes */}
              {graph.nodes.map((node) => {
                const def = defMap.get(node.definitionId);
                if (!def) return null;
                const meta = DISCIPLINE_META[node.discipline];
                const inPorts = def.ports.filter((p) => p.direction === 'input');
                const outPorts = def.ports.filter((p) => p.direction === 'output');
                const finalOut = simResult.finalNodeOutputs[node.id] ?? {};
                const isSelected = node.id === selectedNodeId;

                return (
                  <div
                    key={node.id}
                    onPointerDown={(e) => handleNodePointerDown(e, node)}
                    onPointerMove={handleNodePointerMove}
                    onPointerUp={handleNodePointerUp}
                    style={{
                      position: 'absolute',
                      left: node.x,
                      top: node.y,
                      width: 205,
                      borderRadius: 8,
                      background: 'rgba(17, 24, 39, 0.95)',
                      border: `1.5px solid ${isSelected ? '#38bdf8' : 'rgba(148, 163, 184, 0.25)'}`,
                      boxShadow: isSelected
                        ? '0 0 0 2px rgba(56, 189, 248, 0.25), 0 10px 25px rgba(0,0,0,0.55)'
                        : '0 6px 18px rgba(0,0,0,0.45)',
                      cursor: 'grab',
                      userSelect: 'none',
                    }}
                  >
                    {/* Node Header */}
                    <div
                      style={{
                        padding: '5px 8px',
                        borderBottom: '1px solid rgba(148, 163, 184, 0.16)',
                        background: 'rgba(15, 23, 42, 0.9)',
                        borderTopLeftRadius: 7,
                        borderTopRightRadius: 7,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 4,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10.5,
                          fontWeight: 700,
                          color: '#f8fafc',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                        }}
                      >
                        <span
                          className="color-dot"
                          style={{ background: meta.color }}
                        />
                        {node.name}
                      </span>
                      <button
                        type="button"
                        className="mini-icon-btn"
                        title="Remove Element Node"
                        onClick={() => handleDeleteNode(node.id)}
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    {/* Input & Output Typed Ports */}
                    <div
                      style={{
                        padding: '6px 6px',
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 4,
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {inPorts.map((port) => (
                          <button
                            key={port.id}
                            type="button"
                            onClick={() => handleClickInputPort(node.id, port.id)}
                            title={`Input Port: ${port.name} (${port.kind} · ${port.unit || 'scalar'}) — Click to complete connection`}
                            style={{
                              border: '1px solid rgba(148,163,184,0.25)',
                              background: pendingPort
                                ? 'rgba(56, 189, 248, 0.16)'
                                : 'rgba(15, 23, 42, 0.7)',
                              color: '#cbd5e1',
                              borderRadius: 4,
                              padding: '2px 5px',
                              fontSize: 9.5,
                              textAlign: 'left',
                              cursor: 'pointer',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            ▸ {port.id}
                          </button>
                        ))}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {outPorts.map((port) => {
                          const isPending =
                            pendingPort?.nodeId === node.id &&
                            pendingPort?.portId === port.id;
                          const val = finalOut[port.id];
                          return (
                            <button
                              key={port.id}
                              type="button"
                              onClick={() => handleClickOutputPort(node.id, port.id)}
                              title={`Output Port: ${port.name} (${port.kind} · ${port.unit || 'scalar'}) — Click to start wire`}
                              style={{
                                border: `1px solid ${
                                  isPending ? '#38bdf8' : 'rgba(148,163,184,0.25)'
                                }`,
                                background: isPending
                                  ? 'rgba(56, 189, 248, 0.28)'
                                  : 'rgba(15, 23, 42, 0.7)',
                                color: '#e2e8f0',
                                borderRadius: 4,
                                padding: '2px 5px',
                                fontSize: 9.5,
                                textAlign: 'right',
                                cursor: 'pointer',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {port.id}:{' '}
                              <strong style={{ color: meta.color }}>
                                {Number.isFinite(val) ? val.toFixed(2) : '0.00'}
                              </strong>{' '}
                              ▸
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {graph.nodes.length === 0 && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#94a3b8',
                    gap: 8,
                  }}
                >
                  <Layers size={28} color="#38bdf8" />
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                    Empty Multidisciplinary Construction Canvas
                  </div>
                  <div style={{ fontSize: 11.5, maxWidth: 440, textAlign: 'center' }}>
                    Click <strong>+ Add Node</strong> on any element in the 9-discipline library on the left to place mechanical, robotic, electrical, mathematical, fluid, or biological components and wire their ports together.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Time-Series Multidisciplinary Co-Simulation Scope */}
          <div
            style={{
              height: 165,
              borderTop: '1px solid var(--border)',
              background: 'rgba(12, 15, 22, 0.98)',
              padding: '6px 12px',
              display: 'flex',
              gap: 12,
            }}
          >
            <div
              style={{
                flex: 1.7,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 8px',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 10.5,
                  color: '#94a3b8',
                  marginBottom: 4,
                  flexWrap: 'wrap',
                  gap: 6,
                }}
              >
                <span style={{ fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Activity size={12} color="#38bdf8" />
                  Multidisciplinary Co-Simulation Time-Series Scope (t = 0 … {durationSec}s)
                </span>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {plottedTraces.map((tr) => (
                    <span
                      key={tr.key}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10 }}
                    >
                      <span
                        className="color-dot"
                        style={{ background: tr.color, width: 7, height: 7 }}
                      />
                      {tr.label} {tr.unit ? `(${tr.unit})` : ''}
                    </span>
                  ))}
                </div>
              </div>

              <svg
                viewBox="0 0 640 105"
                style={{ width: '100%', height: '100%', overflow: 'visible' }}
              >
                <line x1={0} y1={52} x2={640} y2={52} stroke="#1e293b" strokeDasharray="3 3" />
                {plottedTraces.map((tr) => {
                  const pts = simResult.samples.map((s) => s.values[tr.key] ?? 0);
                  if (pts.length < 2) return null;
                  const minV = Math.min(...pts);
                  const maxV = Math.max(...pts);
                  const span = Math.max(1e-4, maxV - minV);
                  const poly = pts
                    .map((v, i) => {
                      const x = (i / (pts.length - 1)) * 636 + 2;
                      const y = 96 - ((v - minV) / span) * 86;
                      return `${x.toFixed(1)},${y.toFixed(1)}`;
                    })
                    .join(' ');
                  return (
                    <polyline
                      key={tr.key}
                      fill="none"
                      stroke={tr.color}
                      strokeWidth={1.8}
                      points={poly}
                    />
                  );
                })}
              </svg>
            </div>

            {/* Active Execution Engines Contract Summary */}
            <div
              style={{
                flex: 1,
                minWidth: 250,
                background: 'var(--bg-input)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 9px',
                overflowY: 'auto',
                fontSize: 10.5,
              }}
            >
              <div
                style={{
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: 5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Cpu size={12} color="#34d399" />
                Coordinated Execution Engines ({ENGINE_CONTRACTS.length})
              </div>
              {ENGINE_CONTRACTS.map((eng) => {
                const isActive = simResult.activeEngines.includes(eng.id);
                return (
                  <div
                    key={eng.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '3px 0',
                      borderBottom: '1px solid rgba(148,163,184,0.1)',
                      color: isActive ? '#e2e8f0' : '#64748b',
                    }}
                  >
                    <span>
                      {isActive ? (
                        <CheckCircle2
                          size={10}
                          color="#34d399"
                          style={{ display: 'inline', marginRight: 4 }}
                        />
                      ) : null}
                      {eng.name}
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5 }}>
                      Δt={(eng.timeStepSec * 1000).toFixed(1)}ms
                    </span>
                  </div>
                );
              })}
              {simResult.validationErrors.length > 0 && (
                <div style={{ color: '#fb7185', marginTop: 4 }}>
                  <AlertTriangle size={11} style={{ display: 'inline', marginRight: 4 }} />
                  {simResult.validationErrors[0]}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right: Selected Element Property & Connection Inspector */}
        <aside
          style={{
            width: 285,
            minWidth: 285,
            borderLeft: '1px solid var(--border)',
            background: 'var(--bg-panel)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          <div className="panel-header">
            <span className="panel-header-title">
              <Sparkles size={13} color="#38bdf8" />
              Element &amp; Port Inspector
            </span>
          </div>

          <div className="panel-scroll" style={{ padding: 10, gap: 10 }}>
            {selectedNode && selectedDef ? (
              <>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: '#f8fafc' }}>
                    {selectedNode.name}
                  </div>
                  <div style={{ fontSize: 10.5, color: '#94a3b8', marginTop: 2 }}>
                    {selectedDef.summary}
                  </div>
                </div>

                {selectedNode.definitionId === 'math-expression-operator' && (
                  <div className="field-col">
                    <label className="field-label">Symbolic Expression f(x, y, t, a, b)</label>
                    <input
                      type="text"
                      className="input-text"
                      value={selectedNode.customEquation ?? selectedDef.defaultEquation ?? ''}
                      onChange={(e) =>
                        handleUpdateNodeEquation(selectedNode.id, e.target.value)
                      }
                    />
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>
                    Physical &amp; Mathematical Parameters
                  </div>
                  {selectedDef.properties.map((prop) => {
                    const val = selectedNode.properties[prop.key] ?? prop.defaultValue;
                    return (
                      <div key={prop.key} className="field-col">
                        <div className="field-row">
                          <span className="field-label">
                            {prop.label} {prop.unit ? `(${prop.unit})` : ''}
                          </span>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 11,
                              color: '#38bdf8',
                            }}
                          >
                            {val}
                          </span>
                        </div>
                        <input
                          type="range"
                          className="studio-range"
                          min={prop.min}
                          max={prop.max}
                          step={prop.step}
                          value={val}
                          onChange={(e) =>
                            handleUpdateNodeProp(
                              selectedNode.id,
                              prop.key,
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>
                    Computed Steady-State / Final Outputs
                  </div>
                  {selectedDef.ports
                    .filter((p) => p.direction === 'output')
                    .map((port) => {
                      const val =
                        simResult.finalNodeOutputs[selectedNode.id]?.[port.id] ?? 0;
                      return (
                        <div key={port.id} className="details-row">
                          <span className="details-key">{port.name}</span>
                          <span className="details-val">
                            {val.toFixed(3)} {port.unit}
                          </span>
                        </div>
                      );
                    })}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: '#cbd5e1' }}>
                    Active Port Connections ({graph.edges.length})
                  </div>
                  {graph.edges
                    .filter(
                      (e) =>
                        e.fromNodeId === selectedNode.id || e.toNodeId === selectedNode.id
                    )
                    .map((edge) => {
                      const fn = graph.nodes.find((n) => n.id === edge.fromNodeId);
                      const tn = graph.nodes.find((n) => n.id === edge.toNodeId);
                      return (
                        <div
                          key={edge.id}
                          className="hierarchy-item"
                          style={{ fontSize: 10.5 }}
                        >
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {fn?.name}.{edge.fromPortId} → {tn?.name}.{edge.toPortId}
                          </span>
                          <button
                            type="button"
                            className="mini-icon-btn"
                            onClick={() => handleDeleteEdge(edge.id)}
                            title="Disconnect wire"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      );
                    })}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 11.5, color: '#94a3b8' }}>
                Select any element node in the System Graph to inspect and tune its physical, electrical, mathematical, or biological parameters.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};
