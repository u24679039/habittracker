import { useEffect, useState } from 'react';
import './App.css';

const API_URL = 'http://localhost:3000/api';

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
export default function App() {
  const [userId, setUserId] = useState('');
  const [habits, setHabits] = useState([]);
  const [habitView, setHabitView] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState(null);
  const [form, setForm] = useState(emptyHabit);
  const [isSaving, setIsSaving] = useState(false);
  const [loggingHabit, setLoggingHabit] = useState(null);
  const [logForm, setLogForm] = useState({ date: todayAsInputValue(), value: '', note: '' });
  const [isLogging, setIsLogging] = useState(false);
  const [incrementingHabit, setIncrementingHabit] = useState(null);
  const [incrementForm, setIncrementForm] = useState({ value: '' });
  const [isIncrementing, setIsIncrementing] = useState(false);

  useEffect(() => {
    /** Loads the first available user and that user's active habits. */
    async function loadUsers() {
      try {
        const response = await fetch(`${API_URL}/users`);
        if (!response.ok) throw new Error('Could not load users.');

        const data = await response.json();
        const firstUserId = data[0]?.id;
        if (!firstUserId) {
          setLoading(false);
          return;
        }

        setUserId(firstUserId.toString());
        const habitsResponse = await fetch(`${API_URL}/users/${firstUserId}/habits?archived=false`);
        if (!habitsResponse.ok) throw new Error('Could not load habits. Is the backend running?');

        setHabits(await habitsResponse.json());
        setLoading(false);
      } catch (requestError) {
        setError(requestError.message);
        setLoading(false);
      }
    }

    loadUsers();
  }, []);

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
    setHabitView(view);
    await loadHabits(view);
  }

  /** Opens an empty form for creating a habit. */
  function openCreateModal() {
    setForm(emptyHabit);
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

      closeFormModal();
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
    const requiredTarget = habit.StatusOfHabit === 'REST_DAY'
    ? Math.ceil(habit.targetValue / 2)
    : habit.targetValue;

    const finalValue = (habit.currValue && habit.currValue>habit.targetValue)
    ? habit.currValue
    : habit.targetValue;
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

  return (
    <main className="app-shell">
      <h1 className="app-title">My habits</h1>

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

      {!loading && !error && userId && habits.length === 0 && (
        <p className="state-message">
          No {habitView} habits yet.{habitView === 'active' && ' Create your first one.'}
        </p>
      )}

      {!loading && habits.length > 0 && (
        <div className="habit-list">
          {habits.map((habit) => (
            <article className="habit-row" key={habit.habitId}>
              <div>
                <h2 className="habit-row__title">{habit.title}</h2>
                {habit.description && <p className="habit-row__desc">{habit.description}</p>}
                <p className="habit-row__meta">
                  {habit.targetValue} {habit.targetUnit} · {habit.frequency.toLowerCase()}
                </p>
              </div>
              <div className="habit-row__actions">
  <div className="habit-row__actions-primary">
    {habitView === 'active' && (
    <button className="btn btn--primary" type="button" onClick={() => openIncrementModal(habit)}>
      Log increment
    </button>
  )}
    <button className="btn btn--ghost" type="button" onClick={() => openEditModal(habit)}>
      Edit
    </button>
    {habitView === 'active' && (
      <button className="btn btn--danger" type="button" onClick={() => archiveHabit(habit)}>
        Archive
      </button>
    )}
    {habitView === 'archived' && (
      <button className="btn btn--primary" type="button" onClick={() => unarchiveHabit(habit)}>
        Unarchive
      </button>
    )}
  </div>

  {habitView === 'active' && (
    <div className="habit-row__actions-secondary">
      <button className="btn btn--rest" type="button" onClick={() => logRestDay(habit)}>
    Log Rest Day
  </button>
  <button className="btn btn--snooze" type="button" onClick={() => logSnoozeDay(habit)}>
    Log Snooze Day
      </button>
    </div>
  )}
</div>
            </article>
          ))}
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

              {error && <p className="form-error">{error}</p>}

              <div className="form-actions">
                <button className="btn btn--ghost" type="button" onClick={closeFormModal} disabled={isSaving}>
                  Cancel
                </button>
                <button className="btn btn--primary" type="submit" disabled={isSaving}>
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
            incrementingHabit.StatusOfHabit === 'REST_DAY'
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
                Target: {loggingHabit.targetValue} {loggingHabit.targetUnit}
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
    </main>
  );
}
