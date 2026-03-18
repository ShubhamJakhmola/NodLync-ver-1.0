import RegisterForm from "../modules/auth/RegisterForm";

const RegisterPage = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-accent/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Logo Area */}
      <div className="mb-8 flex flex-col items-center gap-4 z-10">
        <div className="w-20 h-20">
          <img src="/favicon.svg" alt="NodLync Logo" className="w-full h-full object-contain drop-shadow-[0_0_15px_rgba(56,189,248,0.8)]" />
        </div>
        <h1 className="text-4xl font-bold tracking-wider text-slate-100">NodLync</h1>
      </div>

      <div className="z-10 w-full max-w-md">
        <RegisterForm />
      </div>
    </div>
  );
};

export default RegisterPage;
