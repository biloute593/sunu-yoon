export const sendVerificationCode = async (phone: string, code: string) => {
  console.log(`[SMS] Sending code ${code} to ${phone}`);
  return true;
};
