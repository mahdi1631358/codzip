/**
 * Persian/Arabic to English digit mapper
 */
export const toEnglishNumber = (str: string): string => {
  const farsiDigits = [/۰/g, /۱/g, /۲/g, /۳/g, /۴/g, /۵/g, /۶/g, /۷/g, /۸/g, /۹/g];
  const arabicDigits = [/٠/g, /١/g, /٢/g, /٣/g, /٤/g, /٥/g, /٦/g, /٧/g, /٨/g, /٩/g];
  let workingStr = String(str);
  for (let i = 0; i < 10; i++) {
    workingStr = workingStr.replace(farsiDigits[i], i.toString()).replace(arabicDigits[i], i.toString());
  }
  return workingStr;
};

/**
 * Filter out non-digit characters from the phone input during keystroke typing
 */
export const sanitizePhoneInput = (val: string): string => {
  const engVal = toEnglishNumber(val);
  return engVal.replace(/[^\d]/g, '').slice(0, 11);
};

/**
 * Strict Iranian mobile number validator
 * Must be exactly 11 digits, starts with 09 (or equivalent in Persian numbers)
 */
export const validateIranianMobile = (phone: string): { isValid: boolean; error?: string } => {
  const engPhone = toEnglishNumber(phone).trim();
  
  if (/[^\d]/.test(engPhone)) {
    return {
      isValid: false,
      error: 'شماره موبایل نامعتبر است. لطفاً فقط عدد وارد کنید.'
    };
  }

  if (engPhone.length === 0) {
    return {
      isValid: false,
      error: 'وارد کردن شماره موبایل الزامی است.'
    };
  }

  if (!engPhone.startsWith('09')) {
    return {
      isValid: false,
      error: 'شماره همراه معتبر نیست. شماره موبایل ایران باید با 09 آغاز گردد (مانند 09123456789).'
    };
  }

  if (engPhone.length !== 11) {
    return {
      isValid: false,
      error: `شماره موبایل نامعتبر است. طول شماره باید دقیقاً ۱۱ رقم باشد (در حال حاضر ${engPhone.length} رقم است).`
    };
  }

  return { isValid: true };
};

/**
 * URL validator
 * Only allows valid http/https URLs or empty string if optional
 */
export const validateUrl = (url: string, isOptional = true): { isValid: boolean; error?: string } => {
  const trimmedUrl = (url || '').trim();
  if (!trimmedUrl) {
    if (isOptional) {
      return { isValid: true };
    }
    return { isValid: false, error: 'وارد کردن نشانی اینترنتی (لینک) الزامی است.' };
  }

  try {
    const parsed = new URL(trimmedUrl);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      // Check if it has a host/domain like "example.com"
      if (!parsed.hostname || !parsed.hostname.includes('.')) {
        return { isValid: false, error: 'فرمت پیوند اینترنتی نامعتبر است. نمونه صحیح: https://example.com/image.jpg' };
      }
      return { isValid: true };
    }
    return { isValid: false, error: 'پیوند اینترنتی مجاز نیست. پیوند باید با پروتکل امن http یا https آغاز شود.' };
  } catch (e) {
    return { isValid: false, error: 'فرمت پیوند اینترنتی نامعتبر است. نمونه صحیح: https://example.com/image.jpg' };
  }
};
