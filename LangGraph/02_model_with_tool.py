from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.tools import tool

load_dotenv()

# 1. 定義工具
@tool
def get_weather(city: str) -> str:
    """查詢指定城市的天氣（假資料）。"""
    fake_data = {
        "台北": "25 度，多雲",
        "東京": "18 度，晴天",
        "紐約": "10 度，下雨",
    }
    return fake_data.get(city, f"{city} 沒有資料")

@tool
def add(a: int, b: int) -> int:
    """加法。"""
    return a + b

# 2. 綁工具到 model
tools = [get_weather, add]
model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)
model_with_tools = model.bind_tools(tools)

# 3. 問問題
response = model_with_tools.invoke("台北現在幾度？另外幫我算 17 + 25")

# 4. 看 LLM 想呼叫什麼工具
print("=== LLM 文字回覆 ===")
print(response.content)
print("\n=== LLM 要求呼叫的工具 ===")
for call in response.tool_calls:
    print(f"  tool: {call['name']}, args: {call['args']}")

# 5. 手動執行工具（orchestration 的工作！）
print("\n=== 手動執行工具結果 ===")
tool_map = {t.name: t for t in tools}
for call in response.tool_calls:
    result = tool_map[call["name"]].invoke(call["args"])
    print(f"  {call['name']}({call['args']}) -> {result}")
