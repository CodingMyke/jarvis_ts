export interface Message {
  id: string;
  text: string;
  isUser: boolean;
  thinking?: string;
}
