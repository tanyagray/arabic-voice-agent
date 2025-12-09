import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Section,
  Text,
} from '@react-email/components';

interface EmailChangeEmailProps {
  confirmationUrl?: string;
  token?: string;
  email?: string;
  newEmail?: string;
}

export const EmailChangeEmail = ({
  confirmationUrl = '{{ .ConfirmationURL }}',
  token = '{{ .Token }}',
  email = '{{ .Email }}',
  newEmail = '{{ .NewEmail }}',
}: EmailChangeEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoHeading}>Arabic Voice Agent</Heading>
        </Section>
        
        <Heading style={heading}>Confirm Your Email Change</Heading>
        
        <Text style={paragraph}>
          You've requested to change the email address associated with your Arabic Voice Agent account.
        </Text>
        
        <Section style={emailAddresses}>
          <div style={emailBox}>
            <Text style={emailLabel}><strong>Current Email</strong></Text>
            <Text style={emailAddress}>{email}</Text>
          </div>
          <Text style={arrow}>→</Text>
          <div style={emailBox}>
            <Text style={emailLabel}><strong>New Email</strong></Text>
            <Text style={emailAddress}>{newEmail}</Text>
          </div>
        </Section>
        
        <Text style={paragraph}>
          To complete this change, please confirm your new email address by clicking the button below:
        </Text>
        
        <Section style={buttonSection}>
          <Link href={confirmationUrl} style={button}>
            Confirm Email Change
          </Link>
        </Section>
        
        <Section style={tokenSection}>
          <Text style={paragraph}>
            <strong>Or use this confirmation code:</strong>
          </Text>
          <Text style={tokenText}>{token}</Text>
          <Text style={expiryText}>
            This code will expire in 1 hour
          </Text>
        </Section>
        
        <Section style={emailChangeNotice}>
          <Text style={noticeTitle}>
            <strong>Important:</strong>
          </Text>
          <ul style={noticeList}>
            <li style={noticeItem}>Your account data and learning progress will remain unchanged</li>
            <li style={noticeItem}>You'll need to use your new email address for future sign-ins</li>
            <li style={noticeItem}>All future notifications will be sent to your new email</li>
          </ul>
        </Section>
        
        <Text style={securityNote}>
          <strong>Security Note:</strong> If you didn't request this email change, please contact our support team immediately and consider changing your password.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>This email was sent to {newEmail}</Text>
          <Text style={footerText}>
            If you're having trouble with the button above, copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

EmailChangeEmail.PreviewProps = {
  confirmationUrl: 'http://localhost:5173/verify-email?token=change456def',
  token: 'CHG456',
  email: 'old.email@example.com',
  newEmail: 'new.email@example.com',
} as EmailChangeEmailProps;

export default EmailChangeEmail;

// Styles
const main = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif',
  lineHeight: '1.6',
  color: '#333',
  backgroundColor: '#f5f5f5',
};

const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '20px',
  backgroundColor: 'white',
  borderRadius: '8px',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
};

const logoSection = {
  textAlign: 'center' as const,
  marginBottom: '30px',
};

const logoHeading = {
  color: '#2D3748',
  fontSize: '24px',
  margin: '0',
  fontWeight: '600',
};

const arabicText = {
  color: '#D4AF37',
  fontSize: '18px',
  marginTop: '5px',
  margin: '5px 0 0 0',
};

const heading = {
  color: '#333',
  fontSize: '20px',
  fontWeight: '600',
  margin: '0 0 20px 0',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const emailAddresses = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  margin: '20px 0',
  padding: '15px',
  backgroundColor: '#f8f9fa',
  borderRadius: '6px',
  border: '1px solid #e9ecef',
};

const emailBox = {
  textAlign: 'center' as const,
  flex: 1,
};

const emailLabel = {
  display: 'block',
  color: '#2D3748',
  marginBottom: '5px',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 5px 0',
};

const emailAddress = {
  fontFamily: '"Courier New", monospace',
  backgroundColor: 'white',
  padding: '8px 12px',
  borderRadius: '4px',
  border: '1px solid #e2e8f0',
  fontSize: '14px',
  margin: '0',
};

const arrow = {
  margin: '0 20px',
  fontSize: '24px',
  color: '#3182CE',
  fontWeight: 'bold',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#3182CE',
  color: 'white',
  padding: '12px 30px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
};

const tokenSection = {
  backgroundColor: '#ebf8ff',
  border: '1px solid #90cdf4',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const tokenText = {
  fontSize: '24px',
  fontWeight: 'bold',
  color: '#2D3748',
  letterSpacing: '3px',
  fontFamily: '"Courier New", monospace',
  margin: '10px 0',
};

const expiryText = {
  fontSize: '14px',
  color: '#6c757d',
  margin: '10px 0 0 0',
};

const emailChangeNotice = {
  backgroundColor: '#f7fafc',
  border: '1px solid #cbd5e0',
  borderRadius: '6px',
  padding: '20px',
  margin: '20px 0',
};

const noticeTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  margin: '0 0 10px 0',
};

const noticeList = {
  color: '#333',
  fontSize: '14px',
  lineHeight: '1.5',
  margin: '10px 0 0 20px',
};

const noticeItem = {
  margin: '5px 0',
};

const securityNote = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '20px 0 16px 0',
};

const footer = {
  marginTop: '40px',
  paddingTop: '20px',
  borderTop: '1px solid #e9ecef',
  textAlign: 'center' as const,
};

const footerText = {
  fontSize: '14px',
  color: '#6c757d',
  margin: '0 0 10px 0',
};

const urlText = {
  fontSize: '14px',
  color: '#007bff',
  wordBreak: 'break-all' as const,
  margin: '0',
};