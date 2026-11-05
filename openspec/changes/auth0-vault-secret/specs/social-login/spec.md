## MODIFIED Requirements

### Requirement: Secret stays on the server
The system SHALL load the Auth0 client secret from Supabase Vault before initializing the Auth0 SDK, and SHALL NOT send that secret to the browser, HTTP responses, or logs.

#### Scenario: Public config
- **WHEN** the browser reads `/auth/config`
- **THEN** the response contains at most the domain and client id

#### Scenario: Vault cannot be read
- **WHEN** the database URL is missing, Vault is unreachable, the secret is missing, or the role lacks permission
- **THEN** the process logs a description without the secret and does not open the port

### Requirement: Protected room
The system SHALL expose `/sala` only to a browser that completed the authorization-code login.

#### Scenario: No session
- **WHEN** Auth0 is configured and the browser requests `/sala` without a session
- **THEN** the response is unauthorized

#### Scenario: Session from the code exchange
- **WHEN** the visitor finishes login and the server stored the ID token in an httpOnly cookie
- **THEN** `/sala` returns that person's name or email and the chat connects
