import { useEffect, useRef, useState } from "react";
import MilestoneToast from "../../Notifications_Front/src/MilestoneToast";

const API_BASE = import.meta.env.VITE_API_URL || "";
const POLL_MS = 5000;

export default function GlobalMilestoneNotifications({ userId }) {
  const [latest, setLatest] = useState(null);
  const seen = useRef(new Set());

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    let busy = false;
    let stopPolling = () => {};
    const startedAt = Date.now();

    seen.current.clear();
    setLatest(null);

    const headers = {
      Authorization: `Bearer ${localStorage.getItem("token")}`
    };

    async function monitorMilestones() {
      try {
        // Fetch group memberships once.
        const response = await fetch(`${API_BASE}/api/groups/user/${userId}`, { headers });
        if (!response.ok) throw new Error(`Groups request failed: ${response.status}`);

        const memberships = await response.json();
        if (!Array.isArray(memberships) || cancelled) return;

        const groupIds = [...new Set(
          memberships.map(m => m.group?.groupId).filter(Number.isInteger)
        )];

        async function checkFeeds() {
          if (busy || cancelled) return;
          busy = true;

          try {
            const results = await Promise.allSettled(groupIds.map(async id => {
              const res = await fetch(`${API_BASE}/api/groups/${id}/feed`, { headers });
              if (!res.ok) throw new Error(`Feed ${id}: ${res.status}`);
              return res.json();
            }));

            if (cancelled) return;

            const milestones = results
              .filter(result => result.status === "fulfilled")
              .flatMap(result => Array.isArray(result.value) ? result.value : [])
              .filter(entry => entry.type === "milestone")
              .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

            for (const entry of milestones) {
              const timestamp = new Date(entry.timestamp).getTime();
              if (!Number.isFinite(timestamp)) continue;

              const key = `${entry.userId}|${entry.message}|${timestamp}`;
              if (seen.current.has(key)) continue;

              seen.current.add(key);
              if (timestamp >= startedAt) setLatest({ key, entry });
            }
          } catch (error) {
            console.error("Milestone check failed:", error);
          } finally {
            busy = false;
          }
        }

        await checkFeeds();

        if (!cancelled) {
          const interval = setInterval(checkFeeds, POLL_MS);
          stopPolling = () => clearInterval(interval);
        }
      } catch (error) {
        if (!cancelled) console.error("Milestone monitoring failed:", error);
      }
    }

    monitorMilestones();

    return () => {
      cancelled = true;
      stopPolling();
    };
  }, [userId]);

  return latest ? <MilestoneToast key={latest.key} entries={[latest.entry]} /> : null;
}
