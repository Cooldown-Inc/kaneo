"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const components_1 = require("@react-email/components");
const react_1 = __importDefault(require("react"));
void react_1.default;
const WorkspaceInvitationEmail = ({ workspaceName, inviterName, inviterEmail, invitationLink, to, }) => (react_1.default.createElement(components_1.Html, null,
    react_1.default.createElement(components_1.Head, null),
    react_1.default.createElement(components_1.Body, { style: main },
        react_1.default.createElement(components_1.Preview, null,
            "You've been invited to join ",
            workspaceName,
            " on Kaneo."),
        react_1.default.createElement(components_1.Container, { style: container },
            react_1.default.createElement(components_1.Heading, { style: heading },
                "\uD83C\uDF89 You're invited to ",
                workspaceName),
            react_1.default.createElement(components_1.Section, { style: body },
                react_1.default.createElement(components_1.Text, { style: paragraph },
                    react_1.default.createElement("strong", null, inviterName),
                    " (",
                    inviterEmail,
                    ") has invited you to join the ",
                    react_1.default.createElement("strong", null, workspaceName),
                    " workspace on Kaneo."),
                react_1.default.createElement(components_1.Text, { style: paragraph },
                    react_1.default.createElement(components_1.Link, { style: link, href: `${invitationLink}?email=${to}` }, "\uD83D\uDC49 Accept invitation \uD83D\uDC48")),
                react_1.default.createElement(components_1.Text, { style: paragraph }, "If you didn't request this, please ignore this email."),
                react_1.default.createElement(components_1.Hr, null),
                react_1.default.createElement(components_1.Text, { style: footerParagraph }, "Kaneo"))))));
WorkspaceInvitationEmail.PreviewProps = {
    workspaceName: "Acme Inc",
    inviterName: "John Doe",
    inviterEmail: "john@acme.com",
    invitationLink: "https://kaneo.app/invite/abc123",
};
exports.default = WorkspaceInvitationEmail;
const main = {
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen-Sans,Ubuntu,Cantarell,"Helvetica Neue",sans-serif',
};
const container = {
    margin: "0 auto",
    padding: "20px 25px 0px",
};
const _header = {
    display: "inline-block",
};
const heading = {
    fontSize: "28px",
    fontWeight: "bold",
};
const body = {
    margin: "24px 0",
};
const paragraph = {
    fontSize: "16px",
    lineHeight: "26px",
};
const link = {
    color: "#5463FF",
};
const footerParagraph = {
    fontSize: "14px",
    lineHeight: "20px",
    color: "#6B7280",
};
