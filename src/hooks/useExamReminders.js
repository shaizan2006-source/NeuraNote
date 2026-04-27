import { useEffect, useRef } from "react";

export function useExamReminders(exams = []) {
  const reminderTimestampsRef = useRef({});

  useEffect(() => {
    if (!("Notification" in window)) {
      console.warn("This browser does not support notifications");
      return;
    }

    // Request permission once on mount
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }

    const checkReminders = () => {
      const now = new Date();

      exams.forEach((exam) => {
        if (exam.status !== "active") return;

        const examDate = new Date(exam.exam_date + "T00:00:00");
        const daysLeft = Math.ceil((examDate - now) / (1000 * 60 * 60 * 24));

        // Determine reminder frequency based on days left
        let reminderIntervalMs = null;
        let reminderLabel = null;

        if (daysLeft > 7) {
          // Send reminder once every 7 days
          reminderIntervalMs = 7 * 24 * 60 * 60 * 1000;
          reminderLabel = "7day";
        } else if (daysLeft >= 0) {
          // Send reminder every 2 days
          reminderIntervalMs = 2 * 24 * 60 * 60 * 1000;
          reminderLabel = "2day";
        } else {
          // Exam has passed, skip
          return;
        }

        const reminderId = `exam_${exam.id}_${reminderLabel}`;
        const lastSent = localStorage.getItem(reminderId);
        const lastSentTime = lastSent ? parseInt(lastSent, 10) : 0;
        const timeSinceLastReminder = now.getTime() - lastSentTime;

        // Send notification if enough time has passed
        if (timeSinceLastReminder >= reminderIntervalMs) {
          if (Notification.permission === "granted") {
            new Notification(`📚 ${exam.name}`, {
              body: `${daysLeft} days left until your exam. Start preparing!`,
              icon: "/exam-icon.png",
              badge: "/exam-badge.png",
              tag: reminderId,
              requireInteraction: false,
            });
          }

          // Update last sent timestamp in localStorage
          localStorage.setItem(reminderId, now.getTime().toString());
        }
      });
    };

    // Check reminders every 60 seconds
    const intervalId = setInterval(checkReminders, 60 * 1000);

    // Run check immediately on mount
    checkReminders();

    return () => clearInterval(intervalId);
  }, []);
}
