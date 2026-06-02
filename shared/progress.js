(async function () {

  const clientSlug = document.body.getAttribute('data-client-slug');
  const isReadonly = document.body.getAttribute('data-readonly') === 'true';

  // ------------------------------------------------------------------
  // 1. Read-only mode — disable all inputs and stop
  //    (coaches and admins view only, no progress loading in Phase 1)
  // ------------------------------------------------------------------
  if (isReadonly) {
    document.querySelectorAll('input[type="checkbox"]').forEach(el => {
      el.disabled = true;
    });
    document.querySelectorAll('textarea, input[type="text"]').forEach(el => {
      el.disabled = true;
    });
    return;
  }

  // ------------------------------------------------------------------
  // 2. Get the current user's id from the active session
  // ------------------------------------------------------------------
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (!session) return;

  const userId = session.user.id;

  // ------------------------------------------------------------------
  // 3. Retry any pending offline saves from a previous failed attempt
  // ------------------------------------------------------------------
  await flushPendingQueue();

  // ------------------------------------------------------------------
  // 4. Load saved progress from Supabase and apply to checkboxes
  // ------------------------------------------------------------------
  const { data: progressRows } = await supabaseClient
    .from('progress')
    .select('item_key, checked')
    .eq('user_id', userId)
    .eq('client_slug', clientSlug);

  if (progressRows) {
    progressRows.forEach(({ item_key, checked }) => {
      const checkbox = document.querySelector(`input[type="checkbox"][data-key="${item_key}"]`);
      if (checkbox) checkbox.checked = checked;
    });
  }

  // ------------------------------------------------------------------
  // 5. Attach change listeners to all checkboxes
  // ------------------------------------------------------------------
  document.querySelectorAll('input[type="checkbox"][data-key]').forEach(checkbox => {
    checkbox.addEventListener('change', () => handleCheckboxChange(checkbox));
  });


  // ------------------------------------------------------------------
  // Handle a checkbox change — upsert to Supabase, queue on failure
  // ------------------------------------------------------------------
  async function handleCheckboxChange(checkbox) {
    const itemKey = checkbox.getAttribute('data-key');
    const checked = checkbox.checked;

    // Walk up the DOM to find the section with a data-week attribute
    const section = checkbox.closest('[data-week]');
    const week    = section ? parseInt(section.getAttribute('data-week'), 10) : null;

    const record = {
      user_id:     userId,
      client_slug: clientSlug,
      week:        week,
      item_key:    itemKey,
      checked:     checked
    };

    const { error } = await supabaseClient
      .from('progress')
      .upsert(record, { onConflict: 'user_id,client_slug,item_key' });

    if (error) {
      // Save failed (likely offline) — queue for retry
      queuePendingChange(record);
    }
  }


  // ------------------------------------------------------------------
  // Offline queue — stored in sessionStorage as a JSON array
  // ------------------------------------------------------------------

  const QUEUE_KEY = `progress_queue_${clientSlug}`;

  function queuePendingChange(record) {
    const queue = getPendingQueue();
    // Replace any existing queued entry for the same item_key
    const filtered = queue.filter(r => r.item_key !== record.item_key);
    filtered.push(record);
    sessionStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
  }

  function getPendingQueue() {
    try {
      return JSON.parse(sessionStorage.getItem(QUEUE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  async function flushPendingQueue() {
    const queue = getPendingQueue();
    if (queue.length === 0) return;

    const stillFailing = [];

    for (const record of queue) {
      const { error } = await supabaseClient
        .from('progress')
        .upsert(record, { onConflict: 'user_id,client_slug,item_key' });

      if (error) {
        stillFailing.push(record);
      }
    }

    // Keep only the ones that still failed
    if (stillFailing.length > 0) {
      sessionStorage.setItem(QUEUE_KEY, JSON.stringify(stillFailing));
    } else {
      sessionStorage.removeItem(QUEUE_KEY);
    }
  }

})();
