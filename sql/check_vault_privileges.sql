-- Privilege check. The result is booleans and the secret name only.
-- Do not select decrypted_secret or the secret column.

select
  has_function_privilege('anon', 'una_chat_private.get_auth0_client_secret()', 'execute') as anon_execute,
  has_function_privilege('authenticated', 'una_chat_private.get_auth0_client_secret()', 'execute') as authenticated_execute,
  has_function_privilege('public', 'una_chat_private.get_auth0_client_secret()', 'execute') as public_execute,
  has_table_privilege('anon', 'vault.decrypted_secrets', 'select') as anon_reads_vault,
  has_table_privilege('authenticated', 'vault.decrypted_secrets', 'select') as authenticated_reads_vault,
  has_function_privilege('una_chat_backend', 'una_chat_private.get_auth0_client_secret()', 'execute') as backend_execute;

select name, created_at, updated_at
from vault.secrets
where name = 'una_chat_auth0_client_secret';
