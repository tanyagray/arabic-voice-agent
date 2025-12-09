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

interface InviteEmailProps {
  confirmationUrl?: string;
  email?: string;
}

export const InviteEmail = ({
  confirmationUrl = '{{ .ConfirmationURL }}',
  email = '{{ .Email }}',
}: InviteEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        <Section style={logoSection}>
          <Heading style={logoHeading}>Arabic Voice Agent</Heading>
        </Section>
        
        <Section style={invitationCard}>
          <Heading style={invitationHeading}>You're Invited!</Heading>
          <Text style={invitationText}>
            Join Arabic Voice Agent and start your Arabic learning journey
          </Text>
        </Section>
        
        <Text style={paragraph}>
          Someone has invited you to join Arabic Voice Agent, an interactive platform for learning Arabic through conversation.
        </Text>
        
        <Text style={paragraph}>With Arabic Voice Agent, you can:</Text>
        <ul style={list}>
          <li style={listItem}>Practice Arabic conversation with AI assistants</li>
          <li style={listItem}>Learn new vocabulary with interactive word highlights</li>
          <li style={listItem}>Track your reading and writing progress</li>
          <li style={listItem}>Get instant translations and explanations</li>
          <li style={listItem}>Build confidence in your Arabic skills</li>
        </ul>
        
        <Section style={buttonSection}>
          <Link href={confirmationUrl} style={button}>
            Accept Invitation
          </Link>
        </Section>
        
        <Text style={paragraph}>
          Click the button above to create your account and start learning Arabic today!
        </Text>
        
        <Text style={paragraph}>
          If you're not interested in learning Arabic or received this invitation by mistake, you can safely ignore this email.
        </Text>
        
        <Section style={footer}>
          <Text style={footerText}>This invitation was sent to {email}</Text>
          <Text style={footerText}>
            If you're having trouble with the button above, copy and paste this URL into your browser:
          </Text>
          <Text style={urlText}>{confirmationUrl}</Text>
        </Section>
      </Container>
    </Body>
  </Html>
);

InviteEmail.PreviewProps = {
  confirmationUrl: 'http://localhost:5173/invite?token=invite123abc',
  email: 'newuser@example.com',
} as InviteEmailProps;

export default InviteEmail;

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

const invitationCard = {
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  borderRadius: '8px',
  padding: '30px',
  margin: '20px 0',
  textAlign: 'center' as const,
};

const invitationHeading = {
  margin: '0 0 15px 0',
  color: 'white',
  fontSize: '22px',
  fontWeight: '600',
};

const invitationText = {
  fontSize: '18px',
  margin: '0',
  color: 'white',
};

const paragraph = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '1.6',
  margin: '0 0 16px 0',
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

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  display: 'inline-block',
  backgroundColor: '#D4AF37',
  color: 'white',
  padding: '12px 30px',
  borderRadius: '6px',
  textDecoration: 'none',
  fontWeight: '600',
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