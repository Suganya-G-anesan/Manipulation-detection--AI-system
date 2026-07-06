from fastapi import FastAPI, Query
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, HTTPException,Request
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from database import SessionLocal, engine
from models import User, Base
from passlib.context import CryptContext
from fastapi.middleware.cors import CORSMiddleware

from agentReact import agent
from typing import Sequence,TypedDict,List
from langchain_core.messages import BaseMessage,AIMessage,HumanMessage,ToolMessage,SystemMessage
from pydantic import BaseModel
import uvicorn
import supabase
import os

from db import add_message

app = FastAPI()

app.mount("/static",StaticFiles(directory="static"),name="static")

templates = Jinja2Templates(directory="templates")




from supabase import create_client

SUPABASE_URL = os.getenv("SSK_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SSK_SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# =========================
# CREATE TABLES
# =========================
Base.metadata.create_all(bind=engine)

# =========================
# CORS (IMPORTANT)
# =========================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # for dev
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================
# PASSWORD CONFIG
# =========================
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    return pwd_context.hash(password[:72])  # bcrypt fix

def verify_password(plain, hashed):
    return pwd_context.verify(plain[:72], hashed)


# =========================
# DB DEPENDENCY
# =========================
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# =========================
# SIGNUP API
# =========================
@app.post("/signup")
def signup(user: dict, db: Session = Depends(get_db)):
    # Check existing user
    existing_user = db.query(User).filter(User.email == user.get("email")).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    hashed_password = hash_password(user.get("password"))

    new_user = User(
        first_name=user.get("first_name"),
        last_name=user.get("last_name"),
        email=user.get("email"),
        password=hashed_password,
        organisation=user.get("organisation"),
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {"message": "User created successfully"}


@app.post("/login")
def login(user: dict, db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.email == user.get("email")).first()

    if not db_user:
        raise HTTPException(status_code=400, detail="User not found")

    input_password = user.get("password")
    stored_password = db_user.password

    is_valid = False

    try:
        if verify_password(input_password, stored_password):
            is_valid = True
    except:
        pass

    if not is_valid and input_password == stored_password:
        is_valid = True

        hashed = hash_password(input_password)
        db_user.password = hashed
        db.commit()

    if not is_valid:
        raise HTTPException(status_code=400, detail="Invalid password")

    return {
        "message": "Login successful",
        "user": {
            "email": db_user.email,
            "name": db_user.first_name
        }
    }

class TextRequest(BaseModel):
    text: str
    userid: str
class state(TypedDict):
    messages:List[BaseMessage]

initial_state = {"messages": 
    [SystemMessage(content="""
You are an AI assistant specialized in analyzing human messages.
your are Rag agent-
you rag knowledge contain user past  mesagges which detectet as emotionally manuplative based on data guide them emotionally

You  RAGTool used for:
- detecting manipulation
- analyzing emotional tone
- identifying communication patterns
- comparing with known examples


- Do NOT rely on your own knowledge for classification
- Use retrieved context to determine:
    - whether message is manipulative or not
    - technique used
    - reasoning
""")]}

@app.post("/agent")
def root(request:TextRequest):
    global initial_state
    li=[request.text]
    initial_state['messages'].append(HumanMessage(request.text))
    initial_state=agent.invoke( initial_state)

    l=initial_state['messages'][-1].content
    li.append(l);
    
    add_message(li,request.userid)

    print(request.userid)
    return {"result": l}





@app.get("/get-logs")
def get_logs(
    user_email: str,
    limit: int = Query(100, ge=1, le=5000),
    days: int = Query(None)   # 👈 for filtering (1, 7, 30)
):
    try:
        query = supabase.table("model_logs") \
            .select("uid,type,manipulative,technique,result,created_at") \
            .eq("user_email", user_email) \
            .order("created_at", desc=True)

        # ✅ FILTER BY DATE (for dashboard buttons)
        if days:
            cutoff = datetime.utcnow() - timedelta(days=days)
            query = query.gte("created_at", cutoff.isoformat())

        # ✅ LIMIT
        response = query.limit(limit).execute()

        return {
            "count": len(response.data),
            "data": response.data
        }

    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def Home(request:Request):
    return templates.TemplateResponse(request,"ManipDetect_AI.html")


if __name__ =="__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)