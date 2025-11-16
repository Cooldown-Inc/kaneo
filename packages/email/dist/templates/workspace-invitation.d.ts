import React from "react";
export interface WorkspaceInvitationEmailProps {
    workspaceName: string;
    inviterName: string;
    inviterEmail: string;
    invitationLink: string;
    to: string;
}
declare const WorkspaceInvitationEmail: {
    ({ workspaceName, inviterName, inviterEmail, invitationLink, to, }: WorkspaceInvitationEmailProps): React.JSX.Element;
    PreviewProps: WorkspaceInvitationEmailProps;
};
export default WorkspaceInvitationEmail;
//# sourceMappingURL=workspace-invitation.d.ts.map