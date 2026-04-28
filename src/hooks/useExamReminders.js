import { useEffect } from "react";

// Safe localStorage helpers — can throw in private browsing / restricted environments
function lsGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function lsSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* silently skip */ }
}

export function useExamReminders(exams = []) {
  useEffect(() => {
    // Guard: Notification API not available (some browsers / SSR)
    if (typeof window === "undefined" || !("Notification" in window)) return;

    // Request permission once — don't block on the result
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    function sendNotification(exam, daysLeft, reminderId) {
      if (Notification.permission !== "granted") return;

      const name = exam.name || "Upcoming exam";
      const body = daysLeft === 0
        ? `${name} is TODAY. Good luck!`
        : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left until ${name}. Start preparing!`;

      try {
        new Notification(`📚 ${name}`, {
          body,
          tag: reminderId,       // deduplicates if browser already shows it
          requireInteraction: false,
        });
      } catch (err) {
        // Notification constructor can throw if permission revoked mid-session
        console.warn("[useExamReminders] Notification failed:", err?.message);
      }
    }

    const checkReminders = () => {
      const now = new Date();
      const safeExams = Array.isArray(exams) ? exams : [];

      safeExams.forEach((exam) => {
        // Guard: must have id, exam_date, and be active
        if (!exam?.id || !exam?.exam_date || exam?.status !== "active") return;

        const examDate = new Date(exam.exam_date + "T00:00:00");
        if (isNaN(examDate.getTime())) return; // invalid date — skip

        const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

        let reminderIntervalMs;
        let reminderLabel;

        if (daysLeft > 7) {
          reminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
          reminderLabel = "7day";
        } else if (daysLeft >= 0) {
          reminderIntervalMs = 2 * 24 * 60 * 60 * 1000;
          reminderLabel = "2day";
        } else {
          return; // exam passed
        }

        const reminderId = `exam_${exam.id}_${reminderLabel}`;
        const lastSentRaw = lsGet(reminderId);
        const lastSentTime = lastSentRaw ? parseInt(lastSentRaw, 10) : 0;
        const timeSince = isNaN(lastSentTime) ? Infinity : now.getTime() - lastSentTime;

        if (timeSince >= reminderIntervalMs) {
          sendNotification(exam, daysLeft, reminderId);
          lsSet(reminderId, now.getTime().toString());
        }
      });
    };

    const intervalId = setInterval(checkReminders, 60 * 1000);
    checkReminders(); // run immediately on mount

    return () => clearInterval(intervalId);
  }, []); // empty deps: interval set up once, reads exams via closure
}
