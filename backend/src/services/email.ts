export const sendVerificationEmail = async (email: string, code: string) => {
  console.log(`[EMAIL] Sending code ${code} to ${email}`);
  return true;
};
