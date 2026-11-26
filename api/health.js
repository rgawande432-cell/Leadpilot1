export default function handler(req, res) {
  res.status(200).json({
    success: true,
    app: "LeadPilot AI",
    service: "Backend API",
    status: "online",
    timestamp: new Date().toISOString()
  });
}
