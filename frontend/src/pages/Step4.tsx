import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { extractSketchUrl, isBrowser, requestJson } from './stepShared';
import './Steps.css';

type Step4Props = {
  onBack?: () => void;
};

type SelectionType = 'motivation' | 'preference';

type WorkItemRecord = {
  id: number;
  user_id: number;
  name: string;
  before_sketch_url?: string | null;
  [key: string]: unknown;
};

type ChipRecord = {
  id: number;
  masterId: number;
  kind: SelectionType;
  label: string;
};

type PlacementRecord = {
  id: number;
  user_id: number;
  work_item_id: number;
  kind: SelectionType;
  master_id: number;
  x: number;
  y: number;
};

type PlacementState = {
  id: number;
  kind: SelectionType;
  masterId: number;
  x: number;
  y: number;
};

type StatusMessage = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

const makePlacementKey = (kind: SelectionType, masterId: number) => `${kind}:${masterId}`;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const Step4: React.FC<Step4Props> = ({ onBack }) => {
  const [userId, setUserId] = useState<number | null>(null);
  const [workItemId, setWorkItemId] = useState<number | null>(null);
  const [workItem, setWorkItem] = useState<WorkItemRecord | null>(null);
  const [chips, setChips] = useState<ChipRecord[]>([]);
  const [placements, setPlacements] = useState<PlacementState[]>([]);
  const [highlightedPlacementId, setHighlightedPlacementId] = useState<number | null>(null);
  const [status, setStatus] = useState<StatusMessage>(null);
  const [loading, setLoading] = useState(false);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const pointerStateRef = useRef<{
    pointerId: number;
    placementId: number;
    rect: DOMRect;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
  } | null>(null);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!isBrowser) return;

    const params = new URLSearchParams(window.location.search);
    const rawUserId = params.get('user_id') ?? params.get('userId');
    const rawWorkItemId = params.get('work_item_id') ?? params.get('workItemId');

    if (rawUserId && /^\d+$/.test(rawUserId)) {
      setUserId(Number(rawUserId));
    } else {
      setStatus({ type: 'error', message: 'user_id クエリパラメータを指定してください。' });
    }

    if (rawWorkItemId && /^\d+$/.test(rawWorkItemId)) {
      setWorkItemId(Number(rawWorkItemId));
    } else {
      setStatus({ type: 'error', message: 'work_item_id クエリパラメータを指定してください。' });
    }
  }, []);

  useEffect(() => {
    if (status && isBrowser) {
      const timer = window.setTimeout(() => setStatus(null), 4000);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [status]);

  const loadInitialData = useCallback(async () => {
    if (userId === null || workItemId === null) return;

    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setLoading(true);

    try {
      const [workItemData, motivationLinks, preferenceLinks] = await Promise.all([
        requestJson<WorkItemRecord>(
          `/api/v1/work_items/${workItemId}?user_id=${userId}`,
          { signal: controller.signal },
        ),
        requestJson<{
          id: number;
          motivation_master_id: number;
          motivation_name: string;
        }[]>(
          `/api/v1/work_item_motivations?user_id=${userId}&work_item_id=${workItemId}`,
          { signal: controller.signal },
        ),
        requestJson<{
          id: number;
          preference_master_id: number;
          preference_name: string;
        }[]>(
          `/api/v1/work_item_preferences?user_id=${userId}&work_item_id=${workItemId}`,
          { signal: controller.signal },
        ),
      ]);

      if (controller.signal.aborted) return;

      const motivationChips: ChipRecord[] = motivationLinks.map((link) => ({
        id: link.id,
        masterId: link.motivation_master_id,
        kind: 'motivation',
        label: link.motivation_name,
      }));
      const preferenceChips: ChipRecord[] = preferenceLinks.map((link) => ({
        id: link.id,
        masterId: link.preference_master_id,
        kind: 'preference',
        label: link.preference_name,
      }));
      const combinedChips = [...motivationChips, ...preferenceChips];

      setWorkItem(workItemData);
      setChips(combinedChips);

      const placementData = await requestJson<PlacementRecord[]>(
        `/api/v1/placements?user_id=${userId}&work_item_id=${workItemId}`,
        { signal: controller.signal },
      );

      if (controller.signal.aborted) return;

      const chipKeySet = new Set(combinedChips.map((chip) => makePlacementKey(chip.kind, chip.masterId)));
      const placementStates = placementData
        .map((placement) => ({
          id: placement.id,
          kind: placement.kind,
          masterId: placement.master_id,
          x: Number(placement.x),
          y: Number(placement.y),
        }))
        .filter((placement) => chipKeySet.has(makePlacementKey(placement.kind, placement.masterId)));

      setPlacements(placementStates);
      setHighlightedPlacementId(null);
    } catch (error) {
      if (!controller.signal.aborted && error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [userId, workItemId]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => () => {
    activeRequestRef.current?.abort();
  }, []);

  const sketchUrl = useMemo(() => extractSketchUrl(workItem), [workItem]);

  const placedKeySet = useMemo(() => new Set(placements.map((placement) => makePlacementKey(placement.kind, placement.masterId))), [placements]);

  const availableChips = useMemo(
    () => [...chips].sort((a, b) => a.label.localeCompare(b.label, 'ja')),
    [chips],
  );

  useEffect(() => {
    if (!highlightedPlacementId || !overlayRef.current || !isBrowser) return undefined;

    const element = overlayRef.current.querySelector<HTMLDivElement>(
      `.sketch-overlay__label[data-id="${highlightedPlacementId}"]`,
    );
    if (!element) return undefined;

    element.classList.add('is-highlighted');
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });

    const timer = window.setTimeout(() => {
      element.classList.remove('is-highlighted');
      setHighlightedPlacementId(null);
    }, 1600);

    return () => {
      element.classList.remove('is-highlighted');
      window.clearTimeout(timer);
    };
  }, [highlightedPlacementId]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (isBrowser) {
      window.history.back();
    }
  };

  const handleDragStart = (event: React.DragEvent<HTMLLIElement>, chip: ChipRecord) => {
    if (!event.dataTransfer) return;
    const payload = JSON.stringify({ kind: chip.kind, masterId: chip.masterId });
    event.dataTransfer.effectAllowed = 'copy';
    event.dataTransfer.setData('application/json', payload);
    event.dataTransfer.setData('text/plain', payload);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    if (!chips.length || userId === null || workItemId === null) return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'copy';
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();

    if (!overlayRef.current || userId === null || workItemId === null) return;

    const raw = event.dataTransfer?.getData('application/json') || event.dataTransfer?.getData('text/plain');
    if (!raw) return;

    let payload: { kind: SelectionType; masterId: number } | null = null;
    try {
      const parsed = JSON.parse(raw);
      const kind = parsed?.kind;
      const masterId = Number(parsed?.masterId);
      if ((kind === 'motivation' || kind === 'preference') && Number.isFinite(masterId)) {
        payload = { kind, masterId };
      }
    } catch (error) {
      // ignore parse errors
    }

    if (!payload) return;

    const chip = chips.find(
      (item) => item.kind === payload.kind && item.masterId === payload.masterId,
    );
    if (!chip) {
      setStatus({ type: 'error', message: 'このカードは利用できません。' });
      return;
    }

    const placementKey = makePlacementKey(chip.kind, chip.masterId);
    if (placedKeySet.has(placementKey)) {
      setStatus({ type: 'error', message: 'このカードはすでに配置済みです。' });
      return;
    }

    const rect = overlayRef.current.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    try {
      const record = await requestJson<PlacementRecord>(
        '/api/v1/placements',
        {
          method: 'POST',
          body: {
            placement: {
              user_id: userId,
              work_item_id: workItemId,
              kind: chip.kind,
              master_id: chip.masterId,
              x,
              y,
            },
          },
        },
      );

      const placement: PlacementState = {
        id: record.id,
        kind: record.kind,
        masterId: record.master_id,
        x: Number(record.x),
        y: Number(record.y),
      };

      setPlacements((prev) => [...prev, placement]);
      setHighlightedPlacementId(record.id);
      setStatus({ type: 'success', message: 'カードを配置しました。' });
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>, placementId: number) => {
    if (!overlayRef.current) return;

    const placement = placements.find((item) => item.id === placementId);
    if (!placement) return;

    const rect = overlayRef.current.getBoundingClientRect();
    pointerStateRef.current = {
      pointerId: event.pointerId,
      placementId,
      rect,
      startX: placement.x,
      startY: placement.y,
      lastX: placement.x,
      lastY: placement.y,
    };

    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId || !overlayRef.current) return;

    event.preventDefault();

    const { rect, placementId } = state;
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    pointerStateRef.current = { ...state, lastX: x, lastY: y };
    setPlacements((prev) =>
      prev.map((placement) =>
        placement.id === placementId
          ? { ...placement, x, y }
          : placement,
      ),
    );
  };

  const finalizePointer = async (event: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    pointerStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);

    if (userId === null || workItemId === null) return;

    if (state.lastX === state.startX && state.lastY === state.startY) {
      return;
    }

    try {
      await requestJson<PlacementRecord>(
        `/api/v1/placements/${state.placementId}`,
        {
          method: 'PATCH',
          body: {
            placement: {
              user_id: userId,
              work_item_id: workItemId,
              x: state.lastX,
              y: state.lastY,
            },
          },
        },
      );
      setStatus({ type: 'success', message: '配置位置を更新しました。' });
    } catch (error) {
      setPlacements((prev) =>
        prev.map((placement) =>
          placement.id === state.placementId
            ? { ...placement, x: state.startX, y: state.startY }
            : placement,
        ),
      );
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    finalizePointer(event);
  };

  const handlePointerCancel = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = pointerStateRef.current;
    if (!state || state.pointerId !== event.pointerId) return;

    pointerStateRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
    setPlacements((prev) =>
      prev.map((placement) =>
        placement.id === state.placementId
          ? { ...placement, x: state.startX, y: state.startY }
          : placement,
      ),
    );
  };

  const handleFocusPlacement = (placementId: number) => {
    setHighlightedPlacementId(placementId);
  };

  const handleRemovePlacement = async (placementId: number) => {
    if (userId === null || workItemId === null) return;

    try {
      await requestJson<null>(
        `/api/v1/placements/${placementId}?user_id=${userId}&work_item_id=${workItemId}`,
        { method: 'DELETE' },
      );
      setPlacements((prev) => prev.filter((placement) => placement.id !== placementId));
      setHighlightedPlacementId((current) => (current === placementId ? null : current));
      setStatus({ type: 'success', message: '配置を削除しました。' });
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const handleResetPlacements = async () => {
    if (userId === null || workItemId === null || placements.length === 0) return;

    try {
      await Promise.all(
        placements.map((placement) =>
          requestJson<null>(
            `/api/v1/placements/${placement.id}?user_id=${userId}&work_item_id=${workItemId}`,
            { method: 'DELETE' },
          ),
        ),
      );
      setHighlightedPlacementId(null);
      setPlacements([]);
      setStatus({ type: 'success', message: 'すべての配置を削除しました。' });
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const workspaceMessage = useMemo(() => {
    if (!chips.length) {
      return 'ステップ3で動機と嗜好を選択すると、ここにカードが表示されます。';
    }
    if (!placements.length) {
      return 'カードをドラッグしてスケッチ上に配置してください。';
    }
    return `${placements.length}件のカードを配置しました。ドラッグで位置を調整できます。`;
  }, [chips.length, placements.length]);

  return (
    <div className="step-page step4">
      <header className="step-header">
        <div className="step-header__info">
          <span className="step-header__badge">STEP 4</span>
          <h1 className="step-header__title">ビフォースケッチへの配置</h1>
        </div>
        <p className="step-header__hint">
          ステップ3で選んだ動機・嗜好をキャンバス上に配置し、ユーザーの背景を視覚的に整理します。
        </p>
      </header>

      {status && (
        <div className={`step-status step-status--${status.type}`} role="status">
          {status.message}
        </div>
      )}

      <main className="step-layout">
        <section className="step-layout__left">
          <div
            className="sketch-workspace"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {sketchUrl ? (
              <img src={sketchUrl} alt="ビフォースケッチの背景" />
            ) : (
              <p className="sketch-workspace__placeholder">
                ビフォースケッチが見つかりません。ステップ1の結果を確認してください。
              </p>
            )}
            <div
              ref={overlayRef}
              className="sketch-overlay"
              aria-live="polite"
            >
              {placements.map((placement) => {
                const chip = chips.find((item) =>
                  item.kind === placement.kind && item.masterId === placement.masterId,
                );
                if (!chip) return null;

                return (
                  <div
                    key={placement.id}
                    data-id={placement.id}
                    data-type={placement.kind}
                    className="sketch-overlay__label"
                    style={{
                      left: `${placement.x * 100}%`,
                      top: `${placement.y * 100}%`,
                    }}
                    onPointerDown={(event) => handlePointerDown(event, placement.id)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerCancel}
                  >
                    {chip.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="workspace-toolbar">
            <button
              type="button"
              className="workspace-toolbar__btn"
              disabled={!placements.length}
              onClick={handleResetPlacements}
            >
              すべて削除
            </button>
            <span className="workspace-toolbar__info">{workspaceMessage}</span>
          </div>
        </section>

        <section className="step-layout__right">
          <div className="selected-items">
            <div className="selected-items__header">
              <h2>配置可能なカード</h2>
              <span className="selected-items__counter">{chips.length}件</span>
            </div>
            {loading ? (
              <p className="panel-message">読込中です…</p>
            ) : chips.length === 0 ? (
              <p className="selected-items__empty">
                ステップ3で動機・嗜好を紐づけると、ここにカードが表示されます。
              </p>
            ) : (
              <ul className="selected-items__list">
                {availableChips.map((chip) => {
                  const isPlaced = placedKeySet.has(makePlacementKey(chip.kind, chip.masterId));
                  return (
                    <li
                      key={`${chip.kind}-${chip.masterId}`}
                      className={`selection-chip${isPlaced ? ' selection-chip--placed' : ''}`}
                      draggable={!isPlaced}
                      onDragStart={(event) => handleDragStart(event, chip)}
                    >
                      <span className="selection-chip__type">{chip.kind === 'motivation' ? 'Motivation' : 'Preference'}</span>
                      <span>{chip.label}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="placed-items">
            <div className="placed-items__header">
              <h2>配置済みのカード</h2>
              <span className="placed-items__counter">{placements.length}件</span>
            </div>
            {placements.length === 0 ? (
              <p className="selected-items__empty">まだ配置されているカードはありません。</p>
            ) : (
              <ul className="placed-items__list">
                {placements.map((placement) => {
                  const chip = chips.find((item) =>
                    item.kind === placement.kind && item.masterId === placement.masterId,
                  );
                  if (!chip) return null;

                  return (
                    <li key={placement.id} className="placed-list-item">
                      <span className="placed-list-item__label">{chip.label}</span>
                      <div className="placed-list-item__actions">
                        <button
                          type="button"
                          className="placed-list-item__btn"
                          onClick={() => handleFocusPlacement(placement.id)}
                        >
                          位置を確認
                        </button>
                        <button
                          type="button"
                          className="placed-list-item__btn placed-list-item__btn--danger"
                          onClick={() => handleRemovePlacement(placement.id)}
                        >
                          削除
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="step-actions">
            <button type="button" className="step-action-btn" onClick={handleBack}>
              戻る
            </button>
            <button type="button" className="step-action-btn step-action-btn--primary" onClick={loadInitialData}>
              最新状態を再取得
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Step4;
