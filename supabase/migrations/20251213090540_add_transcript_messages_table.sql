
  create table "public"."transcript_messages" (
    "message_id" uuid not null,
    "session_id" text not null,
    "user_id" uuid not null,
    "message_source" text not null,
    "message_kind" text not null,
    "message_content" text not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


CREATE INDEX idx_transcript_messages_session_id ON public.transcript_messages USING btree (session_id);

CREATE INDEX idx_transcript_messages_user_id ON public.transcript_messages USING btree (user_id);

CREATE UNIQUE INDEX transcript_messages_pkey ON public.transcript_messages USING btree (message_id);

alter table "public"."transcript_messages" add constraint "transcript_messages_pkey" PRIMARY KEY using index "transcript_messages_pkey";

alter table "public"."transcript_messages" add constraint "transcript_messages_session_id_fkey" FOREIGN KEY (session_id) REFERENCES public.agent_sessions(session_id) ON DELETE CASCADE not valid;

alter table "public"."transcript_messages" validate constraint "transcript_messages_session_id_fkey";

alter table "public"."transcript_messages" add constraint "transcript_messages_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."transcript_messages" validate constraint "transcript_messages_user_id_fkey";

set check_function_bodies = off;

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

CREATE TRIGGER update_transcript_messages_updated_at BEFORE UPDATE ON public.transcript_messages FOR EACH ROW EXECUTE FUNCTION public.update_transcript_messages_updated_at();


