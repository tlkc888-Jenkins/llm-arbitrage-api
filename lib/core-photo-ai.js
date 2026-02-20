/**
 * Core Photo AI - Drill core visual assessment
 * 
 * Upload core photo → AI lithology/alteration/mineralization assessment
 * Future: assay feedback loop for calibration
 * 
 * Disclaimer: Requires Competent Person validation for JORC 2012 compliance
 */

const Anthropic = require('@anthropic-ai/sdk');

const SYSTEM_PROMPT = `You are an expert exploration geologist with 20+ years experience logging drill core across multiple deposit types (porphyry Cu-Au, orogenic Au, VMS, IOCG, skarn).

Analyze the drill core photo and provide a structured assessment. Be specific about what you observe vs what you infer. Note confidence levels.

IMPORTANT DISCLAIMERS TO INCLUDE:
- This is an AI-assisted preliminary assessment only
- Requires validation by a Competent Person for JORC 2012 / NI 43-101 compliance
- Visual estimates of sulphide % have significant uncertainty
- Recommend assay confirmation for any intervals of interest`;

const ANALYSIS_PROMPT = `Analyze this drill core photo and provide a structured geological assessment.

Return ONLY valid JSON (no markdown, no explanation) with this structure:
{
  "lithology": {
    "rock_type": "string - primary rock type",
    "texture": "string - texture description",
    "grain_size": "fine/medium/coarse",
    "primary_minerals": ["array of visible primary minerals"],
    "confidence": "low/medium/high"
  },
  "alteration": {
    "style": "potassic/phyllic/argillic/propylitic/silicic/none/multiple",
    "intensity": "weak/moderate/strong/intense",
    "assemblage": ["array of alteration minerals"],
    "zonation_notes": "string - any zonation observations",
    "confidence": "low/medium/high"
  },
  "mineralization": {
    "sulphides": [
      {
        "mineral": "string - mineral name",
        "estimated_pct": "number 0-100",
        "style": "disseminated/veinlet/massive/fracture-fill/replacement",
        "notes": "string"
      }
    ],
    "oxides": [
      {
        "mineral": "string",
        "estimated_pct": "number",
        "notes": "string"
      }
    ],
    "total_sulphide_pct": "number",
    "confidence": "low/medium/high"
  },
  "structures": {
    "veining": {
      "present": true/false,
      "types": ["A-vein/B-vein/D-vein/quartz/carbonate/sulphide"],
      "intensity_pct": "number 0-100",
      "notes": "string"
    },
    "fracturing": "none/weak/moderate/intense",
    "brecciation": true/false,
    "foliation": true/false
  },
  "assessment": {
    "prospectivity": "low/moderate/high/very-high",
    "sample_priority": "routine/elevated/high/critical",
    "deposit_model_affinity": ["array of possible deposit types"],
    "key_observations": ["array of 2-4 key points"],
    "recommended_analyses": ["assay suite recommendations"],
    "confidence": "low/medium/high"
  },
  "disclaimer": "AI-assisted preliminary assessment. Requires CP validation for JORC 2012 compliance."
}`;

class CorePhotoAI {
  constructor(apiKey) {
    this.client = new Anthropic({ apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }

  /**
   * Analyze a drill core photo
   * @param {string} imageUrl - URL of the core photo
   * @param {object} metadata - Optional metadata (hole_id, from_m, to_m, project, etc)
   * @returns {object} Structured geological assessment
   */
  async analyzeCore(imageUrl, metadata = {}) {
    const startTime = Date.now();

    try {
      // Fetch image and convert to base64
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      const base64Image = Buffer.from(imageBuffer).toString('base64');
      const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
      
      // Build context from metadata
      let contextNote = '';
      if (metadata.project) contextNote += `Project: ${metadata.project}. `;
      if (metadata.hole_id) contextNote += `Hole ID: ${metadata.hole_id}. `;
      if (metadata.from_m !== undefined && metadata.to_m !== undefined) {
        contextNote += `Depth: ${metadata.from_m}m - ${metadata.to_m}m. `;
      }
      if (metadata.target_commodity) contextNote += `Target commodity: ${metadata.target_commodity}. `;
      if (metadata.region) contextNote += `Region: ${metadata.region}. `;

      const userPrompt = contextNote 
        ? `${contextNote}\n\n${ANALYSIS_PROMPT}`
        : ANALYSIS_PROMPT;

      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType,
                  data: base64Image
                }
              },
              {
                type: 'text',
                text: userPrompt
              }
            ]
          }
        ]
      });

      const responseText = response.content[0].text;
      
      // Parse JSON response
      let assessment;
      try {
        assessment = JSON.parse(responseText);
      } catch (parseError) {
        // Try to extract JSON from response
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          assessment = JSON.parse(jsonMatch[0]);
        } else {
          throw new Error('Failed to parse AI response as JSON');
        }
      }

      return {
        success: true,
        assessment,
        metadata: {
          ...metadata,
          analyzed_at: new Date().toISOString(),
          processing_ms: Date.now() - startTime,
          model: 'claude-sonnet-4-20250514',
          image_url: imageUrl
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        metadata: {
          ...metadata,
          analyzed_at: new Date().toISOString(),
          processing_ms: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Compare AI prediction to actual assay results (for calibration)
   * @param {object} prediction - Previous AI assessment
   * @param {object} assayResults - Actual assay results
   * @returns {object} Calibration comparison
   */
  compareToAssay(prediction, assayResults) {
    // Future: store these pairs for model calibration
    const comparison = {
      predicted_sulphide_pct: prediction.assessment?.mineralization?.total_sulphide_pct,
      predicted_prospectivity: prediction.assessment?.assessment?.prospectivity,
      actual_results: assayResults,
      timestamp: new Date().toISOString()
    };

    // Calculate simple accuracy metrics if Cu/Au provided
    if (assayResults.cu_pct !== undefined && prediction.assessment?.mineralization?.sulphides) {
      const predictedCu = prediction.assessment.mineralization.sulphides
        .find(s => s.mineral.toLowerCase().includes('chalcopyrite'));
      if (predictedCu) {
        // Rough conversion: chalcopyrite is ~34.5% Cu
        const impliedCu = (predictedCu.estimated_pct || 0) * 0.345;
        comparison.cu_prediction_implied = impliedCu;
        comparison.cu_actual = assayResults.cu_pct;
        comparison.cu_error_pct = Math.abs(impliedCu - assayResults.cu_pct);
      }
    }

    return comparison;
  }
}

module.exports = { CorePhotoAI };
