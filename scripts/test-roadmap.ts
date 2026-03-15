import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env") }); 

import { generateRoadmap } from "../lib/adapters/gemini";

async function testAgenticRoadmap() {
  console.log("🚀 Starting Agentic Roadmap Chaos Test...");
  console.log("-----------------------------------------------");

  try {
    const startTime = Date.now();
    const mockPayload = "I'm a 32-year-old single mom with a 4-year-old daughter. We had to leave our apartment because of a severe mold issue that the landlord refused to fix, and my daughter's asthma was getting worse. I have a car, my driver's license, and our health cards, but I only have about $50 to my name. I work part-time at a grocery store in North York, but I can't go to work if I don't have a safe place for my daughter to stay. We are sleeping in my car right now."
    const result = await generateRoadmap(mockPayload);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\nSuccess! (Took ${duration}s)`);
    console.log("-----------------------------------------------");
    
    console.log("\nSITUATION SUMMARY:");
    console.log(result.situationSummary);

    console.log("\nTHIS WEEK (Immediate Steps):");
    if (result.thisWeek_summary) {
      console.log(`   > Summary: ${result.thisWeek_summary}\n`);
    }
    result.thisWeek.forEach((step: any, i: number) => {
      console.log(`${i + 1}. ${step.reason}`);
    });

    console.log("\nTHIS MONTH (Strategic Growth):");
    if (result.thisMonth_summary) {
      console.log(`   > Summary: ${result.thisMonth_summary}\n`);
    }
    result.thisMonth.forEach((step: any, i: number) => {
      console.log(`${i + 1}. ${step.reason}`);
    });

    console.log("\nLONGER TERM (Stability):");
    if (result.longerTerm_summary) {
      console.log(`   > Summary: ${result.longerTerm_summary}\n`);
    }
    result.longerTerm.forEach((step: any, i: number) => {
      console.log(`${i + 1}. ${step.reason}`);
    });

    if (result.notes && result.notes.length > 0) {
      console.log("\nNOTES:");
      result.notes.forEach((note: string) => console.log(`- ${note}`));
    }

    if (result.verificationWarnings && result.verificationWarnings.length > 0) {
      console.log("\nVERIFICATION WARNINGS:");
      result.verificationWarnings.forEach((warning: string) => console.log(`- ${warning}`));
    }

  } catch (error) {
    console.error("❌ Test Failed:", error);
  }
}

testAgenticRoadmap();