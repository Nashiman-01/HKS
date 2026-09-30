from groq import Groq

from app.core.config import settings


client = Groq(
    api_key=settings.groq_api_key
)


def generate_response(user_message: str) -> str:
    response = client.chat.completions.create(
        model=settings.groq_model,
        messages=[
            {
                "role": "user",
                "content": user_message,
            }
        ],
    )

    return response.choices[0].message.content