import { ChatInterface } from "@/components/chat-interface"

export const metadata = {
  title: "AI Consultation - LinkAble",
  description: "Chat with Able Cordi for personalized assistive technology recommendations",
}

export default function ChatPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ChatInterface />
    </div>
  )
}
