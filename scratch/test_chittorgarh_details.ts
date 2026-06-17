import { searchChittorgarhIPO, fetchChittorgarhDetails } from "../lib/scrapers/chittorgarh";
import axios from "axios";

async function main() {
  const match = await searchChittorgarhIPO("Liotech Industries");
  console.log("Match:", match);
  if (match) {
    const PARSE_BOT_URL = "https://api.parse.bot/scraper";
    const SCRAPER_ID = process.env.PARSE_BOT_SCRAPER_ID || "dfde1c74-045f-48c7-aa57-718721ee66e4";
    const API_KEY = process.env.PARSE_BOT_API_KEY || "pmx_593bac3a565d331f7f4a29b51a6e452e";

    const response = await axios.get<any>(
      `${PARSE_BOT_URL}/${SCRAPER_ID}/get_ipo_detail`,
      {
        params: { slug: match.urlrewrite_folder_name, ipo_id: String(match.id) },
        headers: {
          "X-API-Key": API_KEY,
        },
        timeout: 15000,
      }
    );
    console.log("Details keys:", Object.keys(response.data.data.details));
    console.log("Details Map:", response.data.data.details);
  }
}

main();
