import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export function useSignupLogic() {
  const { signUp } = useAuth();
  const [, setLocation] = useLocation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error("Please accept the terms and conditions.");
      return;
    }
    
    setLoading(true);
    try {
      await signUp(email, password, displayName);
      setLocation("/onboarding");
    } catch (err: any) {
      toast.error(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  }

  return {
    displayName,
    setDisplayName,
    email,
    setEmail,
    password,
    setPassword,
    loading,
    handleSubmit,
    acceptedTerms,
    setAcceptedTerms,
    hasScrolledToBottom,
    setHasScrolledToBottom,
    isTermsModalOpen,
    setIsTermsModalOpen,
  };
}
