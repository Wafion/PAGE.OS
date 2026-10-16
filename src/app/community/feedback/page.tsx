import type { Metadata } from "next";
import { MessageToDeveloperView } from "@/components/feedback/message-to-developer-view";

export const metadata: Metadata = {
  title: "Message to the Developer",
  description:
    "Share your ideas, feedback, bug reports, feature requests, or just say hello — I read every message.",
};

export default function MessageToDeveloperPage() {
  return <MessageToDeveloperView />;
}
