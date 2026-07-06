from langchain_huggingface import HuggingFaceEmbeddings
from langchain_chroma import Chroma

embedding = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2"
)

db = Chroma(
    persist_directory="data/vector_db",
    embedding_function=embedding
)

retriever = db.as_retriever(search_type="similarity", search_kwargs={"k": 2})


def get_relevant_context(query: str) -> str:
    docs = retriever.invoke(query)
    return "\n".join([doc.page_content for doc in docs])



#print("rag--",retriever.invoke("Nobody else would tolerate you like I do"))