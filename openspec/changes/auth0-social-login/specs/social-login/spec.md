## Purpose

Lets a person sign in to the deployed UNA Chat with Auth0 and use the room as that identity, without turning login on for test runs that have no Auth0 configuration.

## ADDED Requirements

### Requirement: Login follows the environment
The system SHALL require Auth0 sign-in only when both the Auth0 domain and client id are configured. When they are absent, the chat SHALL stay usable without a session.

#### Scenario: Auth0 is not configured
- **WHEN** a visitor opens the chat and the server has no Auth0 domain or client id
- **THEN** `/auth/config` reports that login is disabled
- **THEN** the composer is usable

#### Scenario: Auth0 is configured
- **WHEN** a visitor opens the chat and both Auth0 settings are present
- **THEN** the chat does not connect until the visitor finishes sign-in

### Requirement: Signed-in identity
The system SHALL show the authenticated person's name or email and SHALL let them sign out. Messages from that person SHALL use the authenticated name.

#### Scenario: Successful sign-in
- **WHEN** the visitor completes Auth0 sign-in
- **THEN** the page shows that person's name or email and a sign-out control
- **THEN** the chat connects

#### Scenario: Cancelled or failed sign-in
- **WHEN** the visitor cancels sign-in or Auth0 returns an error
- **THEN** the page explains what happened and offers to try again

### Requirement: Secret stays on the server
The system SHALL NOT send the Auth0 client secret to the browser.

#### Scenario: Public config
- **WHEN** the browser reads `/auth/config`
- **THEN** the response contains at most the domain and client id
