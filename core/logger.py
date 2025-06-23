import logging

class AppLogger:
    """
    Wraps Python's logging to create module-specific loggers
    with daily file rotation and console output.
    """
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(logging.INFO)
        # Remove all handlers
        self.logger.handlers = []
        # Add only a StreamHandler (console)
        handler = logging.StreamHandler()
        formatter = logging.Formatter(
            '[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
        )
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def get_logger(self):
        return self.logger
