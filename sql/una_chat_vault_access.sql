-- Private read path for the Auth0 client secret stored in Supabase Vault.
-- Apply this in the SQL editor of a test project. Do not put the secret value,
-- the role password, or a connection string in this file.
--
-- Before running it:
-- 1. In Vault, create a secret named una_chat_auth0_client_secret.
-- 2. Create the login role with a password you keep only in VAULT_DATABASE_URL:
--      create role una_chat_backend login password 'replace-with-a-long-password';

create schema if not exists una_chat_private;

revoke all on schema una_chat_private from public;
revoke all on schema una_chat_private from anon, authenticated;

create or replace function una_chat_private.get_auth0_client_secret()
returns text
language plpgsql
security definer
set search_path = vault, pg_catalog
as $$
declare
  secret text;
begin
  select decrypted_secret
    into secret
  from vault.decrypted_secrets
  where name = 'una_chat_auth0_client_secret'
  limit 1;

  if secret is null or length(secret) = 0 then
    raise exception 'Vault secret una_chat_auth0_client_secret is missing'
      using errcode = 'P0002';
  end if;

  return secret;
end;
$$;

revoke all on function una_chat_private.get_auth0_client_secret() from public;
revoke all on function una_chat_private.get_auth0_client_secret() from anon, authenticated, service_role;

grant usage on schema una_chat_private to una_chat_backend;
grant execute on function una_chat_private.get_auth0_client_secret() to una_chat_backend;
grant connect on database postgres to una_chat_backend;

revoke all on schema vault from public, anon, authenticated;
revoke all on all tables in schema vault from public, anon, authenticated;

alter role una_chat_backend connection limit 5;
alter role una_chat_backend set search_path = una_chat_private, pg_catalog;
