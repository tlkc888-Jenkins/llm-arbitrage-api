#!/usr/bin/env python3
"""
LLM Arbitrage API — Find the cheapest model for your task

Usage:
    uvicorn app:app --host 0.0.0.0 --port 8080
"""

import json
import time
import hashlib
import os
from datetime import datetime, timedelta
from typing import Optional, List
from pathlib import Path

import httpx
from fastapi import FastAPI, HTTPException, Query, Header, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# === Config ===
HELICONE_API = "https://www.helicone.ai/api/llm-costs"
CACHE_FILE = Path(__file__).parent / "pricing_cache.json"
CACHE_TTL_HOURS = 6
API_KEYS_FILE = Path(__file__).parent / "api_keys.json"

# === App Setup ===
app = FastAPI(
    title="LLM Arbitrage API",
    description="Find the cheapest LLM for your task",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === Models ===
class ModelPrice(BaseModel):
    provider: str
    model: str
    input_cost_per_1m: float
    output_cost_per_1m: float
    total_cost_1k_tokens: float  # Assuming 50/50 input/output split
    endpoint: Optional[str] = None
    notes: Optional[str] = None

class CheapestResponse(BaseModel):
    tier: str
    recommendations: List[ModelPrice]
    total_models_analyzed: int
    cached_at: str
    query_time_ms: float

class ClassifyRequest(BaseModel):
    prompt: str
    system: Optional[str] = None

class ClassifyResponse(BaseModel):
    tier: str
    confidence: float
    reasoning: str
    prompt_tokens_estimate: int
    recommended_models: List[str]

# === Tier Definitions ===
TIER_CONFIG = {
    "simple": {
        "max_input_cost": 1.0,  # $/1M tokens
        "max_output_cost": 5.0,
        "description": "Basic Q&A, formatting, extraction",
        "example_models": ["groq/llama", "anthropic/haiku", "mistral/small"],
    },
    "standard": {
        "max_input_cost": 5.0,
        "max_output_cost": 20.0,
        "description": "General chat, summarization, light reasoning",
        "example_models": ["anthropic/sonnet", "openai/gpt-4o-mini"],
    },
    "complex": {
        "max_input_cost": 20.0,
        "max_output_cost": 80.0,
        "description": "Coding, analysis, multi-step reasoning",
        "example_models": ["anthropic/opus", "openai/gpt-4", "google/gemini-pro"],
    },
    "max": {
        "max_input_cost": float("inf"),
        "max_output_cost": float("inf"),
        "description": "Best available, cost no object",
        "example_models": ["anthropic/opus-4", "openai/gpt-4-turbo"],
    },
}

# Provider endpoints (for reference)
PROVIDER_ENDPOINTS = {
    "OPENAI": "https://api.openai.com/v1",
    "ANTHROPIC": "https://api.anthropic.com/v1",
    "GOOGLE": "https://generativelanguage.googleapis.com/v1",
    "GROQ": "https://api.groq.com/openai/v1",
    "TOGETHER": "https://api.together.xyz/v1",
    "MISTRAL": "https://api.mistral.ai/v1",
    "COHERE": "https://api.cohere.ai/v1",
    "FIREWORKS": "https://api.fireworks.ai/inference/v1",
    "PERPLEXITY": "https://api.perplexity.ai",
    "DEEPSEEK": "https://api.deepseek.com/v1",
}

# === Pricing Cache ===
_pricing_cache = None
_cache_loaded_at = None

def load_pricing_cache() -> dict:
    """Load pricing from cache or fetch fresh."""
    global _pricing_cache, _cache_loaded_at
    
    now = datetime.utcnow()
    
    # Check memory cache
    if _pricing_cache and _cache_loaded_at:
        if now - _cache_loaded_at < timedelta(hours=CACHE_TTL_HOURS):
            return _pricing_cache
    
    # Check file cache
    if CACHE_FILE.exists():
        try:
            data = json.loads(CACHE_FILE.read_text())
            cached_at = datetime.fromisoformat(data.get("cached_at", "2000-01-01"))
            if now - cached_at < timedelta(hours=CACHE_TTL_HOURS):
                _pricing_cache = data
                _cache_loaded_at = now
                return _pricing_cache
        except Exception:
            pass
    
    # Fetch fresh
    return refresh_pricing_cache()

def refresh_pricing_cache() -> dict:
    """Fetch fresh pricing from Helicone."""
    global _pricing_cache, _cache_loaded_at
    
    try:
        resp = httpx.get(HELICONE_API, timeout=30)
        resp.raise_for_status()
        raw = resp.json()
        
        # Process and enhance data
        models = []
        for m in raw.get("data", []):
            input_cost = m.get("input_cost_per_1m", 0) or 0
            output_cost = m.get("output_cost_per_1m", 0) or 0
            
            # Skip models with no pricing
            if input_cost == 0 and output_cost == 0:
                continue
            
            # Calculate cost for 1k tokens (assuming 50/50 split)
            total_cost_1k = (input_cost * 0.5 + output_cost * 0.5) / 1000
            
            models.append({
                "provider": m.get("provider", "UNKNOWN"),
                "model": m.get("model", "unknown"),
                "input_cost_per_1m": input_cost,
                "output_cost_per_1m": output_cost,
                "total_cost_1k_tokens": round(total_cost_1k, 8),
            })
        
        # Sort by total cost
        models.sort(key=lambda x: x["total_cost_1k_tokens"])
        
        cache_data = {
            "cached_at": datetime.utcnow().isoformat(),
            "total_models": len(models),
            "models": models,
        }
        
        # Save to file
        CACHE_FILE.write_text(json.dumps(cache_data, indent=2))
        
        _pricing_cache = cache_data
        _cache_loaded_at = datetime.utcnow()
        
        return cache_data
        
    except Exception as e:
        # If we have stale cache, use it
        if _pricing_cache:
            return _pricing_cache
        raise HTTPException(500, f"Failed to fetch pricing: {e}")

def filter_models_by_tier(models: list, tier: str) -> list:
    """Filter models that fit within tier cost limits."""
    config = TIER_CONFIG.get(tier, TIER_CONFIG["standard"])
    
    filtered = []
    for m in models:
        if (m["input_cost_per_1m"] <= config["max_input_cost"] and 
            m["output_cost_per_1m"] <= config["max_output_cost"]):
            filtered.append(m)
    
    return filtered

def estimate_tokens(text: str) -> int:
    """Rough token estimate (4 chars per token average)."""
    return len(text) // 4

def classify_prompt(prompt: str, system: str = None) -> tuple[str, float, str]:
    """
    Classify a prompt into a tier.
    Returns (tier, confidence, reasoning).
    """
    full_text = f"{system or ''} {prompt}".lower()
    tokens = estimate_tokens(full_text)
    
    # Heuristic classification
    simple_keywords = ["what is", "who is", "list", "format", "extract", "convert", "translate simple"]
    complex_keywords = ["analyze", "debug", "write code", "implement", "compare and contrast", 
                       "step by step", "reasoning", "prove", "derive", "optimize"]
    
    has_simple = any(kw in full_text for kw in simple_keywords)
    has_complex = any(kw in full_text for kw in complex_keywords)
    
    # Decision logic
    if tokens < 200 and has_simple and not has_complex:
        return "simple", 0.85, "Short prompt with simple task indicators"
    elif tokens > 2000 or has_complex:
        return "complex", 0.75, "Long context or complex task indicators detected"
    elif has_simple:
        return "simple", 0.70, "Simple task keywords detected"
    else:
        return "standard", 0.65, "Default classification for general tasks"

# === API Endpoints ===

@app.get("/")
def root():
    """API info."""
    return {
        "name": "LLM Arbitrage API",
        "version": "0.1.0",
        "description": "Find the cheapest LLM for your task",
        "endpoints": {
            "/v1/cheapest": "Get cheapest models for a tier",
            "/v1/classify": "Classify a prompt into a tier",
            "/v1/models": "List all models with pricing",
            "/v1/tiers": "List available tiers",
            "/health": "Health check",
        },
        "docs": "/docs",
    }

@app.get("/health")
def health():
    """Health check."""
    cache = load_pricing_cache()
    return {
        "status": "ok",
        "models_cached": cache.get("total_models", 0),
        "cache_age_hours": round(
            (datetime.utcnow() - datetime.fromisoformat(cache.get("cached_at", datetime.utcnow().isoformat()))).total_seconds() / 3600,
            2
        ),
    }

@app.get("/v1/tiers")
def list_tiers():
    """List available tiers and their cost limits."""
    return {
        "tiers": {
            name: {
                "max_input_cost_per_1m": cfg["max_input_cost"],
                "max_output_cost_per_1m": cfg["max_output_cost"],
                "description": cfg["description"],
                "example_models": cfg["example_models"],
            }
            for name, cfg in TIER_CONFIG.items()
        }
    }

@app.get("/v1/cheapest", response_model=CheapestResponse)
def get_cheapest(
    tier: str = Query("standard", description="Task tier: simple, standard, complex, max"),
    limit: int = Query(10, ge=1, le=50, description="Number of models to return"),
    provider: Optional[str] = Query(None, description="Filter by provider (e.g., OPENAI, ANTHROPIC)"),
    max_input_cost: Optional[float] = Query(None, description="Override max input cost per 1M tokens"),
    max_output_cost: Optional[float] = Query(None, description="Override max output cost per 1M tokens"),
):
    """Get cheapest models for a given tier."""
    start = time.time()
    
    if tier not in TIER_CONFIG:
        raise HTTPException(400, f"Invalid tier. Choose from: {list(TIER_CONFIG.keys())}")
    
    cache = load_pricing_cache()
    models = cache.get("models", [])
    
    # Apply tier filter
    filtered = filter_models_by_tier(models, tier)
    
    # Apply custom cost overrides
    if max_input_cost is not None or max_output_cost is not None:
        max_in = max_input_cost if max_input_cost is not None else float("inf")
        max_out = max_output_cost if max_output_cost is not None else float("inf")
        filtered = [m for m in filtered if m["input_cost_per_1m"] <= max_in and m["output_cost_per_1m"] <= max_out]
    
    # Apply provider filter
    if provider:
        filtered = [m for m in filtered if m["provider"].upper() == provider.upper()]
    
    # Take top N
    top_models = filtered[:limit]
    
    # Enhance with endpoints
    recommendations = []
    for m in top_models:
        endpoint = PROVIDER_ENDPOINTS.get(m["provider"])
        recommendations.append(ModelPrice(
            provider=m["provider"],
            model=m["model"],
            input_cost_per_1m=m["input_cost_per_1m"],
            output_cost_per_1m=m["output_cost_per_1m"],
            total_cost_1k_tokens=m["total_cost_1k_tokens"],
            endpoint=endpoint,
        ))
    
    return CheapestResponse(
        tier=tier,
        recommendations=recommendations,
        total_models_analyzed=len(models),
        cached_at=cache.get("cached_at", ""),
        query_time_ms=round((time.time() - start) * 1000, 2),
    )

@app.post("/v1/classify", response_model=ClassifyResponse)
def classify_task(req: ClassifyRequest):
    """Classify a prompt into a tier and recommend models."""
    tier, confidence, reasoning = classify_prompt(req.prompt, req.system)
    tokens = estimate_tokens(f"{req.system or ''} {req.prompt}")
    
    # Get top 3 models for this tier
    cache = load_pricing_cache()
    models = filter_models_by_tier(cache.get("models", []), tier)[:3]
    recommended = [f"{m['provider'].lower()}/{m['model']}" for m in models]
    
    return ClassifyResponse(
        tier=tier,
        confidence=confidence,
        reasoning=reasoning,
        prompt_tokens_estimate=tokens,
        recommended_models=recommended,
    )

@app.get("/v1/models")
def list_models(
    provider: Optional[str] = Query(None, description="Filter by provider"),
    search: Optional[str] = Query(None, description="Search model names"),
    limit: int = Query(100, ge=1, le=500),
):
    """List all models with pricing."""
    cache = load_pricing_cache()
    models = cache.get("models", [])
    
    if provider:
        models = [m for m in models if m["provider"].upper() == provider.upper()]
    
    if search:
        search_lower = search.lower()
        models = [m for m in models if search_lower in m["model"].lower()]
    
    return {
        "total": len(models),
        "showing": min(limit, len(models)),
        "models": models[:limit],
    }

@app.post("/v1/refresh")
def force_refresh():
    """Force refresh the pricing cache."""
    cache = refresh_pricing_cache()
    return {
        "status": "refreshed",
        "total_models": cache.get("total_models", 0),
        "cached_at": cache.get("cached_at"),
    }

# === Main ===
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
