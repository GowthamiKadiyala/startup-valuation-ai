"use client";
import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { useUser } from "@clerk/nextjs"; // Authentication
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Slider } from "@/components/ui/slider";
import {
  Loader2,
  Save,
  UploadCloud,
  TrendingUp,
  Printer,
  Send,
  MessageSquare,
  Trash2,
  Link as LinkIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useReactToPrint } from "react-to-print";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Dashboard() {
  const { user } = useUser(); // Get Current User

  const [valuations, setValuations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  const [urlInput, setUrlInput] = useState("");

  const [aiData, setAiData] = useState<any>(null);
  const [pdfText, setPdfText] = useState<string>("");
  const [growthAdjustment, setGrowthAdjustment] = useState<number[]>([20]);

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatHistory, setChatHistory] = useState<
    { role: "user" | "ai"; content: string }[]
  >([]);
  const [chatting, setChatting] = useState(false);

  const componentRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: componentRef,
    documentTitle: aiData
      ? `${aiData.company_name}_Investment_Memo`
      : "Valuation_Report",
  });

  // --- FETCH HISTORY ---
  useEffect(() => {
    if (user) fetchValuations();
  }, [user]);

  async function fetchValuations() {
    if (!user) return;
    const { data } = await supabase
      .from("valuations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setValuations(data);
    setLoading(false);
  }

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    const { error } = await supabase.from("valuations").delete().eq("id", id);
    if (!error) setValuations((prev) => prev.filter((item) => item.id !== id));
  };

  const handleAnalyze = async (file?: File) => {
    if (!file && !urlInput) return;

    setUploading(true);
    setAiData(null);
    setChatHistory([]);

    try {
      const formData = new FormData();

      if (file) {
        formData.append("file", file);
      } else {
        formData.append("url", urlInput);
      }

      const res = await fetch("/api/parse-deck", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("Server Error");

      const responseJson = await res.json();
      if (responseJson.status === "error") {
        alert(responseJson.message);
        return;
      }

      setAiData(responseJson.data);
      setPdfText(responseJson.raw_text);

      const detectedGrowth = responseJson.data.growth_rate
        ? responseJson.data.growth_rate * 100
        : 10;
      setGrowthAdjustment([detectedGrowth]);
    } catch (err: any) {
      console.error(err);
      alert("Analysis failed.");
    } finally {
      setUploading(false);
    }
  };

  // --- CHAT AGENT ---
  const handleChat = async () => {
    if (!chatQuestion.trim() || !pdfText) return;
    const newHistory = [
      ...chatHistory,
      { role: "user" as const, content: chatQuestion },
    ];
    setChatHistory(newHistory);
    setChatting(true);
    const currentQ = chatQuestion;
    setChatQuestion("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: currentQ, context: pdfText }),
      });
      const data = await res.json();
      setChatHistory([...newHistory, { role: "ai", content: data.answer }]);
    } catch (err) {
      console.error(err);
    } finally {
      setChatting(false);
    }
  };

  const calculateDynamicValuation = () => {
    if (!aiData) return 0;
    const revenue = aiData.annual_revenue || 0;
    const multiple = 2 + growthAdjustment[0] / 10;
    if (revenue === 0) return 1000000 * multiple;
    return revenue * multiple;
  };

  const handleSave = async () => {
    if (!aiData || !user) return;
    const finalValuation = calculateDynamicValuation();
    const swotText = `💪 ${aiData.strength || "-"} | ⚠️ ${
      aiData.weakness || "-"
    } | 🚀 ${aiData.opportunity || "-"} | 🛡️ ${aiData.threat || "-"}`;
    try {
      const { error } = await supabase.from("valuations").insert([
        {
          user_id: user.id,
          company_name: aiData.company_name || "Unknown",
          valuation_amount: finalValuation,
          swot_analysis: swotText,
        },
      ]);
      if (error) throw error;
      alert("Valuation Saved!");
      fetchValuations();
      setAiData(null);
    } catch (err) {
      console.error(err);
      alert("Error saving");
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}k`;
    return `$${value}`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              Startup Valuation AI
            </h1>
            <p className="text-slate-500">Full Stack AI Agent</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Controls */}
          <Card className="md:col-span-1 shadow-lg h-fit">
            <CardHeader>
              <CardTitle>Project & Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 1. PDF UPLOAD */}
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition cursor-pointer relative">
                <input
                  type="file"
                  accept=".pdf"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  onClick={(e) => (e.currentTarget.value = "")}
                  onChange={(e) => handleAnalyze(e.target.files?.[0])}
                  disabled={uploading}
                />
                {uploading ? (
                  <Loader2 className="h-8 w-8 text-blue-500 animate-spin mb-2" />
                ) : (
                  <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                )}
                <span className="text-sm text-slate-500">
                  {uploading ? "Analyzing..." : "Click to Upload PDF"}
                </span>
              </div>

              {/* 2. URL INPUT */}
              <div className="flex items-center gap-2">
                <div className="h-px bg-slate-200 flex-1"></div>
                <span className="text-xs text-slate-400 font-bold">
                  OR PASTE LINK
                </span>
                <div className="h-px bg-slate-200 flex-1"></div>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="https://example.com/deck.pdf"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => handleAnalyze()}
                  disabled={uploading}
                >
                  <LinkIcon className="h-4 w-4" />
                </Button>
              </div>

              {/* 3. ANALYSIS RESULTS */}
              {aiData && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                  {/* Slider */}
                  <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium flex items-center gap-2">
                        <TrendingUp className="w-4 h-4" /> Growth Rate
                      </span>
                      <span className="text-xl font-bold text-blue-600">
                        {growthAdjustment[0]}%
                      </span>
                    </div>
                    <Slider
                      defaultValue={[20]}
                      value={growthAdjustment}
                      onValueChange={setGrowthAdjustment}
                      max={200}
                      step={5}
                      className="py-4"
                    />
                  </div>

                  {/* SWOT GRID (ADDED BACK) */}
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <div className="p-3 bg-green-50 text-green-700 rounded border border-green-200">
                      <strong>💪 Strength:</strong> {aiData.strength}
                    </div>
                    <div className="p-3 bg-red-50 text-red-700 rounded border border-red-200">
                      <strong>⚠️ Weakness:</strong> {aiData.weakness}
                    </div>
                    <div className="p-3 bg-blue-50 text-blue-700 rounded border border-blue-200">
                      <strong>🚀 Opportunity:</strong> {aiData.opportunity}
                    </div>
                    <div className="p-3 bg-orange-50 text-orange-700 rounded border border-orange-200">
                      <strong>🛡️ Threat:</strong> {aiData.threat}
                    </div>
                  </div>

                  {/* Valuation Box */}
                  <div className="text-center p-4 bg-slate-900 text-white rounded-lg">
                    <p className="text-sm text-slate-400 uppercase tracking-wider">
                      Estimated Valuation
                    </p>
                    <p className="text-3xl font-bold">
                      ${calculateDynamicValuation().toLocaleString()}
                    </p>
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-2">
                    <Button className="flex-1" onClick={handleSave}>
                      <Save className="mr-2 h-4 w-4" /> Save
                    </Button>
                    <Button
                      className="flex-1 bg-white text-slate-900 border hover:bg-slate-50"
                      onClick={() => handlePrint && handlePrint()}
                    >
                      <Printer className="mr-2 h-4 w-4" /> Report
                    </Button>
                  </div>
                </div>
              )}

              {/* 4. CHAT AGENT */}
              {aiData && (
                <div className="mt-8 border-t pt-6">
                  <h3 className="font-bold flex items-center gap-2 mb-3">
                    <MessageSquare className="w-4 h-4" /> Ask the Analyst
                  </h3>
                  <div className="h-40 overflow-y-auto bg-slate-100 rounded-lg p-3 mb-3 space-y-2 text-sm border">
                    {chatHistory.length === 0 && (
                      <p className="text-slate-400 italic text-center mt-10">
                        Ask a question about the deck...
                      </p>
                    )}
                    {chatHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-2 rounded-lg max-w-[90%] ${
                          msg.role === "user"
                            ? "bg-blue-600 text-white ml-auto"
                            : "bg-white border mr-auto"
                        }`}
                      >
                        {msg.content}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="e.g. Who are the competitors?"
                      value={chatQuestion}
                      onChange={(e) => setChatQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleChat()}
                    />
                    <Button
                      size="icon"
                      onClick={handleChat}
                      disabled={chatting}
                    >
                      {chatting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* RIGHT COLUMN: Visuals */}
          <div className="md:col-span-2 space-y-6">
            {/* CHART */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Valuation Landscape</CardTitle>
              </CardHeader>
              <CardContent style={{ height: 300, width: "100%" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={valuations.slice(0, 5).reverse()}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="company_name"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      tickFormatter={formatCurrency}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      formatter={(value: number) => [
                        `$${value.toLocaleString()}`,
                        "Valuation",
                      ]}
                      cursor={{ fill: "transparent" }}
                    />
                    <Bar dataKey="valuation_amount" radius={[4, 4, 0, 0]}>
                      {valuations.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={
                            index === valuations.length - 1
                              ? "#0f172a"
                              : "#94a3b8"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* TABLE */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Recent History</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin text-slate-400" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Company</TableHead>
                        <TableHead>Valuation</TableHead>
                        <TableHead className="hidden md:table-cell">
                          Analysis
                        </TableHead>
                        <TableHead className="text-right">Date</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {valuations.map((val) => (
                        <TableRow key={val.id}>
                          <TableCell className="font-medium">
                            {val.company_name}
                          </TableCell>
                          <TableCell className="text-green-600 font-bold">
                            ${val.valuation_amount?.toLocaleString()}
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-slate-500 max-w-xs truncate">
                            {val.swot_analysis}
                          </TableCell>
                          <TableCell className="text-right text-slate-500 text-xs">
                            {new Date(val.created_at).toLocaleDateString()}
                          </TableCell>

                          {/* DELETE BUTTON */}
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-600 hover:bg-red-50"
                              onClick={() => handleDelete(val.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* --- PRINT COMPONENT (Hidden) --- */}
        <div style={{ display: "none" }}>
          <div ref={componentRef}>
            <style type="text/css" media="print">
              {` @page { size: portrait; margin: 10mm; margin-header: 0; margin-footer: 0; } body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } header, footer, .no-print { display: none !important; } `}
            </style>
            <div className="p-6 font-serif text-slate-900 max-w-2xl mx-auto bg-white min-h-screen">
              {aiData && (
                <div className="space-y-6">
                  <div className="border-b-4 border-slate-900 pb-4 mb-6">
                    <h1 className="text-4xl font-black uppercase tracking-tight text-slate-900">
                      {aiData.company_name}
                    </h1>
                    <div className="flex justify-between items-end mt-2">
                      <p className="text-slate-500 font-sans text-xs font-bold tracking-wider uppercase">
                        Investment Memorandum
                      </p>
                      <p className="text-slate-400 font-sans text-xs">
                        Generated by Valuation AI
                      </p>
                    </div>
                  </div>
                  <section>
                    <h2 className="text-xs font-sans font-bold text-slate-400 uppercase tracking-widest mb-2">
                      01. Executive Summary
                    </h2>
                    <p className="text-base leading-relaxed text-slate-800 text-justify">
                      {aiData.summary || "No summary available."}
                    </p>
                  </section>
                  <section className="py-4 border-y border-slate-200 my-6">
                    <div className="grid grid-cols-2 gap-8">
                      <div>
                        <p className="text-[10px] font-sans font-bold text-slate-400 uppercase mb-1">
                          Annual Revenue
                        </p>
                        <p className="text-3xl font-mono font-medium text-slate-900">
                          ${aiData.annual_revenue?.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-sans font-bold text-slate-400 uppercase mb-1">
                          Growth Rate
                        </p>
                        <p className="text-3xl font-mono font-medium text-blue-600">
                          {growthAdjustment[0]}%
                        </p>
                      </div>
                    </div>
                  </section>
                  <section>
                    <h2 className="text-xs font-sans font-bold text-slate-400 uppercase tracking-widest mb-3">
                      02. Strategic Analysis
                    </h2>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-xs shrink-0">
                          S
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            Strength
                          </p>
                          <p className="text-sm text-slate-700">
                            {aiData.strength}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-xs shrink-0">
                          W
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            Weakness
                          </p>
                          <p className="text-sm text-slate-700">
                            {aiData.weakness}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                          O
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            Opportunity
                          </p>
                          <p className="text-sm text-slate-700">
                            {aiData.opportunity}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-orange-100 flex items-center justify-center text-orange-700 font-bold text-xs shrink-0">
                          T
                        </div>
                        <div>
                          <p className="font-bold text-xs text-slate-900">
                            Threat
                          </p>
                          <p className="text-sm text-slate-700">
                            {aiData.threat}
                          </p>
                        </div>
                      </div>
                    </div>
                  </section>
                  <section className="mt-8 bg-slate-900 text-white p-8 rounded-xl text-center shadow-xl print:shadow-none print:border print:border-slate-900 print:bg-white print:text-black">
                    <p className="text-[10px] font-sans font-bold opacity-70 uppercase tracking-widest mb-2">
                      Final Valuation Estimate
                    </p>
                    <h2 className="text-5xl font-bold tracking-tight mb-2">
                      ${calculateDynamicValuation().toLocaleString()}
                    </h2>
                    <div className="w-12 h-1 bg-blue-500 mx-auto mt-4 mb-4"></div>
                    <p className="text-[9px] opacity-50 max-w-sm mx-auto leading-relaxed">
                      Disclaimer: This valuation is an AI-generated estimate.
                    </p>
                  </section>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
