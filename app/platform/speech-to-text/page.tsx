import { SpeechToTextDemo } from "@/components/speech-to-text-demo";
import { CapabilityNotice } from "@/components/capability-notice";

export default function Page() {
  return <CapabilityNotice capability="stt"><SpeechToTextDemo /></CapabilityNotice>;
}
