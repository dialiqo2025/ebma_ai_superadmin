import { TextToSpeechDemo } from "@/components/text-to-speech-demo";
import { CapabilityNotice } from "@/components/capability-notice";

export default function Page() {
  return <CapabilityNotice capability="tts"><TextToSpeechDemo /></CapabilityNotice>;
}
