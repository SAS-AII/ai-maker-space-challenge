"""RAG prompt templates for context-aware responses"""

RAG_SYSTEM_TEMPLATE = """You are a knowledgeable assistant that answers questions strictly based on provided context.

Instructions:
- Only answer questions using information from the provided context
- If the context doesn't contain relevant information, respond with "I don't know"
- Be accurate and cite specific parts of the context when possible
- Keep responses {response_style} and {response_length}
- Only use the provided context. Do not use external knowledge.
- Only provide answers when you are confident the context supports your response."""

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