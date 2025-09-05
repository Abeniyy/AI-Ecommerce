from fastapi import FastAPI
from pydantic import BaseModel
import os
import psycopg2, psycopg2.extras
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import linear_kernel
import numpy as np

DB = dict(
    host=os.getenv("PG_HOST", "127.0.0.1"),
    port=int(os.getenv("PG_PORT", "5432")),
    dbname=os.getenv("PG_DATABASE", "ai_ecommerce"),
    user=os.getenv("PG_USER", "ecom_user"),
    password=os.getenv("PG_PASSWORD", "pass1232"),
)

app = FastAPI(title="AI Recs")

def pg():
    return psycopg2.connect(cursor_factory=psycopg2.extras.RealDictCursor, **DB)

CATALOG = None
VEC = None
MATRIX = None

def load_catalog():
    global CATALOG, VEC, MATRIX
    with pg() as conn, conn.cursor() as cur:
        cur.execute("""
          SELECT id, name,
                 COALESCE(NULLIF(description,''), name) AS text
            FROM public.products
           ORDER BY id ASC
        """)
        rows = cur.fetchall()
    CATALOG = rows
    corpus = [r["text"] or r["name"] for r in rows]
    VEC = TfidfVectorizer(max_features=5000, ngram_range=(1,2))
    MATRIX = VEC.fit_transform(corpus)

@app.on_event("startup")
def _startup():
    load_catalog()

def user_profile_vector(user_or_session: str):
    with pg() as conn, conn.cursor() as cur:
        if user_or_session.startswith("anon:"):
            cur.execute("""
              SELECT product_id, SUM(weight)::int AS w
                FROM public.user_events
               WHERE session_id = %s
               GROUP BY product_id
               ORDER BY w DESC
               LIMIT 50
            """, (user_or_session[5:],))
        else:
            cur.execute("""
              SELECT product_id, SUM(weight)::int AS w
                FROM public.user_events
               WHERE user_id = %s
               GROUP BY product_id
               ORDER BY w DESC
               LIMIT 50
            """, (user_or_session,))
        items = cur.fetchall()

    if not items:
        return None

    id_to_row = {r["id"]: i for i, r in enumerate(CATALOG)}
    vec = np.zeros((1, MATRIX.shape[1]))
    total_w = 0
    for it in items:
        idx = id_to_row.get(it["product_id"])
        if idx is not None:
            vec += it["w"] * MATRIX[idx].toarray()
            total_w += it["w"]
    if total_w == 0:
        return None
    vec /= total_w
    return vec

def top_popular(k=8):
    with pg() as conn, conn.cursor() as cur:
        cur.execute("""
          SELECT p.id, p.name, p.price, COALESCE(pop.score,0) AS score
            FROM public.products p
            LEFT JOIN public.product_popularity_30d pop ON pop.product_id = p.id
           ORDER BY pop.score DESC NULLS LAST, p.id ASC
           LIMIT %s
        """, (k,))
        return cur.fetchall()

@app.get("/recommend")
def recommend(user_id: str, k: int = 8):
    if CATALOG is None:
        load_catalog()

    vec = user_profile_vector(user_id)
    if vec is None:
        return {"recommendations": top_popular(k)}

    sims = linear_kernel(vec, MATRIX).flatten()
    top_idx = sims.argsort()[::-1][:k]
    out = []
    for i in top_idx:
        r = CATALOG[i]
        out.append({"id": r["id"], "name": r["name"], "score": float(sims[i])})
    return {"recommendations": out}
