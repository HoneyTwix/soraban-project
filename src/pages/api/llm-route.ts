import type { NextApiRequest, NextApiResponse } from "next";

type RequestBody = {
  transaction_date: string;
  transaction_description: string;
  transaction_amount: string;
  category: {
    name: string;
    description?: string;
  };
  ai_prompt?: string;
};

type ResponseBody = {
  decision: "apply" | "do not apply";
};

// Dummy evaluation logic - in a real implementation, this would use an LLM
function evaluateTransaction(body: RequestBody): ResponseBody {
  // Simple dummy logic - in reality, this would be replaced with actual LLM evaluation
  const { transaction_description, category, ai_prompt } = body;
  
  // Example dummy logic:
  // 1. If the category name appears in the description, apply
  // 2. If the AI prompt contains keywords that match the description, apply
  // 3. Otherwise, don't apply
  
  const categoryInDescription = transaction_description.toLowerCase().includes(category.name.toLowerCase());
  const promptMatches = ai_prompt 
    ? ai_prompt.toLowerCase().split(" ").some(word => 
        transaction_description.toLowerCase().includes(word)
      )
    : false;

  return {
    decision: (categoryInDescription || promptMatches) ? "apply" : "do not apply"
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ResponseBody>
) {
  if (req.method !== "POST") {
    return res.status(405).end();
  }

  try {
    const body = req.body as RequestBody;
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const result = evaluateTransaction(body);
    return res.status(200).json(result);
  } catch (error) {
    console.error("Error in LLM route:", error);
    return res.status(500).json({ decision: "do not apply" });
  }
} 