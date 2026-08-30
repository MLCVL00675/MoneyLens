import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="w-full max-w-md">
      <SignIn
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "shadow-none border-none bg-transparent w-full",
            headerTitle: "font-serif text-3xl",
            headerSubtitle: "text-gray-500",
            formButtonPrimary:
              "bg-forest-500 hover:bg-forest-600 text-white rounded-lg h-11 text-sm font-medium",
            formFieldInput:
              "rounded-lg border-cream-300 bg-white focus:border-forest-500 focus:ring-forest-500 h-11",
            formFieldLabel: "text-sm font-medium text-gray-700",
            footerActionLink: "text-forest-600 hover:text-forest-700 font-medium",
            socialButtonsBlockButton:
              "border-cream-300 hover:bg-cream-100 rounded-lg h-11",
            dividerLine: "bg-cream-300",
            dividerText: "text-gray-400 text-xs",
          },
        }}
      />
    </div>
  );
}
