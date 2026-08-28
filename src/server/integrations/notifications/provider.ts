export interface NotificationMessage {
  topic: string;
  title: string;
  message: string;
  clickUrl?: string;
  tags?: string[];
  priority?: number;
}

export interface NotificationProvider {
  send(input: { baseUrl: string; token?: string }, message: NotificationMessage): Promise<void>;
}
