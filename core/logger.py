import logging
from logging.handlers import TimedRotatingFileHandler
from pathlib import Path

class AppLogger:
    """
    Wraps Python's logging to create module-specific loggers
    with daily file rotation and console output.
    """
    def __init__(self, name: str, level: int = logging.INFO, log_dir: str = "logs"):
        # get a logger named for the module (e.g. "app.routes.auth")
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)

        # ensure the logs directory exists
        log_path = Path(log_dir) / f"{name}.log"
        log_path.parent.mkdir(parents=True, exist_ok=True)

        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        )

        # rotate log files at midnight, keeping 7 days of history
        file_handler = TimedRotatingFileHandler(
            filename=log_path,
            when="midnight",
            interval=1,
            backupCount=7,
            encoding="utf-8",
        )
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)

        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

        self.logger.propagate = False

    def get_logger(self) -> logging.Logger:
        """Return the configured Logger instance."""
        return self.logger
