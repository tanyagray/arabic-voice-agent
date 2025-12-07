
  create table "public"."agent_sessions" (
    "session_id" text not null,
    "user_id" uuid not null,
    "items" jsonb not null default '[]'::jsonb,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


CREATE UNIQUE INDEX agent_sessions_pkey ON public.agent_sessions USING btree (session_id);

CREATE INDEX idx_agent_sessions_session_id ON public.agent_sessions USING btree (session_id);

CREATE INDEX idx_agent_sessions_updated_at ON public.agent_sessions USING btree (updated_at);

CREATE INDEX idx_agent_sessions_user_id ON public.agent_sessions USING btree (user_id);

alter table "public"."agent_sessions" add constraint "agent_sessions_pkey" PRIMARY KEY using index "agent_sessions_pkey";

alter table "public"."agent_sessions" add constraint "agent_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."agent_sessions" validate constraint "agent_sessions_user_id_fkey";

set check_function_bodies = off;

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

CREATE TRIGGER update_agent_sessions_updated_at BEFORE UPDATE ON public.agent_sessions FOR EACH ROW EXECUTE FUNCTION public.update_agent_sessions_updated_at();


