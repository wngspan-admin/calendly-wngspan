import type { NextApiRequest, NextApiResponse } from "next";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  return res.status(404).json({ error: "PayPal integration is not available in this checkout" });
}

export const config = {
  api: {
    bodyParser: false,
  },
};
