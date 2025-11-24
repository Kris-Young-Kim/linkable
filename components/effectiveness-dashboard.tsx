"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { Sparkles, Star, TrendingUp, Award } from "lucide-react"

// K-IPPA Score data (Before and After)
const kIppaData = [
  { category: "Before", difficulty: 4, fill: "#94a3b8" },
  { category: "After", difficulty: 1, fill: "#0F766E" },
]

const chartConfig = {
  difficulty: {
    label: "Difficulty Level",
    color: "#0F766E",
  },
}

export function EffectivenessDashboard() {
  const [rating, setRating] = useState(0)
  const [hoveredStar, setHoveredStar] = useState(0)
  const [submitted, setSubmitted] = useState(false)

  const improvementScore = 3.5
  const beforeScore = 4
  const afterScore = 1
  const improvementPercentage = ((beforeScore - afterScore) / beforeScore) * 100

  const handleSubmitReview = () => {
    setSubmitted(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">Your Progress Report</h1>
        <p className="text-muted-foreground text-lg">See how assistive technology improved your daily life</p>
      </div>

      {/* Improvement Score - Hero Card */}
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-teal-50 to-emerald-50 dark:from-teal-950/20 dark:to-emerald-950/20">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Award className="size-16 text-primary animate-pulse" />
              <Sparkles className="size-6 text-coral-500 absolute -top-2 -right-2 animate-bounce" />
            </div>
            <div>
              <div className="text-6xl md:text-7xl font-bold text-primary mb-2">+{improvementScore}</div>
              <div className="text-2xl md:text-3xl font-semibold text-foreground flex items-center justify-center gap-2">
                <TrendingUp className="size-8 text-emerald-600" />
                Improvement Score!
              </div>
              <p className="text-muted-foreground text-lg mt-2">
                {improvementPercentage.toFixed(0)}% reduction in difficulty
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">K-IPPA Score Comparison</CardTitle>
          <CardDescription className="text-base">
            Your difficulty level before and after using assistive technology
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={kIppaData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                <XAxis dataKey="category" tick={{ fontSize: 16, fontWeight: 600 }} axisLine={{ stroke: "#94a3b8" }} />
                <YAxis
                  label={{
                    value: "Difficulty Level (1-5)",
                    angle: -90,
                    position: "insideLeft",
                    style: { fontSize: 14 },
                  }}
                  domain={[0, 5]}
                  ticks={[0, 1, 2, 3, 4, 5]}
                  tick={{ fontSize: 14 }}
                  axisLine={{ stroke: "#94a3b8" }}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="difficulty" radius={[8, 8, 0, 0]} barSize={80}>
                  {kIppaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>

          {/* Progress Bars */}
          <div className="mt-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-muted-foreground">Before: High Difficulty</span>
                <span className="text-base font-bold text-slate-600 dark:text-slate-400">4/5</span>
              </div>
              <Progress value={80} className="h-3 bg-slate-200 dark:bg-slate-800" />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-base font-medium text-primary">After: Low Difficulty</span>
                <span className="text-base font-bold text-primary">1/5</span>
              </div>
              <Progress
                value={20}
                className="h-3 [&>div]:bg-gradient-to-r [&>div]:from-teal-500 [&>div]:to-emerald-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">How helpful was this product?</CardTitle>
          <CardDescription className="text-base">Your feedback helps us improve our recommendations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!submitted ? (
            <>
              {/* Star Rating */}
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredStar(star)}
                    onMouseLeave={() => setHoveredStar(0)}
                    className="group transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full p-2"
                    aria-label={`Rate ${star} out of 5 stars`}
                    style={{ minWidth: "44px", minHeight: "44px" }}
                  >
                    <Star
                      className={`size-12 transition-colors ${
                        star <= (hoveredStar || rating)
                          ? "fill-amber-400 text-amber-400"
                          : "fill-none text-muted-foreground"
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Rating Label */}
              <div className="text-center">
                {rating > 0 && (
                  <p className="text-lg font-medium text-foreground animate-in fade-in">
                    {rating === 5 && "🎉 Excellent! So glad it helped!"}
                    {rating === 4 && "😊 Great! We are happy to hear that!"}
                    {rating === 3 && "👍 Good! We will keep improving!"}
                    {rating === 2 && "😐 Thank you for your feedback"}
                    {rating === 1 && "😔 We will do better"}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-center">
                <Button
                  size="lg"
                  onClick={handleSubmitReview}
                  disabled={rating === 0}
                  className="min-h-[44px] px-8 text-base font-semibold"
                  aria-label="Submit your review"
                >
                  Submit Review
                </Button>
              </div>
            </>
          ) : (
            <div className="text-center space-y-4 py-8">
              <div className="inline-flex items-center justify-center size-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                <Sparkles className="size-8 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-foreground mb-2">Thank you for your feedback!</h3>
                <p className="text-muted-foreground text-base">
                  Your {rating}-star rating helps us improve our services
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
