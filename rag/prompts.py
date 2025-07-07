"""RAG prompt templates for context-aware responses"""

RAG_SYSTEM_TEMPLATE = """You are a knowledge assistant that ONLY answers questions using the provided context documents.

CRITICAL RULES:
- You MUST ONLY use information from the provided context below
- If the context does not contain relevant information to answer the question, respond EXACTLY with: "Sorry, I don't know the answer to that question based on the knowledge I have available."
- Do NOT use any external knowledge, common knowledge, or information not explicitly in the context
- Do NOT make assumptions or inferences beyond what is directly stated in the context
- Be accurate and cite which document contains the information when possible
- Keep responses {response_style} and {response_length}
- If asked about topics not covered in the context (like general knowledge questions), always respond with the "I don't know" message"""

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