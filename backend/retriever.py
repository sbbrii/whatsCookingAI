"""Recipe retrieval service placeholder."""


class RecipeRetriever:
    """Retrieve recipe context from the persisted vector index."""

    def suggest(self, ingredients: str) -> list[dict[str, object]]:
        """Suggest recipes for a user-provided ingredient query."""
        raise NotImplementedError("Recipe retrieval will be implemented later.")
