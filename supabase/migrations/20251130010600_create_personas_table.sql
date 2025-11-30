create schema if not exists "config";


  create table "config"."personas" (
    "id" integer not null,
    "locale" text not null,
    "voice_provider" text not null,
    "voice_id" text not null
      );


alter table "config"."personas" enable row level security;

CREATE UNIQUE INDEX personas_pkey ON config.personas USING btree (id);

alter table "config"."personas" add constraint "personas_pkey" PRIMARY KEY using index "personas_pkey";

grant select on table "config"."personas" to "authenticated";

grant delete on table "config"."personas" to "service_role";

grant insert on table "config"."personas" to "service_role";

grant references on table "config"."personas" to "service_role";

grant select on table "config"."personas" to "service_role";

grant trigger on table "config"."personas" to "service_role";

grant truncate on table "config"."personas" to "service_role";

grant update on table "config"."personas" to "service_role";


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



