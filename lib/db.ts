import postgres from "postgres";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb(){
    if(sql){
        return sql;
    }

    const databaseUrl = process.env.DATABASE_URL;

    if(!databaseUrl){
        throw new Error("DATABASE_URL não configurada.");
    }

    sql = postgres(databaseUrl, {
       ssl: "require",
       max: 1, 
    });
    return sql;
}