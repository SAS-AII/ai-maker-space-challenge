# one-line: wrap a string as a system-role message
def system_prompt(message: str) -> dict:
    return {"role": "system", "content": message}

# one-line: wrap a string as an assistant-role message
def assistant_prompt(message: str) -> dict:
    return {"role": "assistant", "content": message}

# one-line: wrap a string as a user-role message
def user_prompt(message: str) -> dict:
    return {"role": "user", "content": message}
