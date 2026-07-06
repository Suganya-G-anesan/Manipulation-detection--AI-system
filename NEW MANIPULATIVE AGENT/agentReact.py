from typing import Sequence,TypedDict,List
from langchain_core.messages import BaseMessage,AIMessage,HumanMessage,ToolMessage,SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph,START,END
from langgraph.prebuilt import ToolNode
from langchain_core.tools import tool
from retriever import get_relevant_context
import os

class state(TypedDict):
    messages:List[BaseMessage]

@tool
def CalculatorTool(query:str)->str:
    """THIS TOOL IS HELP TO DO MATHS CALCULATION invoke this tool for maths calculation
    args -
    maths equation"""
    try:
        result = str(eval(query))
        return result
    except Exception:
        return "Invalid math expression" 


def RAGTool(state: state) -> state:
    """Use this tool to answer questions from stored knowledge"""
    context = get_relevant_context(state['messages'][-1].content)
    state['messages'][-1].content=f"""you are rag agent based on given knowledge generate your response
    these are data user faced in past it may emotionally manuplate the user .
     data- {context}
motivate user 
user prompt-{state['messages'][-1].content}
"""
    print("prompt",state['messages'][-1].content)
    return state


llm = ChatOpenAI(
    model="openai/gpt-oss-20b",
    api_key=os.getenv("OPEN_AI_API_KEY"),
    base_url="https://openrouter.ai/api/v1",
    temperature=0.2).bind_tools([CalculatorTool])

tool_map={t.name:t for t in [CalculatorTool]}

def Chat(state:state)-> state:
    """it is llm node"""
    response=llm.invoke(state['messages']) 
    state['messages'].append(response)
    return state

def tool_node(state:state)-> state:
    last_message=state['messages'][-1]
    tool_calls=last_message.tool_calls
    
    for cal in tool_calls:
        tool_name=cal['name']
        tool_args=cal['args']
        #query = tool_args.get("query","")
        result = tool_map[tool_name].invoke(tool_args)
        
        state['messages'].append(
            ToolMessage(
                content=result, 
                tool_call_id=cal["id"]
            )
        )
    return state

def step(state:state):
    last_message=state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        print('true')
        return "tool"
    print('false')
    return "END"

graph=StateGraph(state)
graph.add_node("rag",RAGTool)
graph.add_node("llm",Chat)
graph.add_node('tool',tool_node)

graph.add_edge(START,"rag")
graph.add_edge('rag','llm')
graph.add_conditional_edges('llm',step,{"tool":'tool','END':END})
graph.add_edge('tool','llm')
graph.add_edge("llm",END)

agent=graph.compile()



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

# for i in range(3):
#     user_input =input("enter the input -")
#     print("Human: ",user_input)
#     initial_state['messages'].append(HumanMessage(content=user_input))
#     initial_state = app.invoke(initial_state)
#     print("AI: ",initial_state['messages'][-1].content)