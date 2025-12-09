import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Section,
  Text,
} from '@react-email/components';

interface ConfirmationEmailProps {
  confirmationUrl?: string;
  token?: string;
}

export const ConfirmationEmail = ({
  confirmationUrl = '{{ .ConfirmationURL }}',
  token = '{{ .Token }}',
}: ConfirmationEmailProps) => (
  <Html>
    <Head />
    <Body style={main}>
      <Container style={container}>
        
        <Text style={tertiary}>Verify Your Email</Text>
        
        <Heading style={secondary}>
          Enter the following code<br />
          to start using Arabic Voice Agent.
        </Heading>
        
        <Section style={codeContainer}>
          <Text style={code}>{token}</Text>
        </Section>
        
        <Section style={buttonSection}>
          <Button style={button} href={confirmationUrl}>
            Verify Email
          </Button>
        </Section>
        
        <Text style={paragraph}>Not expecting this email?</Text>
        <Text style={paragraph}>You can safely ignore it 😊</Text>
      </Container>
    </Body>
  </Html>
);

ConfirmationEmail.PreviewProps = {
  confirmationUrl: 'http://localhost:5173/verify-email?token=abc123def456',
  token: '144833',
} as ConfirmationEmailProps;

export default ConfirmationEmail;

const main = {
  backgroundColor: '#f4f4f5',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  padding: '2em',
  margin: '0',
};

const container = {
  backgroundColor: '#ffffff',
  border: '1px solid #eee',
  borderRadius: '5px',
  boxShadow: '0 5px 10px rgba(20,50,70,.2)',
  marginTop: '20px',
  maxWidth: '360px',
  margin: '2em auto',
  padding: '40px 40px 40px 40px',
};


const tertiary = {
  color: '#0a85ea',
  fontSize: '11px',
  fontWeight: 700,
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  height: '16px',
  letterSpacing: '0',
  lineHeight: '16px',
  margin: '16px 8px 8px 8px',
  textTransform: 'uppercase' as const,
  textAlign: 'center' as const,
};

const secondary = {
  color: '#000',
  display: 'block',
  fontFamily: 'HelveticaNeue-Medium,Helvetica,Arial,sans-serif',
  fontSize: '20px',
  fontWeight: 500,
  lineHeight: '24px',
  marginBottom: '0',
  marginTop: '0',
  textAlign: 'center' as const,
};

const codeContainer = {
  background: 'rgba(0,0,0,.05)',
  borderRadius: '4px',
  margin: '16px auto 14px',
  verticalAlign: 'middle',
  width: '280px',
};

const code = {
  color: '#000',
  fontFamily: 'HelveticaNeue-Bold',
  fontSize: '32px',
  fontWeight: 700,
  letterSpacing: '6px',
  lineHeight: '40px',
  paddingBottom: '8px',
  paddingTop: '8px',
  margin: '0 auto',
  display: 'block',
  textAlign: 'center' as const,
};

const buttonSection = {
  textAlign: 'center' as const,
  margin: '20px 0',
};

const button = {
  backgroundColor: '#0a85ea',
  borderRadius: '3px',
  color: '#fff',
  fontFamily: 'HelveticaNeue-Medium,Helvetica,Arial,sans-serif',
  fontSize: '15px',
  fontWeight: 500,
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '19px 19px',
};

const paragraph = {
  color: '#444',
  fontSize: '15px',
  fontFamily: 'HelveticaNeue,Helvetica,Arial,sans-serif',
  letterSpacing: '0',
  lineHeight: '23px',
  padding: '0',
  margin: '0',
  textAlign: 'center' as const,
};


