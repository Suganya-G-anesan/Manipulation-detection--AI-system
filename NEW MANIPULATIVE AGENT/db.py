from supabase import create_client
from langchain_huggingface import HuggingFaceEmbeddings
import os

SUPABASE_URL =  os.getenv("YASAR_SUPABASE_URL")
SUPABASE_KEY =  os.getenv("YASAR_SUPABASE_KEY")

embedding = HuggingFaceEmbeddings(
     model_name="sentence-transformers/all-MiniLM-L6-v2"
)
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
# response = supabase.table("agent_memory").select("*").execute()

def add_message(li:list,user:str):
        response= supabase.table("agent_memory").insert({
        "user_id": user,
        "role":"human",
        "content":li[0]  }).execute()
        response1= supabase.table("agent_memory").insert({
        "user_id": user,
        "role":"ai",
        "content":li[1]  }).execute()
        store_vectors(user,["human: "+li[0],"ai: "+li[1]]) 
        return response,response1


def extract(user :str):
        response = supabase.table("agent_memory").select("role,content").eq("user_id",user).order("created_at", desc=False).execute()
        return response

def extract_rag(user :str):
        response = supabase.table("agent_memory").select("role,content,created_at").eq("user_id",user).order("created_at", desc=False).execute()
        return ["on "+item["created_at"]+" "+item["role"]+":"+item["content"] for item in response.data]

def chunk_text(messages, chunk_size=50):
    return [" ".join(messages[i:i+chunk_size]) 
            for i in range(0, len(messages), chunk_size)]

def get_embedding(text: str):
    return embedding.embed_query(text)

def store_vectors( user_id, chunks,supabase=supabase):
    for chunk in chunks:
        embedding = get_embedding(chunk)
        supabase.table("memory_vectors").insert({
            
            "user_id": user_id,
            "content": chunk,
            "embedding": embedding
            
        }).execute()



def search_memory(query,user,supabase=supabase):
    query_embedding = get_embedding(query)

    res = supabase.rpc("match_documents", {
    "query_embedding": query_embedding,
    "match_count": 2,
    "p_user_id": user
}).execute()

    return res.data


