import os
import uuid
from typing import List, Dict, Any
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter, FieldCondition, MatchValue
from openai import AsyncOpenAI

class QdrantLegalMemory:
    def __init__(self, qdrant_url: str = None):
        self.client = QdrantClient(":memory:")
        self.openai = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        self.embedding_model = "text-embedding-3-small"
        self.vector_size = 1536
        self.collection_name = "nyaya_mitra_memory"
        self._bootstrap_collection()

    def _bootstrap_collection(self):
        collections = [c.name for c in self.client.get_collections().collections]
        if self.collection_name not in collections:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=self.vector_size, distance=Distance.COSINE)
            )

    async def get_embedding(self, text: str) -> List[float]:
        res = await self.openai.embeddings.create(model=self.embedding_model, input=text)
        return res.data[0].embedding

    async def save_interaction(self, user_id: str, role: str, text: str):
        vector = await self.get_embedding(text)
        point_id = str(uuid.uuid4())
        self.client.upsert(
            collection_name=self.collection_name,
            points=[
                PointStruct(
                    id=point_id,
                    vector=vector,
                    payload={"user_id": user_id, "role": role, "text": text}
                )
            ]
        )

    async def retrieve_context(self, user_id: str, query: str, limit: int = 3) -> List[str]:
        vector = await self.get_embedding(query)
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=vector,
            limit=limit,
            query_filter=Filter(
                must=[FieldCondition(key="user_id", match=MatchValue(value=user_id))]
            )
        )
        return [f"{hit.payload['role'].upper()}: {hit.payload['text']}" for hit in results]