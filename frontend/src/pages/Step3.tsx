import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { extractSketchUrl, isBrowser, requestJson } from './stepShared';
import './Steps.css';

type Step3Props = {
  onBack?: () => void;
  onProceed?: () => void;
};

type MasterRecord = {
  id: number;
  user_id: number;
  name: string;
};

type WorkItemRecord = {
  id: number;
  user_id: number;
  name: string;
  energy_percentage?: number | null;
  reframe?: string | null;
  before_sketch_url?: string | null;
  [key: string]: unknown;
};

type MotivationLink = {
  id: number;
  user_id: number;
  work_item_id: number;
  motivation_master_id: number;
  motivation_name: string;
};

type PreferenceLink = {
  id: number;
  user_id: number;
  work_item_id: number;
  preference_master_id: number;
  preference_name: string;
};

type StatusMessage = {
  type: 'success' | 'error' | 'info';
  message: string;
} | null;

const Step3: React.FC<Step3Props> = ({ onBack, onProceed }) => {
  const [userId, setUserId] = useState<number | null>(null);
  const [workItems, setWorkItems] = useState<WorkItemRecord[]>([]);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<number | null>(null);
  const [motivations, setMotivations] = useState<MasterRecord[]>([]);
  const [preferences, setPreferences] = useState<MasterRecord[]>([]);
  const [motivationLinks, setMotivationLinks] = useState<Map<number, number>>(new Map());
  const [preferenceLinks, setPreferenceLinks] = useState<Map<number, number>>(new Map());
  const [newMotivationName, setNewMotivationName] = useState('');
  const [newPreferenceName, setNewPreferenceName] = useState('');
  const [status, setStatus] = useState<StatusMessage>(null);
  const [loading, setLoading] = useState(false);
  const [linkLoading, setLinkLoading] = useState(false);
  const [sketchUrl, setSketchUrl] = useState<string | null>(null);

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
      setSelectedWorkItemId(Number(rawWorkItemId));
    }
  }, []);

  useEffect(() => {
    if (status && isBrowser) {
      const timer = window.setTimeout(() => {
        setStatus(null);
      }, 4000);
      return () => window.clearTimeout(timer);
    }

    return undefined;
  }, [status]);

  useEffect(() => {
    if (userId === null) return;

    const controller = new AbortController();
    setLoading(true);

    const loadInitialData = async () => {
      try {
        const [motivationData, preferenceData, workItemData] = await Promise.all([
          requestJson<MasterRecord[]>(`/api/v1/motivation_masters?user_id=${userId}`, { signal: controller.signal }),
          requestJson<MasterRecord[]>(`/api/v1/preference_masters?user_id=${userId}`, { signal: controller.signal }),
          requestJson<WorkItemRecord[]>(`/api/v1/work_items?user_id=${userId}`, { signal: controller.signal }),
        ]);

        if (controller.signal.aborted) return;

        setMotivations(motivationData);
        setPreferences(preferenceData);
        setWorkItems(workItemData);

        if (selectedWorkItemId !== null) {
          const exists = workItemData.some((item) => item.id === selectedWorkItemId);
          if (!exists) {
            setSelectedWorkItemId(workItemData[0]?.id ?? null);
          }
        } else {
          setSelectedWorkItemId(workItemData[0]?.id ?? null);
        }
      } catch (error) {
        if (!controller.signal.aborted && error instanceof Error) {
          setStatus({ type: 'error', message: error.message });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      controller.abort();
    };
  }, [userId]);

  useEffect(() => {
    if (selectedWorkItemId === null) {
      setMotivationLinks(new Map());
      setPreferenceLinks(new Map());
      setSketchUrl(null);
      return;
    }

    const currentWorkItem = workItems.find((item) => item.id === selectedWorkItemId);
    setSketchUrl(extractSketchUrl(currentWorkItem));

    if (userId === null) return;

    const controller = new AbortController();
    setLinkLoading(true);

    const loadLinks = async () => {
      try {
        const [motivationData, preferenceData] = await Promise.all([
          requestJson<MotivationLink[]>(
            `/api/v1/work_item_motivations?user_id=${userId}&work_item_id=${selectedWorkItemId}`,
            { signal: controller.signal },
          ),
          requestJson<PreferenceLink[]>(
            `/api/v1/work_item_preferences?user_id=${userId}&work_item_id=${selectedWorkItemId}`,
            { signal: controller.signal },
          ),
        ]);

        if (controller.signal.aborted) return;

        setMotivationLinks(new Map(motivationData.map((link) => [link.motivation_master_id, link.id])));
        setPreferenceLinks(new Map(preferenceData.map((link) => [link.preference_master_id, link.id])));
      } catch (error) {
        if (!controller.signal.aborted && error instanceof Error) {
          setStatus({ type: 'error', message: error.message });
        }
      } finally {
        if (!controller.signal.aborted) {
          setLinkLoading(false);
        }
      }
    };

    loadLinks();

    return () => {
      controller.abort();
    };
  }, [selectedWorkItemId, userId, workItems]);

  const selectionSummary = useMemo(() => {
    const motivationCount = motivationLinks.size;
    const preferenceCount = preferenceLinks.size;
    if (motivationCount === 0 && preferenceCount === 0) {
      return 'まだ選択されていません。候補をクリックして追加しましょう。';
    }
    return `動機 ${motivationCount} 件 / 嗜好 ${preferenceCount} 件 選択中`;
  }, [motivationLinks, preferenceLinks]);

  const updateQueryParam = useCallback((workItemId: number | null) => {
    if (!isBrowser) return;
    const params = new URLSearchParams(window.location.search);
    if (workItemId) {
      params.set('work_item_id', String(workItemId));
    } else {
      params.delete('work_item_id');
    }

    const paramsString = params.toString();
    const newUrl = paramsString.length > 0
      ? `${window.location.pathname}?${paramsString}`
      : window.location.pathname;

    window.history.replaceState(null, '', newUrl);
  }, []);

  const handleWorkItemChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value;
    const nextId = value ? Number(value) : null;
    setSelectedWorkItemId(nextId);
  };

  useEffect(() => {
    updateQueryParam(selectedWorkItemId);
  }, [selectedWorkItemId, updateQueryParam]);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (isBrowser) {
      window.history.back();
    }
  };

  const handleProceed = () => {
    if (onProceed) {
      onProceed();
      return;
    }

    if (!isBrowser || userId === null || selectedWorkItemId === null) {
      setStatus({ type: 'error', message: '次のステップへ進むにはユーザーとワークアイテムを選択してください。' });
      return;
    }

    const params = new URLSearchParams();
    params.set('user_id', String(userId));
    params.set('work_item_id', String(selectedWorkItemId));

    const currentPath = window.location.pathname;
    const nextPath = currentPath.includes('step3')
      ? currentPath.replace('step3', 'step4')
      : '/step4';

    window.location.href = `${nextPath}?${params.toString()}`;
  };

  const handleToggleSelection = async (type: 'motivation' | 'preference', masterId: number) => {
    if (userId === null || selectedWorkItemId === null) {
      setStatus({ type: 'error', message: '先にワークアイテムを選択してください。' });
      return;
    }

    const linkMap = type === 'motivation' ? motivationLinks : preferenceLinks;
    const setter = type === 'motivation' ? setMotivationLinks : setPreferenceLinks;
    const existingId = linkMap.get(masterId);

    try {
      if (existingId) {
        await requestJson<null>(
          `/api/v1/work_item_${type === 'motivation' ? 'motivations' : 'preferences'}/${existingId}?user_id=${userId}`,
          { method: 'DELETE' },
        );
        setter((prev) => {
          const next = new Map(prev);
          next.delete(masterId);
          return next;
        });
        setStatus({ type: 'success', message: '選択を解除しました。' });
      } else if (type === 'motivation') {
        const result = await requestJson<MotivationLink>(
          '/api/v1/work_item_motivations',
          {
            method: 'POST',
            body: {
              work_item_motivation: {
                user_id: userId,
                work_item_id: selectedWorkItemId,
                motivation_master_id: masterId,
              },
            },
          },
        );
        setter((prev) => new Map(prev).set(masterId, result.id));
        setStatus({ type: 'success', message: '動機を選択しました。' });
      } else {
        const result = await requestJson<PreferenceLink>(
          '/api/v1/work_item_preferences',
          {
            method: 'POST',
            body: {
              work_item_preference: {
                user_id: userId,
                work_item_id: selectedWorkItemId,
                preference_master_id: masterId,
              },
            },
          },
        );
        setter((prev) => new Map(prev).set(masterId, result.id));
        setStatus({ type: 'success', message: '嗜好を選択しました。' });
      }
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const handleAddMaster = async (type: 'motivation' | 'preference') => {
    if (userId === null) {
      setStatus({ type: 'error', message: 'ユーザーIDが取得できませんでした。' });
      return;
    }

    const name = (type === 'motivation' ? newMotivationName : newPreferenceName).trim();

    if (!name) {
      setStatus({ type: 'error', message: '名称を入力してください。' });
      return;
    }

    if (name.length > 60) {
      setStatus({ type: 'error', message: '名称は60文字以内で入力してください。' });
      return;
    }

    try {
      if (type === 'motivation') {
        const record = await requestJson<MasterRecord>(
          '/api/v1/motivation_masters',
          {
            method: 'POST',
            body: { motivation_master: { user_id: userId, name } },
          },
        );
        setMotivations((prev) => [...prev, record]);
        setNewMotivationName('');
        setStatus({ type: 'success', message: '動機を追加しました。' });
      } else {
        const record = await requestJson<MasterRecord>(
          '/api/v1/preference_masters',
          {
            method: 'POST',
            body: { preference_master: { user_id: userId, name } },
          },
        );
        setPreferences((prev) => [...prev, record]);
        setNewPreferenceName('');
        setStatus({ type: 'success', message: '嗜好を追加しました。' });
      }
    } catch (error) {
      if (error instanceof Error) {
        setStatus({ type: 'error', message: error.message });
      }
    }
  };

  const renderOptionButton = (type: 'motivation' | 'preference', master: MasterRecord) => {
    const selected = type === 'motivation'
      ? motivationLinks.has(master.id)
      : preferenceLinks.has(master.id);

    const disabled = selectedWorkItemId === null;

    return (
      <button
        key={`${type}-${master.id}`}
        type="button"
        className="selection-option"
        data-selected={selected}
        disabled={disabled}
        aria-pressed={selected}
        onClick={() => handleToggleSelection(type, master.id)}
      >
        <span className="selection-option__label">{master.name}</span>
      </button>
    );
  };

  const motivationList = useMemo(
    () => [...motivations].sort((a, b) => a.id - b.id),
    [motivations],
  );
  const preferenceList = useMemo(
    () => [...preferences].sort((a, b) => a.id - b.id),
    [preferences],
  );

  return (
    <div className="step-page step3">
      <header className="step-header">
        <div className="step-header__info">
          <span className="step-header__badge">STEP 3</span>
          <h1 className="step-header__title">動機・嗜好のピックアップ</h1>
        </div>
        <p className="step-header__hint">
          ステップ1で作成したビフォースケッチを確認しながら、対象ワークアイテムに紐づけたい動機と嗜好を選択します。
        </p>
      </header>

      {status && (
        <div className={`step-status step-status--${status.type}`} role="status">
          {status.message}
        </div>
      )}

      <main className="step-layout">
        <section className="step-layout__left">
          <div className="sketch-preview" aria-live="polite">
            {sketchUrl ? (
              <img src={sketchUrl} alt="ビフォースケッチのプレビュー" />
            ) : (
              <p className="sketch-preview__placeholder">
                ビフォースケッチがまだ登録されていないか、表示できません。
              </p>
            )}
          </div>
        </section>

        <section className="step-layout__right">
          <div className="selection-panel">
            <div className="selection-panel__header">
              <h2>対象ワークアイテム</h2>
            </div>
            {loading ? (
              <p className="panel-message">読込中です…</p>
            ) : workItems.length === 0 ? (
              <p className="panel-message">ワークアイテムがありません。先にステップ2まで登録してください。</p>
            ) : (
              <select
                className="work-item-select"
                value={selectedWorkItemId ?? ''}
                onChange={handleWorkItemChange}
              >
                {workItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            )}
            <p className="selection-panel__summary" aria-live="polite">
              {linkLoading ? '紐づきを取得しています…' : selectionSummary}
            </p>
          </div>

          <div className="selection-panel" aria-labelledby="motivationHeading">
            <div className="selection-panel__header">
              <h2 id="motivationHeading">動機</h2>
              <span className="selection-panel__counter">{motivationLinks.size}件選択中</span>
            </div>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddMaster('motivation');
              }}
            >
              <input
                className="inline-form__input"
                type="text"
                maxLength={60}
                placeholder="動機を入力して追加"
                value={newMotivationName}
                onChange={(event) => setNewMotivationName(event.target.value)}
              />
              <button type="submit" className="inline-form__button">
                追加
              </button>
            </form>
            {motivationList.length === 0 ? (
              <p className="panel-message">動機のマスタがまだありません。入力して追加してください。</p>
            ) : (
              <div className="selection-panel__grid" role="group" aria-label="動機の候補">
                {motivationList.map((master) => renderOptionButton('motivation', master))}
              </div>
            )}
          </div>

          <div className="selection-panel" aria-labelledby="preferenceHeading">
            <div className="selection-panel__header">
              <h2 id="preferenceHeading">嗜好</h2>
              <span className="selection-panel__counter">{preferenceLinks.size}件選択中</span>
            </div>
            <form
              className="inline-form"
              onSubmit={(event) => {
                event.preventDefault();
                handleAddMaster('preference');
              }}
            >
              <input
                className="inline-form__input"
                type="text"
                maxLength={60}
                placeholder="嗜好を入力して追加"
                value={newPreferenceName}
                onChange={(event) => setNewPreferenceName(event.target.value)}
              />
              <button type="submit" className="inline-form__button">
                追加
              </button>
            </form>
            {preferenceList.length === 0 ? (
              <p className="panel-message">嗜好のマスタがまだありません。入力して追加してください。</p>
            ) : (
              <div className="selection-panel__grid" role="group" aria-label="嗜好の候補">
                {preferenceList.map((master) => renderOptionButton('preference', master))}
              </div>
            )}
          </div>

          <div className="step-actions">
            <button type="button" className="step-action-btn" onClick={handleBack}>
              戻る
            </button>
            <button
              type="button"
              className="step-action-btn step-action-btn--primary"
              disabled={selectedWorkItemId === null}
              onClick={handleProceed}
            >
              ステップ4へ進む
            </button>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Step3;
