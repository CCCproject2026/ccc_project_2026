export interface ClerkPublicMetadata {
  role?: string;
}

export interface ClerkWebhookEventBase {
  type: string;
  data: {
    object: Record<string, unknown>;
  };
}

export interface ClerkWebhookEvent extends ClerkWebhookEventBase {
  type: "user.created" | "user.updated" | "invitation.accepted";
}
