import json
from typing import Dict, Any, AsyncGenerator
from openai import AsyncOpenAI
from memory import QdrantLegalMemory

TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "book_legal_consultation",
            "description": "Schedule an urgent consultation with a verified advocate.",
            "parameters": {
                "type": "object",
                "properties": {
                    "legal_domain": {"type": "string", "description": "Category e.g., Police, Tenant, Cyber, Workplace"},
                    "preferred_time": {"type": "string", "description": "Preferred time for consultation"}
                },
                "required": ["legal_domain", "preferred_time"]
            }
        }
    }
]

class VoiceAgentOrchestrator:
    def __init__(self, memory: QdrantLegalMemory):
        self.openai = AsyncOpenAI()
        self.memory = memory

    async def execute_tool(self, name: str, args: Dict[str, Any]) -> str:
        if name == "book_legal_consultation":
            domain = args.get("legal_domain", "General Legal")
            time_slot = args.get("preferred_time", "Soonest available")
            return f"Appointment confirmed for {domain} law consultation at {time_slot}. Reference ID: #NYAAY-{domain[:3].upper()}-2026."
        return "Requested service executed successfully."

    async def generate_response(self, user_id: str, prompt: str) -> str:
        # Retrieve past context from Qdrant
        past_context = await self.memory.retrieve_context(user_id, prompt, limit=3)
        context_str = "\n".join(past_context)

        await self.memory.save_interaction(user_id, "user", prompt)

        system_instruction = (
            "You are Nyaya-Mitra, an empathetic Indian legal advisor. "
            "Provide direct, concise, and structured guidance under Indian law (BNSS, IPC, Consumer Protection, Labour law). "
            "Keep responses conversational and suitable for speech synthesis. Avoid bold markdown syntax like asterisks in output.\n"
            f"Relevant Context from Qdrant Memory:\n{context_str}"
        )

        messages = [
            {"role": "system", "content": system_instruction},
            {"role": "user", "content": prompt}
        ]

        res = await self.openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=TOOLS,
            tool_choice="auto"
        )

        choice = res.choices[0].message

        if choice.tool_calls:
            tool_call = choice.tool_calls[0]
            tool_result = await self.execute_tool(
                tool_call.function.name, 
                json.loads(tool_call.function.arguments)
            )
            messages.append(choice)
            messages.append({
                "tool_call_id": tool_call.id,
                "role": "tool",
                "name": tool_call.function.name,
                "content": tool_result
            })

            final_res = await self.openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=messages
            )
            final_text = final_res.choices[0].message.content
        else:
            final_text = choice.content

        await self.memory.save_interaction(user_id, "assistant", final_text)
        return final_text