/*HT_Client_Front*/
import { useEffect, useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const emptyHabit = {
  title: '',
  description: '',
  targetVal: '',
  targetUnit: 'minutes',
  freq: 'DAILY',
};

/** Returns today's local date in the format required by a date input. */
function todayAsInputValue() {
  const today = new Date();
  today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  return today.toISOString().slice(0, 10);
}

/** Renders the habit dashboard and manages its forms and API requests. */
export default function App({ currentUserId, onHabitLogged, navigationOptions, onClearNavigationOptions }) {
  const [userId, setUserId] = useState('');
  const [habits, setHabits] = useState([]);
  const [habitView, setHabitView] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [form, setForm] = useState(emptyHabit);
  const [isSaving, setIsSaving] = useState(false);
  const [sharingMode, setSharingMode] = useState('PRIVATE');
  const [sharedGroupIds, setSharedGroupIds] = useState([]);
  const [sharingGroups, setSharingGroups] = useState([]);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingReady, setSharingReady] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState(null);
  const [logForm, setLogForm] = useState({ date: todayAsInputValue(), value: '', note: '' });
  const [isLogging, setIsLogging] = useState(false);
  const [incrementingHabit, setIncrementingHabit] = useState(null);
  const [incrementForm, setIncrementForm] = useState({ value: '' });
  const [isIncrementing, setIsIncrementing] = useState(false);

  useEffect(() => {
    if (!navigationOptions) return;
    if (navigationOptions.action === 'create') {
      openCreateModal();
    } else if (navigationOptions.filter === 'snoozed') {
      setHabitView('snoozed');
    } else if (navigationOptions.filter === 'rest') {
      setHabitView('rest');
    } else if (navigationOptions.filter === 'active') {
      setHabitView('active');
    }
    onClearNavigationOptions?.();
  }, [navigationOptions]);

  useEffect(() => {
  async function loadHabits() {
    if (!currentUserId) {
      setUserId('');
      setHabits([]);
      setLoading(false);
      return;
    }

    setUserId(String(currentUserId));
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API_URL}/users/${currentUserId}/habits?archived=false`
      );

      if (!response.ok) {
        throw new Error('Could not load habits.');
      }

      setHabits(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  loadHabits();
}, [currentUserId]);

/** Logs a Rest Day for the selected habit. */
async function logRestDay(habit) {
  setError('');
  try {
    const response = await fetch(`${API_URL}/habits/${habit.habitId}/rest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString() }),
    });

    if (!response.ok) {
      const errorData = await response.json();
    throw new Error(errorData.error||'Could not log rest day.');
    }
    await loadHabits();
    onHabitLogged?.();
  } catch (requestError) {
    setError(requestError.message);
  }
}

/** Logs a Snooze Day for the selected habit. */
async function logSnoozeDay(habit) {
  setError('');
  try {
    const response = await fetch(`${API_URL}/habits/${habit.habitId}/snooze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date().toISOString() }),
    });

    if (!response.ok){
    const errorData = await response.json();
      throw new Error(errorData.error || 'Could not log snooze day.');
    }
    await loadHabits();
    onHabitLogged?.();
  } catch (requestError) {
    setError(requestError.message);
  }
}

  /** Loads habits for the supplied active or archived view. */
  async function loadHabits(view = habitView) {
    setLoading(true);
    setError('');

    try {
      const archived = view === 'archived';
      const response = await fetch(`${API_URL}/users/${userId}/habits?archived=${archived}`);
      if (!response.ok) throw new Error('Could not load habits. Is the backend running?');

      setHabits(await response.json());
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }

  /** Switches the displayed habit status and reloads the list. */
  async function changeHabitView(view) {
    if (view === habitView) return;
    const wasArchived = habitView === 'archived';
    const isNowArchived = view === 'archived';
    setHabitView(view);
    if (isNowArchived || wasArchived) {
      await loadHabits(view === 'archived' ? 'archived' : 'active');
    }
  }

  // Load group memberships and, when editing, the saved sharing preferences.
  useEffect(() => {
    if (!isFormOpen || !currentUserId) return;
    let cancelled = false;
    setSharingLoading(true);
    setSharingReady(false);
    setError('');

    async function loadSharing() {
      try {
        const groupResponse = await fetch(`${API_URL}/groups/user/${currentUserId}`, {
          headers: authHeaders(),
        });
        if (!groupResponse.ok) throw new Error('Could not load your groups.');
        const memberships = await groupResponse.json();
        const groups = memberships.filter(m => m.group).map(m => ({
          groupId: m.group.groupId,
          name: m.group.name,
        }));

        let preferences = { sharingMode: 'PRIVATE', sharedGroupIds: [] };
        if (editingHabit) {
          const response = await fetch(`${API_URL}/habits/${editingHabit.habitId}/sharing`, {
            headers: authHeaders(),
          });
          if (!response.ok) throw new Error('Could not load habit sharing settings.');
          preferences = await response.json();
        }
        if (!cancelled) {
          setSharingGroups(groups);
          setSharingMode(preferences.sharingMode);
          setSharedGroupIds(preferences.sharedGroupIds || []);
          setSharingReady(true);
        }
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setSharingLoading(false);
      }
    }
    loadSharing();
    return () => { cancelled = true; };
  }, [isFormOpen, editingHabit?.habitId, currentUserId]);

  /** Opens an empty form for creating a habit. */
  function openCreateModal() {
    setForm(emptyHabit);
    setSharingMode('PRIVATE');
    setSharedGroupIds([]);
    setEditingHabit(null);
    setError('');
    setIsFormOpen(true);
  }

  /** Opens the edit form with the selected habit's current values. */
  function openEditModal(habit) {
    setForm({
      title: habit.title,
      description: habit.description ?? '',
      targetVal: habit.targetValue.toString(),
      targetUnit: habit.targetUnit,
      freq: habit.frequency,
    });
    setEditingHabit(habit);
    setError('');
    setIsFormOpen(true);
  }

  /** Closes the create or edit form unless it is currently saving. */
  function closeFormModal() {
    if (isSaving) return;
    setIsFormOpen(false);
    setEditingHabit(null);
  }

  /** Updates one field in the create or edit habit form. */
  function updateForm(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  /** Creates a new habit or saves changes to the selected habit. */
  async function saveHabit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError('');

    try {
      const isEditing = editingHabit !== null;
      const response = await fetch(
        isEditing ? `${API_URL}/habits/${editingHabit.habitId}` : `${API_URL}/habits`,
        {
        method: isEditing ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? {
              title: form.title.trim(),
              description: form.description.trim() || null,
              targetValue: Number(form.targetVal),
              targetUnit: form.targetUnit.trim(),
              frequency: form.freq,
            }
            : {
              userId: Number(userId),
              title: form.title.trim(),
              description: form.description.trim() || null,
              targetVal: Number(form.targetVal),
              targetUnit: form.targetUnit.trim(),
              freq: form.freq,
              status: 'ACTIVE',
            },
        ),
      });

      if (!response.ok) throw new Error(`Could not ${isEditing ? 'update' : 'create'} the habit.`);

      const saved = isEditing ? null : await response.json();
      const habitId = isEditing ? editingHabit.habitId : saved.habit?.habitId;
      if (!habitId) throw new Error('Habit saved, but the new habit ID was not returned.');

      const sharingResponse = await fetch(`${API_URL}/habits/${habitId}/sharing`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sharingMode,
          sharedGroupIds: sharingMode === 'SELECTED' ? sharedGroupIds : [],
        }),
      });
      if (!sharingResponse.ok) {
        // Keep the dialog open so the user knows the sharing setting was not saved.
        // New habits are private by database default until sharing succeeds.
        if (!isEditing) setEditingHabit({ habitId });
        throw new Error('Habit saved, but sharing preferences were not saved. Please retry.');
      }

      setIsFormOpen(false);
      setEditingHabit(null);
      await loadHabits();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }


  function openIncrementModal(habit){
    setIncrementingHabit(habit);
    setIncrementForm({value:''});
    setError('');
  }

  function closeIncrementModal(){
    if(isIncrementing) return;
    setIncrementingHabit(null);
  }
  async function submitIncrement(event) {
    event.preventDefault();
    setIsIncrementing(true);
    setError('');
    try{
      const response = await fetch(`${API_URL}/habits/${incrementingHabit.habitId}/increment`,{
      method:'POST',
      headers: {'Content-Type':'application/json' },
      body: JSON.stringify({ incrementBy: Number(incrementForm.value) }),
      });
      if(!response.ok)throw new Error('Could not log increment.');
      const data = await response.json();
      closeIncrementModal();
      await loadHabits();
      onHabitLogged?.();
      //Check if target is met; open completion modal if true
      if(data.currValue>=data.targetValue){
        openLogModal({ ...incrementingHabit,currValue: data.currValue});
      }
    }catch(requestError){
      setError(requestError.message);
    }finally{
      setIsIncrementing(false);
    }
  }
  /** Opens the completion form for a habit with its target as the default value. */
  function openLogModal(habit) {
    setLoggingHabit(habit);
    const requiredTarget = habit.StatusOfHabit === 'SNOOZED'
      ? Math.max(1, Math.ceil(habit.targetValue / 2))
      : habit.targetValue;

    const finalValue = (habit.currValue && habit.currValue > requiredTarget)
      ? habit.currValue
      : requiredTarget;
    setLogForm({ date: todayAsInputValue(), value: finalValue.toString(), note: '' });
    setError('');
  }

  /** Closes the completion form unless a completion request is in progress. */
  function closeLogModal() {
    if (isLogging) return;
    setLoggingHabit(null);
  }

  /** Updates one field in the completion form. */
  function updateLogForm(event) {
    const { name, value } = event.target;
    setLogForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  /** Sends a completion log for the selected habit. */
  async function logCompletion(event) {
    event.preventDefault();
    setIsLogging(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/habits/${loggingHabit.habitId}/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: `${logForm.date}T12:00:00.000Z`,
          value: Number(logForm.value),
          note: logForm.note.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Could not log this completion.');
      }

      setLoggingHabit(null);
      await loadHabits();
      onHabitLogged?.();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsLogging(false);
    }
  }

  /** Archives an active habit after confirmation. */
  async function archiveHabit(habit) {
    const confirmed = window.confirm(`Archive “${habit.title}”? You can view it under Archived.`);
    if (!confirmed) return;

    setError('');
    try {
      const response = await fetch(`${API_URL}/habits/${habit.habitId}/archive`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Could not archive the habit.');

      await loadHabits('active');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  /** Restores an archived habit to the active list. */
  async function unarchiveHabit(habit) {
    setError('');
    try {
      const response = await fetch(`${API_URL}/habits/${habit.habitId}/unarchive`, {
        method: 'PATCH',
      });
      if (!response.ok) throw new Error('Could not restore the habit.');

      await loadHabits('archived');
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  const displayedHabits = habits.filter((habit) => {
    if (habitView === 'snoozed') {
      return habit.StatusOfHabit === 'SNOOZED';
    }
    if (habitView === 'rest') {
      return habit.StatusOfHabit === 'REST_DAY';
    }
    return true;
  });

  return (
    <div className="habit-app-shell">
      <h1 className="page-title">My habits</h1>

      <section className="habit-list-header" aria-label="Habit controls">
        <div className="tabs" role="tablist" aria-label="Habit status">
          <button
            className={`tab ${habitView === 'active' ? 'tab--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={habitView === 'active'}
            onClick={() => changeHabitView('active')}
          >
            Active
          </button>
          <button
            className={`tab ${habitView === 'snoozed' ? 'tab--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={habitView === 'snoozed'}
            onClick={() => changeHabitView('snoozed')}
          >
            Snoozed
          </button>
          <button
            className={`tab ${habitView === 'rest' ? 'tab--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={habitView === 'rest'}
            onClick={() => changeHabitView('rest')}
          >
            Rest Day
          </button>
          <button
            className={`tab ${habitView === 'archived' ? 'tab--active' : ''}`}
            type="button"
            role="tab"
            aria-selected={habitView === 'archived'}
            onClick={() => changeHabitView('archived')}
          >
            Archived
          </button>
        </div>
        <button className="btn btn--primary" type="button" onClick={openCreateModal} disabled={!userId}>
          New habit
        </button>
      </section>

      {error && !isFormOpen && !loggingHabit && <p className="state-message state-message--error">{error}</p>}
      {loading && <p className="state-message">Loading habits…</p>}

      {!loading && !error && !userId && (
        <p className="state-message">Create a user before adding habits.</p>
      )}

      {!loading && !error && userId && displayedHabits.length === 0 && (
        <p className="state-message">
          {habitView === 'snoozed' && 'No snoozed habits today.'}
          {habitView === 'rest' && 'No rest day habits today.'}
          {habitView === 'active' && 'No active habits yet. Create your first one.'}
          {habitView === 'archived' && 'No archived habits.'}
        </p>
      )}

      {!loading && displayedHabits.length > 0 && (
        <div className="habit-list">
          {displayedHabits.map((habit) => {
            const status = habit.StatusOfHabit;
            const isCompleted = status === 'COMPLETED';
            const isSnoozed   = status === 'SNOOZED';
            const isRestDay   = status === 'REST_DAY';
            const effectiveTarget = isSnoozed
              ? Math.max(1, Math.ceil((habit.targetValue || 1) / 2))
              : (habit.targetValue || 1);
            const displayCurrValue = isCompleted
              ? Math.max(habit.currValue || 0, effectiveTarget)
              : (habit.currValue || 0);

            return (
              <article className="group-card habit-card" key={habit.habitId}>
                <div className="group-card-header">
                  <div className="habit-card-title-group">
                    <h3>{habit.title}</h3>
                    <span className="habit-meta-text">
                      {isSnoozed ? (
                        <>Target: {effectiveTarget} {habit.targetUnit} (snoozed from {habit.targetValue}) · {habit.frequency.toLowerCase()}</>
                      ) : (
                        <>{habit.targetValue} {habit.targetUnit} · {habit.frequency.toLowerCase()}</>
                      )}
                    </span>
                    <div className="habit-progress-line">
                      Progress: <strong>{displayCurrValue} / {effectiveTarget} {habit.targetUnit}</strong>
                    </div>
                    {isRestDay && (
                      <div className="habit-rest-hint">
                        Rest Day · No logging needed today
                      </div>
                    )}
                  </div>

                  <div className="habit-card-status">
                    {isCompleted && (
                      <span className="habit-status-badge habit-status-badge--completed">Logged today</span>
                    )}
                    {isSnoozed && (
                      <span className="habit-status-badge habit-status-badge--snoozed">Snoozed</span>
                    )}
                    {isRestDay && (
                      <span className="habit-status-badge habit-status-badge--rest">Rest day</span>
                    )}
                    {!isCompleted && !isSnoozed && !isRestDay && habitView === 'active' && (
                      <span className="habit-status-badge habit-status-badge--active">Active</span>
                    )}
                  </div>
                </div>

                {habit.description && (
                  <p className="group-description">{habit.description}</p>
                )}

                <div className="group-card-meta">
                  <div className="group-code-actions">
                    {habitView === 'active' && (
                      <>
                        <button
                          type="button"
                          className="small-action-button small-action-button--primary"
                          onClick={() => openIncrementModal(habit)}
                          disabled={isCompleted}
                          title={isCompleted ? 'Already logged today' : undefined}
                        >
                          {isCompleted ? 'Done' : '+ Log Increment'}
                        </button>

                        <button
                          type="button"
                          className={`small-action-button ${isRestDay ? 'small-action-button--active' : ''}`}
                          onClick={() => logRestDay(habit)}
                          disabled={isCompleted}
                          title={isCompleted ? 'Already logged today' : isRestDay ? 'Rest day active' : 'Log rest day'}
                        >
                          {isRestDay ? 'Resting' : 'Rest Day'}
                        </button>

                        <button
                          type="button"
                          className={`small-action-button ${isSnoozed ? 'small-action-button--active' : ''}`}
                          onClick={() => logSnoozeDay(habit)}
                          disabled={isCompleted}
                          title={isCompleted ? 'Already logged today' : isSnoozed ? 'Already snoozed' : 'Snooze habit'}
                        >
                          {isSnoozed ? 'Snoozed' : 'Snooze'}
                        </button>

                        <button
                          type="button"
                          className="small-action-button"
                          onClick={() => openEditModal(habit)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="small-action-button small-action-button--danger"
                          onClick={() => archiveHabit(habit)}
                        >
                          Archive
                        </button>
                      </>
                    )}

                    {habitView === 'archived' && (
                      <>
                        <button
                          type="button"
                          className="small-action-button small-action-button--primary"
                          onClick={() => unarchiveHabit(habit)}
                        >
                          Unarchive
                        </button>
                        <button
                          type="button"
                          className="small-action-button"
                          onClick={() => openEditModal(habit)}
                        >
                          Edit
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {isFormOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeFormModal}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="habit-form-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-panel__header">
              <h2 id="habit-form-title">{editingHabit ? 'Edit habit' : 'Create habit'}</h2>
              <button
                className="modal-panel__close"
                type="button"
                aria-label="Close habit form"
                onClick={closeFormModal}
                disabled={isSaving}
              >
                ×
              </button>
            </header>

            <form className="modal-panel__body form" onSubmit={saveHabit}>
              <label className="field">
                Habit name
                <input name="title" value={form.title} onChange={updateForm} required maxLength="100" autoFocus />
              </label>

              <label className="field">
                Description <span>(optional)</span>
                <textarea name="description" value={form.description} onChange={updateForm} rows="3" maxLength="500" />
              </label>

              <div className="field-row">
                <label className="field">
                  Target value
                  <input name="targetVal" type="number" min="1" step="1" value={form.targetVal} onChange={updateForm} required />
                </label>

                <label className="field">
                  Unit
                  <input name="targetUnit" value={form.targetUnit} onChange={updateForm} required maxLength="40" />
                </label>
              </div>

              <label className="field">
                Frequency
                <select name="freq" value={form.freq} onChange={updateForm}>
                  <option value="DAILY">Daily</option>
                  <option value="WEEKLY">Weekly</option>
                  <option value="MONTHLY">Monthly</option>
                </select>
              </label>

              <fieldset className="field" disabled={isSaving || sharingLoading}>
                <legend>Share habit activity with</legend>
                <label><input type="radio" name="sharingMode" value="PRIVATE"
                  checked={sharingMode === 'PRIVATE'} onChange={() => setSharingMode('PRIVATE')} /> None (private)</label>
                <label><input type="radio" name="sharingMode" value="ALL"
                  checked={sharingMode === 'ALL'} onChange={() => setSharingMode('ALL')} /> All my groups</label>
                <label><input type="radio" name="sharingMode" value="SELECTED"
                  checked={sharingMode === 'SELECTED'} onChange={() => setSharingMode('SELECTED')} /> Selected groups</label>
                {sharingMode === 'SELECTED' && (
                  <div>
                    {sharingGroups.length === 0 && <p>You haven't joined any groups yet.</p>}
                    {sharingGroups.map(group => (
                      <label key={group.groupId} style={{ display: 'block' }}>
                        <input type="checkbox" checked={sharedGroupIds.includes(group.groupId)}
                          onChange={event => setSharedGroupIds(ids => event.target.checked
                            ? [...new Set([...ids, group.groupId])]
                            : ids.filter(id => id !== group.groupId))} /> {group.name}
                      </label>
                    ))}
                  </div>
                )}
                {sharingLoading && <p>Loading sharing preferences…</p>}
              </fieldset>

              {error && <p className="form-error">{error}</p>}

              <div className="form-actions">
                <button className="btn btn--ghost" type="button" onClick={closeFormModal} disabled={isSaving}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={isSaving || !sharingReady || (sharingMode === 'SELECTED' && sharedGroupIds.length === 0)}>
                  {isSaving ? 'Saving…' : editingHabit ? 'Save changes' : 'Create habit'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {incrementingHabit && (
    <div className="modal-backdrop" role="presentation" onMouseDown={closeIncrementModal}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="log-increment-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-panel__header">
          <h2 id="log-increment-title">Update {incrementingHabit.title}</h2>
          <button className="modal-panel__close" type="button" onClick={closeIncrementModal} disabled={isIncrementing}>
            ×
          </button>
        </header>

        <form className="modal-panel__body form" onSubmit={submitIncrement}>
          <p className="habit-row__desc">
            Progress: {incrementingHabit.currValue || 0} /{ 
            incrementingHabit.StatusOfHabit === 'SNOOZED'
            ? Math.ceil(incrementingHabit.targetValue / 2) 
            : incrementingHabit.targetValue
            } {incrementingHabit.targetUnit}
          </p>

          <label className="field">
            Increment by ({incrementingHabit.targetUnit})
            <input 
              name="value" 
              type="number" 
              min="1" 
              step="1" 
              value={incrementForm.value} 
              onChange={(e) => setIncrementForm({ value: e.target.value })} 
              required 
              autoFocus 
            />
          </label>

          {error && <p className="form-error">{error}</p>}

          <div className="form-actions">
            <button className="btn btn--ghost" type="button" onClick={closeIncrementModal} disabled={isIncrementing}>
              Cancel
            </button>
            <button className="btn btn--primary" type="submit" disabled={isIncrementing}>
              {isIncrementing ? 'Logging…' : 'Log increment'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )}

      {loggingHabit && (
        <div className="modal-backdrop" role="presentation" onMouseDown={closeLogModal}>
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="log-completion-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="modal-panel__header">
              <h2 id="log-completion-title">Log {loggingHabit.title}</h2>
              <button
                className="modal-panel__close"
                type="button"
                aria-label="Close completion form"
                onClick={closeLogModal}
                disabled={isLogging}
              >
                ×
              </button>
            </header>

            <form className="modal-panel__body form" onSubmit={logCompletion}>
              <p className="habit-row__desc">
                Target: {loggingHabit.StatusOfHabit === 'SNOOZED' ? Math.max(1, Math.ceil(loggingHabit.targetValue / 2)) : loggingHabit.targetValue} {loggingHabit.targetUnit}
                {loggingHabit.StatusOfHabit === 'SNOOZED' && ' (reduced for snooze)'}
              </p>

              <div className="field-row">
                <label className="field">
                  Date
                  <input name="date" type="date" value={logForm.date} onChange={updateLogForm} required />
                </label>

                <label className="field">
                  Completed value ({loggingHabit.targetUnit})
                  <div className="value-with-unit">
                    <input name="value"
                    type="number"
                    value={logForm.value}
                    readOnly />
                    <span>{loggingHabit.targetUnit}</span>
                  </div>
                </label>
              </div>

              <label className="field">
                Note <span>(optional)</span>
                <textarea name="note" value={logForm.note} onChange={updateLogForm} rows="3" maxLength="500" />
              </label>

              {error && <p className="form-error">{error}</p>}

              <div className="form-actions">
                <button className="btn btn--ghost" type="button" onClick={closeLogModal} disabled={isLogging}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={isLogging}>
                  {isLogging ? 'Logging…' : 'Log completion'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}