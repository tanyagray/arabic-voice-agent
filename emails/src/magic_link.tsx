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

interface MagicLinkEmailProps {
  confirmationUrl?: string;
  token?: string;
  email?: string;
}

export const MagicLinkEmail = ({
  confirmationUrl = '{{ .ConfirmationURL }}',
  token = '{{ .Token }}',
  email = '{{ .Email }}',
}: MagicLinkEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoHeading}>Arabic Voice Agent</Heading>
        </Section>
        
        <Heading style={heading}>Sign In to Your Account</Heading>
        
        <Section style={magicLinkInfo}>
          <Heading style={magicLinkHeading}>✨ Magic Link Sign In</Heading>
          <Text style={magicLinkText}>
            No password needed - just click to sign in securely
          </Text>
        </Section>
        
        <Text style={paragraph}>
          Click the button below to sign in to your Arabic Voice Agent account and continue your Arabic learning journey:
        </Text>
        
        <Section style={buttonSection}>
          <Link href={confirmationUrl} style={button}>
            Sign In to Arabic Voice Agent
          </Link>
        </Section>
        
        <Section style={tokenSection}>
          <Text style={paragraph}>
            <strong>Or use this sign-in code:</strong>
          </Text>
          <Text style={tokenText}>{token}</Text>
          <Text style={expiryText}>
            This code will expire in 1 hour
          </Text>
        </Section>
        
        <Text style={paragraph}>Once signed in, you can:</Text>
        <ul style={list}>
          <li style={listItem}>Continue your Arabic conversations</li>
          <li style={listItem}>Review your learned vocabulary</li>
          <li style={listItem}>Check your reading and writing progress</li>
          <li style={listItem}>Discover new Arabic words and phrases</li>
        </ul>
        
        <Text style={securityNote}>
          <strong>Security Note:</strong> This magic link was requested from your account. If you didn't request this sign-in link, you can safely ignore this email.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>This email was sent to {email}</Text>
          <Text style={footerText}>
            If you're having trouble with the button above, copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

MagicLinkEmail.PreviewProps = {
  confirmationUrl: 'http://localhost:5173/auth/callback?token=xyz789abc123',
  token: 'XYZ789',
  email: 'user@example.com',
} as MagicLinkEmailProps;

export default MagicLinkEmail;

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

const magicLinkInfo = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: '8px',
  padding: '20px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const magicLinkHeading = {
  margin: '0 0 10px 0',
  color: 'white',
  fontSize: '18px',
  fontWeight: '600',
};

const magicLinkText = {
  margin: '0',
  color: 'white',
  fontSize: '16px',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#38A169',
  color: 'white',
  padding: '12px 30px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
};

const tokenSection = {
  backgroundColor: '#f0fff4',
  border: '1px solid #9ae6b4',
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

const list = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 20px',
};

const listItem = {
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