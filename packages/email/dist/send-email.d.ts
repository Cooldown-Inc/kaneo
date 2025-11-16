import type { MagicLinkEmailProps } from "./templates/magic-link";
import { type WorkspaceInvitationEmailProps } from "./templates/workspace-invitation";
export declare const sendMagicLinkEmail: (to: string, subject: string, data: MagicLinkEmailProps) => Promise<void>;
export declare const sendWorkspaceInvitationEmail: (to: string, subject: string, data: WorkspaceInvitationEmailProps) => Promise<void>;
//# sourceMappingURL=send-email.d.ts.map