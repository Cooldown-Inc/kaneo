"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const components_1 = require("@react-email/components");
const react_1 = __importDefault(require("react"));
void react_1.default;
const MagicLinkEmail = ({ magicLink }) => (react_1.default.createElement(components_1.Html, null,
    react_1.default.createElement(components_1.Head, null),
    react_1.default.createElement(components_1.Body, { style: main },
        react_1.default.createElement(components_1.Preview, null, "Log in with this magic link."),
        react_1.default.createElement(components_1.Container, { style: container },
            react_1.default.createElement(components_1.Heading, { style: heading }, "\uD83E\uDE84 Your magic link for Kaneo"),
            react_1.default.createElement(components_1.Section, { style: body },
                react_1.default.createElement(components_1.Text, { style: paragraph },
                    react_1.default.createElement(components_1.Link, { style: link, href: magicLink }, "\uD83D\uDC49 Click here to sign in \uD83D\uDC48")),
                react_1.default.createElement(components_1.Text, { style: paragraph }, "This link and code will only be valid for the next 5 minutes."),
                react_1.default.createElement(components_1.Text, { style: paragraph }, "If you didn't request this, please ignore this email."),
                react_1.default.createElement(components_1.Hr, null),
                react_1.default.createElement(components_1.Text, { style: footerParagraph }, "Kaneo"))))));
MagicLinkEmail.PreviewProps = {
    magicLink: "https://kaneo.app",
};
exports.default = MagicLinkEmail;
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
