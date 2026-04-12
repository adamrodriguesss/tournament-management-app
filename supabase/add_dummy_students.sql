-- Enable pgcrypto for password hashing if not already enabled
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_dept text;
    v_i int;
    v_student_id uuid;
    v_student_email text;
    v_student_name text;
    v_default_password text := crypt('password123', gen_salt('bf'));
    -- Add or modify departments as needed
    v_depts text[] := ARRAY['MCA', 'MSC DATA SCIENCE', 'MSC AI'];
BEGIN
    RAISE NOTICE 'Starting dummy student insertion...';
    
    FOREACH v_dept IN ARRAY v_depts LOOP
        FOR v_i IN 1..10 LOOP
            v_student_id := gen_random_uuid();
            v_student_email := 'dummy_' || lower(replace(v_dept, ' ', '_')) || '_' || v_i || '@college.edu';
            v_student_name := 'Dummy ' || v_dept || ' Student ' || v_i;
            
            -- 1. Insert into auth.users
            INSERT INTO auth.users (
                instance_id,
                id,
                aud,
                role,
                email,
                encrypted_password,
                email_confirmed_at,
                raw_app_meta_data,
                raw_user_meta_data,
                created_at,
                updated_at,
                confirmation_token,
                recovery_token,
                email_change_token_new,
                email_change
            ) VALUES (
                '00000000-0000-0000-0000-000000000000',
                v_student_id,
                'authenticated',
                'authenticated',
                v_student_email,
                v_default_password,
                now(),
                '{"provider": "email", "providers": ["email"]}',
                json_build_object('full_name', v_student_name, 'department', v_dept),
                now(),
                now(),
                '',
                '',
                '',
                ''
            );

            -- 2. Insert into auth.identities to ensure sign-in works properly
            INSERT INTO auth.identities (
                id,
                user_id,
                provider_id,
                identity_data,
                provider,
                created_at,
                updated_at
            ) VALUES (
                gen_random_uuid(),
                v_student_id,
                v_student_id::text,
                json_build_object('sub', v_student_id, 'email', v_student_email),
                'email',
                now(),
                now()
            );

            -- 3. Insert into public.users
            -- Note: Uses ON CONFLICT to avoid errors if there's a trigger on auth.users 
            -- that automatically inserts into public.users.
            INSERT INTO public.users (
                id,
                email,
                full_name,
                role,
                department,
                created_at
            ) VALUES (
                v_student_id,
                v_student_email,
                v_student_name,
                'participant',
                v_dept::department,
                now()
            ) ON CONFLICT (id) DO UPDATE SET 
                full_name = EXCLUDED.full_name,
                department = EXCLUDED.department,
                role = EXCLUDED.role;
                
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Successfully inserted dummy students (10 per department). Password for all is "password123".';
END $$;
