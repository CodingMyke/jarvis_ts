export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  thinking?: string;
}

export interface VoiceChatState {
  isRecording: boolean;
  messages: Message[];
}

export interface VoiceChatActions {
  startRecording: () => void;
  stopRecording: () => void;
}

export type VoiceChatHook = VoiceChatState & VoiceChatActions;
