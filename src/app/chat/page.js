import { redirect } from "next/navigation";

// Legacy chat surface — superseded by Sage. The old page had no nav shell
// (no back, no account, no sidebar) and used the deprecated chat_messages
// pipeline. Permanently routed to the current chat experience.
export default function ChatPage() {
  redirect("/sage");
}
