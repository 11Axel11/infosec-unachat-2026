## ADDED Requirements

### Requirement: Profile in the chat window
When a person is signed in, the chat window SHALL show that person's name, email, and profile photo. The photo SHALL be loaded from Google's resource server only when the picture URL uses https and its host is `googleusercontent.com` or a subdomain of it. The page SHALL NOT request a picture from any other address.

#### Scenario: Google profile is available
- **WHEN** the visitor is authenticated and the profile includes a name, an email, and an https picture URL on `googleusercontent.com`
- **THEN** the chat window shows that name, that email, and an image loaded from that Google URL

#### Scenario: Picture is not hosted by Google
- **WHEN** the visitor is authenticated and the picture URL is missing or is not an https address on `googleusercontent.com`
- **THEN** the chat window shows the name and email
- **THEN** the page does not request that picture
