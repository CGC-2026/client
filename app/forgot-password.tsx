import { router } from "expo-router";
import { useState } from "react";
import {} from "react-native";
import PasswordResetNewScreen from "@/components/auth/PasswordResetNewScreen";
import PasswordResetCodeScreen from "@/components/auth/PasswordResetCodeScreen";
import PasswordResetEmailScreen from "@/components/auth/PasswordResetEmailScreen";

export type FlowState = "email" | "code" | "password";

export default function ForgotPasswordScreen() {
  const [flowState, setFlowState] = useState<FlowState>("email");
  const [email, setEmail] = useState("");

  const next = (overrideFlowState?: FlowState) => {
    switch (overrideFlowState || flowState) {
      case "email":
        setFlowState("code");
        break;
      case "code":
        setFlowState("password");
        break;
      case "password":
        router.replace("/(tabs)");
        break;
    }
  };

  switch (flowState) {
    case "email":
      return <PasswordResetEmailScreen setEmail={setEmail} next={next} />;
    case "code":
      return <PasswordResetCodeScreen email={email} next={next} />;
    case "password":
      return <PasswordResetNewScreen email={email} next={next} />;
  }
}
