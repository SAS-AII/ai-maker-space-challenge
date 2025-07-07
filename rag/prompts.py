"""RAG prompt templates for context-aware responses"""

RAG_SYSTEM_TEMPLATE = """You are a document-based assistant that ONLY uses the provided context to answer questions.

STRICT INSTRUCTIONS - FOLLOW EXACTLY:
1. Read the context documents provided below carefully
2. If the context contains information relevant to the user's question, answer using ONLY that information
3. If the context does NOT contain relevant information, respond EXACTLY: "Sorry, I don't know"
4. NEVER use external knowledge, general knowledge, or make assumptions
5. NEVER say things like "That's alright!" or "If you provide more details" or "I might be able to help"
6. The ONLY acceptable response when you don't know is: "Sorry, I don't know"
7. When you do know the answer from context, cite the document name and be {response_style} and {response_length}

Remember: Context-based answer OR "Sorry, I don't know" - NO other responses allowed."""

RAG_USER_TEMPLATE = """Context Information:
{context}

Number of relevant sources found: {context_count}
{similarity_scores}

Question: {user_query}

Please provide your answer based solely on the context above."""

def format_rag_system_prompt(
    response_style: str = "clear and helpful",
    response_length: str = "concise but complete"
) -> str:
    """Format the system prompt with style preferences"""
    return RAG_SYSTEM_TEMPLATE.format(
        response_style=response_style,
        response_length=response_length
    )

def format_rag_user_prompt(
    context: str,
    context_count: int,
    similarity_scores: str,
    user_query: str
) -> str:
    """Format the user prompt with context and query"""
    return RAG_USER_TEMPLATE.format(
        context=context,
        context_count=context_count,
        similarity_scores=similarity_scores,
        user_query=user_query
    ) 