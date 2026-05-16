class AiExaminerService:
    """Boundary stub for future confidential AI evaluation workflows."""

    def request_evaluation(self, *, submission_id: int, encrypted_context: dict) -> dict:
        raise NotImplementedError("AI examiner integration must preserve the explicit crypto trust boundary.")

