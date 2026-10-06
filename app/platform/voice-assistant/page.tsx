import { VoiceChat } from "@/components/voice-chat";
import { CapabilityNotice } from "@/components/capability-notice";

export default function Page() {
  return <CapabilityNotice capability="llm"><VoiceChat /></CapabilityNotice>;
}
