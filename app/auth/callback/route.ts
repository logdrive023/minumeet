import { createServerClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST() {
  try {
    const supabase = createServerClient()

    // Create the function to create tables if they don't exist
    const createTablesSQL = `
   CREATE OR REPLACE FUNCTION create_tables_if_not_exist()
   RETURNS void AS $$
   BEGIN
     -- Create users table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'users') THEN
       CREATE TABLE public.users (
         id UUID PRIMARY KEY,
         name VARCHAR(255) NOT NULL,
         email VARCHAR(255),
         age INT,
         interests TEXT,
         last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         is_available BOOLEAN DEFAULT FALSE,
         avatar_url TEXT,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         birth_date DATE,
         gender VARCHAR(20),
         gender_preference VARCHAR(20),
         terms_accepted BOOLEAN DEFAULT FALSE,
         min_age_preference INTEGER DEFAULT 18,
         max_age_preference INTEGER DEFAULT 99,
         latitude DOUBLE PRECISION,
         longitude DOUBLE PRECISION,
         city VARCHAR(100),
         state VARCHAR(50),
         max_distance_preference INTEGER DEFAULT 50,
         bio TEXT,
         updated_at TIMESTAMP WITH TIME ZONE,
         relationship_goal VARCHAR(20) DEFAULT 'friendship'
       );
     END IF;

     -- Add new columns if they don't exist
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'gender') THEN
       ALTER TABLE public.users ADD COLUMN gender VARCHAR(20);
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'gender_preference') THEN
       ALTER TABLE public.users ADD COLUMN gender_preference VARCHAR(20);
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'birth_date') THEN
       ALTER TABLE public.users ADD COLUMN birth_date DATE;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'terms_accepted') THEN
       ALTER TABLE public.users ADD COLUMN terms_accepted BOOLEAN DEFAULT FALSE;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'min_age_preference') THEN
       ALTER TABLE public.users ADD COLUMN min_age_preference INTEGER DEFAULT 18;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'max_age_preference') THEN
       ALTER TABLE public.users ADD COLUMN max_age_preference INTEGER DEFAULT 99;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'latitude') THEN
       ALTER TABLE public.users ADD COLUMN latitude DOUBLE PRECISION;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'longitude') THEN
       ALTER TABLE public.users ADD COLUMN longitude DOUBLE PRECISION;
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'city') THEN
       ALTER TABLE public.users ADD COLUMN city VARCHAR(100);
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'state') THEN
       ALTER TABLE public.users ADD COLUMN state VARCHAR(50);
     END IF;

     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'max_distance_preference') THEN
       ALTER TABLE public.users ADD COLUMN max_distance_preference INTEGER DEFAULT 50;
     END IF;

     -- Add bio column if it doesn't exist
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'bio') THEN
       ALTER TABLE public.users ADD COLUMN bio TEXT;
     END IF;

     -- Add updated_at column if it doesn't exist
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'updated_at') THEN
       ALTER TABLE public.users ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE;
     END IF;

     -- Add relationship_goal column if it doesn't exist
     IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'users' 
                   AND column_name = 'relationship_goal') THEN
       ALTER TABLE public.users ADD COLUMN relationship_goal VARCHAR(20) DEFAULT 'friendship';
     END IF;

     -- Create waiting_users table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'waiting_users') THEN
       CREATE TABLE public.waiting_users (
         user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
         timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );
     END IF;

     -- Create matches table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'matches') THEN
       CREATE TABLE public.matches (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         mutual BOOLEAN DEFAULT FALSE,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         UNIQUE(user1_id, user2_id)
       );
     END IF;

     -- Create calls table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'calls') THEN
       CREATE TABLE public.calls (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         room_url TEXT NOT NULL,
         user1_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         user2_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         end_time TIMESTAMP WITH TIME ZONE,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );
     END IF;

     -- Create messages table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'messages') THEN
       CREATE TABLE public.messages (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
         sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         content TEXT NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
       );
     END IF;

     -- Create rejections table if it doesn't exist
     IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'rejections') THEN
       CREATE TABLE public.rejections (
         id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
         user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         rejected_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
         expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
         created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
         UNIQUE(user_id, rejected_user_id)
       );
     END IF;
   END;
   $$ LANGUAGE plpgsql;
   `

    // Execute the SQL to create the functions
    await supabase.rpc("create_tables_if_not_exist")

    // Criar função e trigger para atualizar a idade automaticamente no aniversário
    const birthdayUpdateSQL = `
    -- Função para atualizar a idade no aniversário
    CREATE OR REPLACE FUNCTION update_age_on_birthday()
    RETURNS void AS $$
    BEGIN
      -- Atualiza a idade de todos os usuários que fazem aniversário hoje
      UPDATE users
      SET 
        age = age + 1,
        updated_at = NOW()
      WHERE 
        birth_date IS NOT NULL AND
        EXTRACT(MONTH FROM birth_date) = EXTRACT(MONTH FROM CURRENT_DATE) AND
        EXTRACT(DAY FROM birth_date) = EXTRACT(DAY FROM CURRENT_DATE);
    END;
    $$ LANGUAGE plpgsql;

    -- Criar uma função para executar diariamente
    CREATE OR REPLACE FUNCTION create_birthday_job()
    RETURNS void AS $$
    DECLARE
      job_id bigint;
    BEGIN
      -- Verificar se o pgcron está disponível
      IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Remover job existente se houver
        PERFORM cron.unschedule(job_id)
        FROM cron.job
        WHERE command LIKE '%update_age_on_birthday%';
        
        -- Agendar novo job para executar diariamente às 00:01
        SELECT cron.schedule('1 0 * * *', 'SELECT update_age_on_birthday()')
        INTO job_id;
      ELSE
        -- Se pg_cron não estiver disponível, criar uma função que pode ser chamada manualmente
        RAISE NOTICE 'pg_cron extension not available. The update_age_on_birthday() function can be called manually.';
      END IF;
    END;
    $$ LANGUAGE plpgsql;

    -- Tentar criar o job se possível
    DO $$
    BEGIN
      -- Tentar criar a extensão pg_cron se não existir
      BEGIN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create pg_cron extension. This is normal if you do not have superuser privileges.';
      END;
      
      -- Tentar criar o job
      BEGIN
        PERFORM create_birthday_job();
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not schedule birthday job. You can call update_age_on_birthday() manually.';
      END;
    END $$;

    -- Executar a função uma vez para atualizar idades de aniversariantes de hoje
    SELECT update_age_on_birthday();
    `

    // Executar o SQL para criar a função e trigger de aniversário
    try {
      await supabase.rpc("exec_sql", { sql: birthdayUpdateSQL })
    } catch (error) {
      console.error("Erro ao criar função de atualização de idade:", error)
      // Continue mesmo se houver erro, pois pode ser que o usuário não tenha permissões para criar extensões
    }

    // Create storage buckets if they don't exist
    try {
      const { data: buckets } = await supabase.storage.listBuckets()

      // Check if avatars bucket exists
      const avatarsBucketExists = buckets?.some((b) => b.name === "avatars")

      if (!avatarsBucketExists) {
        await supabase.storage.createBucket("avatars", {
          public: true,
          fileSizeLimit: 2097152, // 2MB
          allowedMimeTypes: ["image/png", "image/jpeg", "image/jpg", "image/gif"],
        })
      }
    } catch (storageError) {
      console.error("Error setting up storage buckets:", storageError)
      // Continue even if storage setup fails
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Setup DB error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ message: "Use POST to set up the database" })
}
