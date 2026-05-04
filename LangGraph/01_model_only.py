from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()  # 自動讀同資料夾的 .env，把 GOOGLE_API_KEY 注入到環境變數

model = ChatGoogleGenerativeAI(model="gemini-2.0-flash", temperature=0)

response = model.invoke("用一句話解釋什麼是 LangGraph")
print(response.content)
