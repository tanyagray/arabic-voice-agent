create schema if not exists "config";


  create table "config"."personas" (
    "id" integer not null,
    "locale" text not null,
    "voice_provider" text not null,
    "voice_id" text not null
      );


alter table "config"."personas" enable row level security;


  create table "public"."agent_sessions" (
    "session_id" text not null,
    "user_id" uuid not null,
    "items" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."agent_sessions" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "updated_at" timestamp with time zone not null default now(),
    "is_admin" boolean not null default false
      );


alter table "public"."profiles" enable row level security;


  create table "public"."transcript_messages" (
    "message_id" uuid not null,
    "session_id" text not null,
    "user_id" uuid not null,
    "message_source" text not null,
    "message_kind" text not null,
    "message_text" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "message_text_canonical" text
      );


alter table "public"."transcript_messages" enable row level security;

CREATE UNIQUE INDEX personas_pkey ON config.personas USING btree (id);

CREATE UNIQUE INDEX agent_sessions_pkey ON public.agent_sessions USING btree (session_id);

CREATE INDEX idx_agent_sessions_session_id ON public.agent_sessions USING btree (session_id);

CREATE INDEX idx_agent_sessions_updated_at ON public.agent_sessions USING btree (updated_at);

CREATE INDEX idx_agent_sessions_user_id ON public.agent_sessions USING btree (user_id);

CREATE INDEX idx_transcript_messages_session_id ON public.transcript_messages USING btree (session_id);

CREATE INDEX idx_transcript_messages_user_id ON public.transcript_messages USING btree (user_id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX transcript_messages_pkey ON public.transcript_messages USING btree (message_id);

alter table "config"."personas" add constraint "personas_pkey" PRIMARY KEY using index "personas_pkey";

alter table "public"."agent_sessions" add constraint "agent_sessions_pkey" PRIMARY KEY using index "agent_sessions_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."transcript_messages" add constraint "transcript_messages_pkey" PRIMARY KEY using index "transcript_messages_pkey";

alter table "public"."agent_sessions" add constraint "agent_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."agent_sessions" validate constraint "agent_sessions_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."transcript_messages" add constraint "transcript_messages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.agent_sessions(session_id) ON DELETE CASCADE not valid;

alter table "public"."transcript_messages" validate constraint "transcript_messages_session_id_fkey";

alter table "public"."transcript_messages" add constraint "transcript_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."transcript_messages" validate constraint "transcript_messages_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
begin
  insert into public.profiles (id)
  values (new.id);
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_agent_sessions_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION public.update_transcript_messages_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$
;

grant select on table "config"."personas" to "anon";

grant select on table "config"."personas" to "authenticated";

grant delete on table "config"."personas" to "service_role";

grant insert on table "config"."personas" to "service_role";

grant references on table "config"."personas" to "service_role";

grant select on table "config"."personas" to "service_role";

grant trigger on table "config"."personas" to "service_role";

grant truncate on table "config"."personas" to "service_role";

grant update on table "config"."personas" to "service_role";

grant delete on table "public"."agent_sessions" to "anon";

grant insert on table "public"."agent_sessions" to "anon";

grant references on table "public"."agent_sessions" to "anon";

grant select on table "public"."agent_sessions" to "anon";

grant trigger on table "public"."agent_sessions" to "anon";

grant truncate on table "public"."agent_sessions" to "anon";

grant update on table "public"."agent_sessions" to "anon";

grant delete on table "public"."agent_sessions" to "authenticated";

grant insert on table "public"."agent_sessions" to "authenticated";

grant references on table "public"."agent_sessions" to "authenticated";

grant select on table "public"."agent_sessions" to "authenticated";

grant trigger on table "public"."agent_sessions" to "authenticated";

grant truncate on table "public"."agent_sessions" to "authenticated";

grant update on table "public"."agent_sessions" to "authenticated";

grant delete on table "public"."agent_sessions" to "service_role";

grant insert on table "public"."agent_sessions" to "service_role";

grant references on table "public"."agent_sessions" to "service_role";

grant select on table "public"."agent_sessions" to "service_role";

grant trigger on table "public"."agent_sessions" to "service_role";

grant truncate on table "public"."agent_sessions" to "service_role";

grant update on table "public"."agent_sessions" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."transcript_messages" to "anon";

grant insert on table "public"."transcript_messages" to "anon";

grant references on table "public"."transcript_messages" to "anon";

grant select on table "public"."transcript_messages" to "anon";

grant trigger on table "public"."transcript_messages" to "anon";

grant truncate on table "public"."transcript_messages" to "anon";

grant update on table "public"."transcript_messages" to "anon";

grant delete on table "public"."transcript_messages" to "authenticated";

grant insert on table "public"."transcript_messages" to "authenticated";

grant references on table "public"."transcript_messages" to "authenticated";

grant select on table "public"."transcript_messages" to "authenticated";

grant trigger on table "public"."transcript_messages" to "authenticated";

grant truncate on table "public"."transcript_messages" to "authenticated";

grant update on table "public"."transcript_messages" to "authenticated";

grant delete on table "public"."transcript_messages" to "service_role";

grant insert on table "public"."transcript_messages" to "service_role";

grant references on table "public"."transcript_messages" to "service_role";

grant select on table "public"."transcript_messages" to "service_role";

grant trigger on table "public"."transcript_messages" to "service_role";

grant truncate on table "public"."transcript_messages" to "service_role";

grant update on table "public"."transcript_messages" to "service_role";


  create policy "Public read access"
  on "config"."personas"
  as permissive
  for select
  to public
using (true);



  create policy "Service role can modify"
  on "config"."personas"
  as permissive
  for all
  to service_role
using (true)
with check (true);



  create policy "Users can manage their own agent sessions"
  on "public"."agent_sessions"
  as permissive
  for all
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users can read own profile"
  on "public"."profiles"
  as permissive
  for select
  to authenticated
using ((auth.uid() = id));



  create policy "Users can manage their own transcript messages"
  on "public"."transcript_messages"
  as permissive
  for all
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));


CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON public.agent_sessions FOR EACH ROW EXECUTE FUNCTION public.update_agent_sessions_updated_at();

CREATE TRIGGER update_transcript_messages_updated_at BEFORE UPDATE ON public.transcript_messages FOR EACH ROW EXECUTE FUNCTION public.update_transcript_messages_updated_at();

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


