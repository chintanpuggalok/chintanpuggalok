export const scopeReply = "I can only help with Chintan Puggalok's professional profile. Ask about his backend experience, engineering impact, projects, skills, education, résumé, or how to contact him.";

export function isPortfolioFollowUp(message: string): boolean {
  return /^(tell me more|go deeper|explain (that|more)|why|how so|summari[sz]e (that|it)|what about (that|it))\b/i.test(message.trim());
}

export function isPortfolioQuestion(message: string, previousQuestions: string[] = []): boolean {
  const query = message.toLowerCase();
  if (/\b(ignore|override|bypass|reveal|print|show)\b[\s\S]{0,150}\b(prompts?|instructions?|secrets?|api[ -]?key|credentials?)\b/.test(query)) return false;
  if (/\b(ransomware|malware|credential theft|phishing|exploit)\b/.test(query)) return false;
  if (/\b(phone|mobile number|salary|compensation|work authorization)\b/.test(query)) return true; // Answer is an approved refusal; no private context is supplied.
  if (/^(hi|hello|hey|help|who are you|what can you do)[!.?\s]*$/.test(query)) return true;
  // Terms are intentionally tied to the approved catalog. Generic pronouns alone do not establish scope.
  if (/\b(chintan|puggalok|backend|engineer(?:ing)?|experience|career|amazon|intuit|projects?|skills?|stack|java|kotlin|python|kafka|flink|aws|dynamodb|glue|s3|ecs|sqs|kubernetes|docker|jenkins|graphql|spring|dgs|gatling|wavefront|fmea|jfr|gradle|distributed|architecture|reliability|impact|achievements?|metrics?|scale|latency|leadership|mentor|agents?|genai|llms?|education|college|awards?|recognition|resume|résumé|contact|email|hire|roles?|candidates?|opportunit(?:y|ies)|availability|location)\b/.test(query)) return true;
  if (/\b(he|his|him)\b/.test(query) && /\b(work|built|build|role|job|professional|system|technology|technologies|accomplish|achieve|study|employer|company)\b/.test(query)) return true;
  // Follow-ups use previous user questions only, never assistant text as evidence.
  return isPortfolioFollowUp(query) && previousQuestions.some((q) => isPortfolioQuestion(q));
}
