/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { createPortal } from 'react-dom';
import { ErrorCode, SparePart, CommonProblem } from '../types';
import { Search, Flame, ShieldAlert, CheckCircle, Eye, Wrench, AlertTriangle, Cpu, Tag, Settings, Play, Check, ChevronLeft, Mic, MicOff, Video, ExternalLink, X, ShoppingBag, CreditCard, ShieldCheck } from 'lucide-react';
import { APPLIANCE_BRANDS, APPLIANCE_CATEGORIES } from '../data';

const brandAliases: { [key: string]: string[] } = {
  'butan': ['بوتان', 'بتاح', 'بوتن', 'کالدا', 'ونزیا', 'اپتیما', 'بنر'],
  'bosch': ['بوش', 'بش'],
  'baxi': ['باکسی', 'بکسی'],
  'beko': ['بکو', 'بکوچ', 'بکوج'],
  'arcelik': ['آرچلیک', 'ارچلیک', 'ارچیلک'],
  'immergas': ['ایمرگاس', 'ایمرگاز', 'ایمرگس'],
  'isatis': ['ایساتیس', 'ایستیس', 'ایساتس'],
  'italterm': ['ایتالترم', 'ایتال ترم'],
  'iranradiator': ['ایران رادیاتور', 'ایران‌رادیاتور', 'ایران رادیاتور لورچ', 'ل کارز', 'ایران رادیاتر', 'ایرانرادیاتور', 'رادیاتور'],
  'iranradiater': ['ایران رادیاتور', 'ایران‌رادیاتور', 'ایران رادیاتر', 'ایرانرادیاتور', 'رادیاتور'],
  'demrad': ['دمیراد', 'دم راد'],
  'tachi': ['تاچی', 'تاچ'],
  'polar': ['پلار', 'بلار'],
  'biasi': ['بیاسی'],
  'valtro': ['والترو', 'والتر'],
  'alzan': ['آلزان', 'الزان'],
  'ariston': ['آریستون', 'اریستون'],
  'baykan': ['بایکن', 'بایکان'],
  'butane': ['بوتان'],
  'westel': ['وستل'],
  'gplus': ['جی پلاس', 'جی‌پلاس'],
  'samsung': ['سامسونگ'],
  'lg': ['ال جی', 'الجی', 'ال‌جی'],
  'daewoo': ['دوو'],
};

const categoryAliases: { [key: string]: string[] } = {
  'پکیج': ['پکیج', 'پیج', 'پکیجها', 'پکیجهای', 'گرمایشی', 'شوفاژ', 'پکیج_دیواری', 'دیواری'],
  'کولر گازی': ['کولر', 'کولرگازی', 'کولر گازی', 'کولرها', 'اسپلیت', 'اسپیلت', 'کولر_گازی', 'کولرگری', 'گری'],
  'لباسشویی': ['لباسشویی', 'ماشین لباسشویی', 'لباس شویی'],
  'یخچال': ['یخچال', 'فریزر', 'یخچال فریزر', 'ساید'],
};

const matchesToken = (fieldValue: string, token: string): boolean => {
  const fLower = fieldValue.toLowerCase().trim();
  const tLower = token.toLowerCase().trim();
  
  if (!fLower || !tLower) return false;

  // 1. Direct contains check (forward or backward)
  if (fLower.includes(tLower) || tLower.includes(fLower)) {
    return true;
  }

  // 2. Brand alias lookup
  for (const [english, persianList] of Object.entries(brandAliases)) {
    const fieldMatchesBrand = fLower.includes(english) || english.includes(fLower);
    const tokenMatchesPersian = persianList.some(p => tLower.includes(p.toLowerCase()) || p.toLowerCase().includes(tLower));
    
    if (fieldMatchesBrand && tokenMatchesPersian) {
      return true;
    }
    
    const fieldMatchesPersian = persianList.some(p => fLower.includes(p.toLowerCase()) || p.toLowerCase().includes(fLower));
    const tokenMatchesBrand = tLower.includes(english) || english.includes(tLower);
    
    if (fieldMatchesPersian && tokenMatchesBrand) {
      return true;
    }
  }

  // 3. Category alias lookup
  for (const [canonical, aliases] of Object.entries(categoryAliases)) {
    const fieldMatchesCanonical = fLower.includes(canonical.toLowerCase()) || canonical.toLowerCase().includes(fLower);
    const tokenMatchesAlias = aliases.some(a => tLower.includes(a.toLowerCase()) || a.toLowerCase().includes(tLower));
    
    if (fieldMatchesCanonical && tokenMatchesAlias) {
      return true;
    }

    const fieldMatchesAlias = aliases.some(a => fLower.includes(a.toLowerCase()) || a.toLowerCase().includes(fLower));
    const tokenMatchesCanonical = tLower.includes(canonical.toLowerCase()) || canonical.toLowerCase().includes(tLower);

    if (fieldMatchesAlias && tokenMatchesCanonical) {
      return true;
    }
  }

  return false;
};

const normalizeCode = (code: string): string => {
  return code.toLowerCase().trim().replace(/[-_\s.]/g, '');
};

const isErrorCodeToken = (token: string): boolean => {
  const normalized = normalizeCode(token);
  return /^[a-z]{1,3}\d+$/i.test(normalized) || /^\d+$/i.test(normalized);
};

const matchesTokenPrecise = (fieldValue: string, token: string, isCodeField: boolean): boolean => {
  const fLower = fieldValue.toLowerCase().trim();
  const tLower = token.toLowerCase().trim();
  
  if (!fLower || !tLower) return false;

  // 1. If it's the exact 'code' field of an ErrorCode, we want exact match of normalized codes
  if (isCodeField) {
    return normalizeCode(fieldValue) === normalizeCode(token);
  }

  // 2. If the token looks like an error code (e.g. "E1", "F01", "12"), we must match it as an exact word,
  // preventing "E1" from matching inside "E11" or "E01".
  if (isErrorCodeToken(token)) {
    const tNorm = normalizeCode(token);
    
    // Exact word boundary check for alphanumeric tokens
    let index = fLower.indexOf(tNorm);
    if (index === -1) {
      index = fLower.indexOf(tLower);
    }
    
    while (index !== -1) {
      const matchLength = fLower.substring(index).startsWith(tLower) ? tLower.length : tNorm.length;
      const prevChar = index > 0 ? fLower.charAt(index - 1) : '';
      const nextChar = index + matchLength < fLower.length ? fLower.charAt(index + matchLength) : '';
      
      const isAlphaNum = (char: string) => /^[a-z0-9.\-_]$/i.test(char);
      
      if (!isAlphaNum(prevChar) && !isAlphaNum(nextChar)) {
        return true;
      }
      
      index = fLower.indexOf(tNorm, index + 1);
    }
    return false;
  }

  // 3. Fallback to general matchesToken alias lookup / partial contains
  return matchesToken(fieldValue, token);
};

interface ErrorSearchProps {
  errorCodes: ErrorCode[];
  commonProblems?: CommonProblem[];
  spareParts: SparePart[];
  onSelectError: (error: ErrorCode) => void;
  selectedError: ErrorCode | null;
  onBookRepair: (error: ErrorCode) => void;
  onFilterParts: (category: string, brand: string) => void;
  onSearchActiveChange?: (active: boolean) => void;
  currentUser?: any;
  onGoToDashboard?: () => void;
  onPurchase?: (part: SparePart, address: string, buyerName?: string, buyerPhone?: string) => void;
}

export const ErrorSearch: React.FC<ErrorSearchProps> = ({
  errorCodes,
  commonProblems = [],
  spareParts,
  onSelectError: originalOnSelectError,
  selectedError,
  onBookRepair,
  onFilterParts,
  onSearchActiveChange,
  currentUser,
  onGoToDashboard,
  onPurchase,
}) => {
  const isPremium = currentUser?.subscription?.is_premium || currentUser?.role === 'admin' || currentUser?.is_super_admin;

  const [viewedErrorCodes, setViewedErrorCodes] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('free_viewed_error_codes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [viewedProblems, setViewedProblems] = React.useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('free_viewed_problems');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showFreeLimitModal, setShowFreeLimitModal] = React.useState(false);
  const [freeLimitReachedType, setFreeLimitReachedType] = React.useState<'error_code' | 'common_problem'>('error_code');

  React.useEffect(() => {
    if (isPremium) {
      localStorage.setItem('had_premium_active', 'true');
    } else {
      const hadPremium = localStorage.getItem('had_premium_active') === 'true';
      if (hadPremium) {
        localStorage.removeItem('free_viewed_error_codes');
        localStorage.removeItem('free_viewed_problems');
        setViewedErrorCodes([]);
        setViewedProblems([]);
        localStorage.setItem('had_premium_active', 'false');
      }
    }
  }, [isPremium]);

  const onSelectError = (err: ErrorCode) => {
    if (!err) {
      originalOnSelectError(null as any);
      return;
    }

    if (isPremium) {
      originalOnSelectError(err);
      return;
    }

    const isAlreadyViewed = viewedErrorCodes.includes(err.id);
    if (!isAlreadyViewed) {
      if (viewedErrorCodes.length >= 3) {
        setFreeLimitReachedType('error_code');
        setShowFreeLimitModal(true);
        return;
      } else {
        const updated = [...viewedErrorCodes, err.id];
        setViewedErrorCodes(updated);
        localStorage.setItem('free_viewed_error_codes', JSON.stringify(updated));
      }
    }
    originalOnSelectError(err);
  };

  // Core interactive states
  const [query, setQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedBrand, setSelectedBrand] = React.useState('');
  const [selectedModel, setSelectedModel] = React.useState('');
  const [categoryInput, setCategoryInput] = React.useState('');
  const [brandInput, setBrandInput] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [showModelSuggestions, setShowModelSuggestions] = React.useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = React.useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = React.useState(false);
  const [isListening, setIsListening] = React.useState(false);
  const [showAllCodes, setShowAllCodes] = React.useState(false);
  const [activeVideoUrl, setActiveVideoUrl] = React.useState<string | null>(null);
  const [showPremiumAlert, setShowPremiumAlert] = React.useState<'none' | 'login' | 'premium'>('none');

  // Checkout States for bottom products list
  const [activeCheckoutPartOfBottom, setActiveCheckoutPartOfBottom] = React.useState<SparePart | null>(null);
  const [bottomCheckoutStep, setBottomCheckoutStep] = React.useState<'form' | 'success'>('form');
  const [bottomBuyerName, setBottomBuyerName] = React.useState('');
  const [bottomBuyerPhone, setBottomBuyerPhone] = React.useState('');
  const [bottomBuyerAddress, setBottomBuyerAddress] = React.useState('');
  const [bottomCardNumber, setBottomCardNumber] = React.useState('');

  // Keep typeable inputs in sync with actual selected values
  React.useEffect(() => {
    setCategoryInput(selectedCategory);
  }, [selectedCategory]);

  React.useEffect(() => {
    setBrandInput(selectedBrand);
  }, [selectedBrand]);

  React.useEffect(() => {
    if (onSearchActiveChange) {
      onSearchActiveChange(!!selectedError);
    }
  }, [selectedError, onSearchActiveChange]);

  // Click outside to close custom dropdown panels cleanly
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target) return;

      const mainSearchCont = document.getElementById('main-search-container');
      const catCont = document.getElementById('category-dropdown-container');
      const brandCont = document.getElementById('brand-dropdown-container');
      const modelCont = document.getElementById('model-dropdown-container');

      if (mainSearchCont && !mainSearchCont.contains(target)) {
        setShowSuggestions(false);
      }
      if (catCont && !catCont.contains(target)) {
        setShowCategoryDropdown(false);
      }
      if (brandCont && !brandCont.contains(target)) {
        setShowBrandDropdown(false);
      }
      if (modelCont && !modelCont.contains(target)) {
        setShowModelSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
    };
  }, []);

  // Dynamic base lists loaded from localStorage/data fallback
  const brands = React.useMemo(() => {
    const saved = localStorage.getItem('ir_brands');
    return saved ? (JSON.parse(saved) as string[]) : APPLIANCE_BRANDS;
  }, []);

  const categories = React.useMemo(() => {
    const saved = localStorage.getItem('ir_categories');
    return saved ? (JSON.parse(saved) as string[]) : APPLIANCE_CATEGORIES;
  }, []);

  // AI Interactive states
  const [aiLoading, setAiLoading] = React.useState(false);
  const [aiResult, setAiResult] = React.useState<{
    recommendedPartIds: string[];
    aiReason: string;
    additionalFittings?: string[];
  } | null>(null);
  const [aiError, setAiError] = React.useState('');

  const [aiDiagnoseResult, setAiDiagnoseResult] = React.useState<{
    causes: string[];
    likely_part: string;
    risk_level: string;
    diy_possible: string;
    repair_time: string;
    technician_required: boolean;
    detailed_analysis: string;
  } | null>(null);
  const [aiDiagnoseLoading, setAiDiagnoseLoading] = React.useState(false);
  const [aiDiagnoseError, setAiDiagnoseError] = React.useState('');

  // Quick buttons
  const quickCodes = ['E01', 'E02', '70 80', 'E51', 'IE', 'OE', '5E'];

  // Voice Search Handler
  const handleVoiceSearch = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('مرورگر شما از جستجوی صوتی پشتیبانی نمی‌کند. لطفاً از گوگل کروم یا فایرفاکس استفاده کنید.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'fa-IR';

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      // Clean query and set it
      setQuery(transcript);
      setShowSuggestions(true);
      if (selectedError) onSelectError(null as any);
      
      // Reset filters to search globally across all categories, brands, and models
      setSelectedCategory('');
      setSelectedBrand('');
      setSelectedModel('');
      setCategoryInput('');
      setBrandInput('');
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
      }
    } catch (err) {
      console.error(err);
      setIsListening(false);
    }
  };

  // Fetch AI suggestion when an error is clicked or re-analyzed
  const handleAiAnalysis = async (err: ErrorCode) => {
    if (!err) return;
    setAiLoading(true);
    setAiError('');
    setAiResult(null);

    try {
      const response = await fetch('/api/gemini/suggest-parts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          errorCode: err,
          availableParts: spareParts
        })
      });

      if (!response.ok) {
        throw new Error('سرویس هوش مصنوعی موقتاً در دسترس نیست یا خطایی رخ داده است.');
      }

      const data = await response.json();
      setAiResult(data);
    } catch (e: any) {
      console.error(e);
      setAiError(e.message || 'خطا در اتصال به موتور تحلیل هوشمند');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiDiagnose = async (err: ErrorCode) => {
    if (!err) return;
    setAiDiagnoseLoading(true);
    setAiDiagnoseError('');
    setAiDiagnoseResult(null);

    try {
      const response = await fetch('/api/gemini/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: err.code,
          brand: err.brand,
          model: err.model,
          category: err.category,
          hasDirectusMatch: !err.isVirtual,
          dbErrorRecord: err.isVirtual ? null : err
        })
      });

      if (!response.ok) {
        throw new Error('سیستم متبحر تحلیلگر هوشمند پاسخ نداد.');
      }

      const data = await response.json();
      setAiDiagnoseResult(data);
    } catch (e: any) {
      console.error(e);
      setAiDiagnoseError(e.message || 'خطا در بارگذاری گزارش کالبدشکافی هوشمند');
    } finally {
      setAiDiagnoseLoading(false);
    }
  };

  // Automatically trigger AI analysis on error selection
  React.useEffect(() => {
    if (selectedError) {
      handleAiAnalysis(selectedError);
      handleAiDiagnose(selectedError);
    } else {
      setAiResult(null);
      setAiError('');
      setAiDiagnoseResult(null);
      setAiDiagnoseError('');
    }
  }, [selectedError?.id]);

  // Smart suggestions based on query
  const suggestions = React.useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    const allTokens = cleanQuery
      .split(/\s+/)
      .map(t => t.trim())
      .filter(t => t.length > 0);

    if (allTokens.length === 0) return [];

    const stopWords = ['ارور', 'ارورهای', 'خطا', 'خطاهای', 'کد', 'سرویس', 'دستگاه', 'دستگاهای', 'بروز', 'ایران', 'مشکل', 'عیب', 'کولر', 'گازی'];
    let meaningfulTokens = allTokens.filter(t => !stopWords.includes(t));
    if (meaningfulTokens.length === 0) {
      meaningfulTokens = allTokens;
    }

    return errorCodes.filter(err => {
      return meaningfulTokens.every(token => {
        return (
          err.code.toLowerCase().includes(token) ||
          err.title.toLowerCase().includes(token) ||
          err.description.toLowerCase().includes(token) ||
          err.brand.toLowerCase().includes(token) ||
          err.model.toLowerCase().includes(token) ||
          err.category.toLowerCase().includes(token)
        );
      });
    }).slice(0, 5);
  }, [query, errorCodes]);

  // DYNAMIC CONNECTED LISTS
  // 1. Available brands based on selectedCategory
  const availableBrands = React.useMemo(() => {
    if (!selectedCategory) return brands;
    
    // Scan all error codes and see what brands are registered under this category
    const brandsFromErrors = errorCodes
      .filter(err => err.category === selectedCategory)
      .map(err => err.brand);
      
    // Scan spare parts as well
    const brandsFromParts = spareParts
      .filter(part => part.category === selectedCategory)
      .flatMap(part => part.compatibility);

    const merged = Array.from(new Set([...brandsFromErrors, ...brandsFromParts]));
    
    // If no specific brand matches, fallback to total known brands
    return merged.length > 0 ? merged : brands;
  }, [selectedCategory, errorCodes, spareParts, brands]);

  // 2. Available models based on selectedCategory and selectedBrand
  const availableModels = React.useMemo(() => {
    // Collect models from database
    const modelsFromErrors = errorCodes
      .filter(err => {
        const matchCat = !selectedCategory || err.category === selectedCategory;
        const matchBrand = !selectedBrand || err.brand.toLowerCase().includes(selectedBrand.toLowerCase()) || selectedBrand.toLowerCase().includes(err.brand.toLowerCase());
        return matchCat && matchBrand;
      })
      .map(err => err.model);

    // Hardcoded dictionary of popular Iranian and international models for instant auto-suggestions
    const brandToModelsDict: Record<string, string[]> = {
      'بوتان': ['کالدا ونزیا', 'اپتیما', 'پرلا پرو', 'بنسر پرو', 'ورونا', 'پارما', 'روما', 'بنسر'],
      'ایران رادیاتور': ['M24FF', 'L24FF', 'Eco22', 'K24', 'M28FF', 'L36FF', 'سرویس آرا'],
      'ال‌جی': ['دایرکت درایو گیربکسی', 'تسمه‌ای سری تایتان', 'ساید بای ساید', 'اینورتر نقره‌ای', '۷ کیلویی دایرکت'],
      'ال‌جی (LG)': ['دایرکت درایو گیربکسی', 'تسمه‌ای سری تایتان', 'ساید بای ساید', 'اینورتر نقره‌ای', '۷ کیلویی دایرکت'],
      'سامسونگ': ['ساید بای ساید RS50', 'یخچال دوقلو ریلی', 'فرنچ ۴ دربی', 'لباسشویی ادواش AddWash', 'ساید RS50'],
      'سامسونگ (Samsung)': ['ساید بای ساید RS50', 'یخچال دوقلو ریلی', 'فرنچ ۴ دربی', 'لباسشویی ادواش AddWash', 'ساید RS50'],
      'اسنوا': ['ساید گالری', 'لباسشویی مدل اکتا', 'یخچال دوقلو داکت'],
      'اسنوا (Snowa)': ['ساید گالری', 'لباسشویی مدل اکتا', 'یخچال دوقلو داکت'],
      'پاکشوما': ['سری کاریزما', 'دوقلو پروانه ای', 'روتاری پاکشوما'],
      'پاکشوما (Pakshoma)': ['سری کاریزما', 'دوقلو پروانه ای', 'روتاری پاکشوما'],
      'بوش': ['سری ۶ آلمان', 'سری ۸ زایلنت', 'پکیج بوش کامفورت'],
      'بوش (Bosch)': ['سری ۶ آلمان', 'سری ۸ زایلنت', 'پکیج بوش کامفورت']
    };

    let dictModels: string[] = [];
    if (selectedBrand) {
      const key = Object.keys(brandToModelsDict).find(k => 
        k.toLowerCase().includes(selectedBrand.toLowerCase()) || 
        selectedBrand.toLowerCase().includes(k.toLowerCase())
      );
      if (key) {
        dictModels = brandToModelsDict[key];
      }
    } else {
      dictModels = Object.values(brandToModelsDict).flat().slice(0, 15);
    }

    const merged = Array.from(new Set([...modelsFromErrors, ...dictModels])).filter(Boolean);
    return merged;
  }, [selectedCategory, selectedBrand, errorCodes]);

  // Filtered categories for combobox typing
  const filteredCategories = React.useMemo(() => {
    if (!categoryInput || categoryInput === selectedCategory) return categories;
    return categories.filter(cat => 
      cat.toLowerCase().includes(categoryInput.toLowerCase())
    );
  }, [categories, categoryInput, selectedCategory]);

  // Filtered brands for combobox typing
  const filteredBrands = React.useMemo(() => {
    if (!brandInput || brandInput === selectedBrand) return availableBrands;
    return availableBrands.filter(b => 
      b.toLowerCase().includes(brandInput.toLowerCase())
    );
  }, [availableBrands, brandInput, selectedBrand]);

  // Overall filtered error list based on query + filters
  const filteredCodes = React.useMemo(() => {
    return errorCodes.filter(err => {
      const matchesCategory = !selectedCategory || err.category === selectedCategory;
      
      const matchesBrand = !selectedBrand || 
        err.brand.toLowerCase().includes(selectedBrand.toLowerCase()) || 
        selectedBrand.toLowerCase().includes(err.brand.toLowerCase());
      
      const matchesModel = !selectedModel || 
        err.model.toLowerCase().includes(selectedModel.toLowerCase()) || 
        selectedModel.toLowerCase().includes(err.model.toLowerCase());
      
      const cleanQuery = query.trim().toLowerCase();
      if (!cleanQuery) {
        if (selectedCategory || selectedBrand || selectedModel) {
          return matchesCategory && matchesBrand && matchesModel;
        }
        return false;
      }

      const allTokens = cleanQuery
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (allTokens.length === 0) {
        if (selectedCategory || selectedBrand || selectedModel) {
          return matchesCategory && matchesBrand && matchesModel;
        }
        return false;
      }

      const stopWords = ['ارور', 'ارورهای', 'خطا', 'خطاهای', 'کد', 'سرویس', 'دستگاه', 'دستگاهای', 'بروز', 'ایران', 'مشکل', 'عیب', 'کولر', 'گازی'];
      let meaningfulTokens = allTokens.filter(t => !stopWords.includes(t));
      if (meaningfulTokens.length === 0) {
        meaningfulTokens = allTokens;
      }

      const matchesQuery = meaningfulTokens.every(token => {
        return (
          matchesTokenPrecise(err.code, token, true) ||
          matchesTokenPrecise(err.title, token, false) ||
          matchesTokenPrecise(err.description, token, false) ||
          matchesTokenPrecise(err.brand, token, false) ||
          matchesTokenPrecise(err.model, token, false) ||
          matchesTokenPrecise(err.category, token, false)
        );
      });

      return matchesCategory && matchesBrand && matchesModel && matchesQuery;
    });
  }, [errorCodes, query, selectedCategory, selectedBrand, selectedModel]);

  // Suggested codes for direct popup list under main search input
  const suggestedCodes = React.useMemo(() => {
    if (!query.trim()) return [];
    return filteredCodes.slice(0, 5);
  }, [filteredCodes, query]);

  // Overall filtered common problems based on query + filters
  const filteredProblems = React.useMemo(() => {
    return commonProblems.filter(prob => {
      const matchesCategory = !selectedCategory || prob.category === selectedCategory || prob.category === 'عمومی';
      
      const matchesBrand = !selectedBrand || 
        prob.brand.toLowerCase().includes(selectedBrand.toLowerCase()) || 
        selectedBrand.toLowerCase().includes(prob.brand.toLowerCase()) ||
        prob.brand === 'عمومی';
      
      const cleanQuery = query.trim().toLowerCase();
      if (!cleanQuery) {
        if (selectedCategory || selectedBrand) {
          return matchesCategory && matchesBrand;
        }
        return false;
      }

      const allTokens = cleanQuery
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length > 0);

      if (allTokens.length === 0) {
        if (selectedCategory || selectedBrand) {
          return matchesCategory && matchesBrand;
        }
        return false;
      }

      const stopWords = ['ارور', 'ارورهای', 'خطا', 'خطاهای', 'کد', 'سرویس', 'دستگاه', 'دستگاهای', 'بروز', 'ایران', 'مشکل', 'عیب', 'کولر', 'گازی'];
      let meaningfulTokens = allTokens.filter(t => !stopWords.includes(t));
      if (meaningfulTokens.length === 0) {
        meaningfulTokens = allTokens;
      }

      const matchesQuery = meaningfulTokens.every(token => {
        return (
          matchesTokenPrecise(prob.title, token, false) ||
          matchesTokenPrecise(prob.category, token, false) ||
          matchesTokenPrecise(prob.brand, token, false) ||
          prob.causes.some(c => matchesTokenPrecise(c, token, false)) ||
          prob.solutions.some(s => matchesTokenPrecise(s, token, false)) ||
          (prob.tags && prob.tags.some(t => matchesTokenPrecise(t, token, false)))
        );
      });

      return matchesCategory && matchesBrand && matchesQuery;
    });
  }, [commonProblems, query, selectedCategory, selectedBrand]);

  const [selectedProblemState, setSelectedProblemState] = React.useState<CommonProblem | null>(null);

  const selectedProblem = selectedProblemState;
  const setSelectedProblem = (prob: CommonProblem | null) => {
    if (!prob) {
      setSelectedProblemState(null);
      return;
    }

    if (isPremium) {
      setSelectedProblemState(prob);
      return;
    }

    const isAlreadyViewed = viewedProblems.includes(prob.id);
    if (!isAlreadyViewed) {
      if (viewedProblems.length >= 3) {
        setFreeLimitReachedType('common_problem');
        setShowFreeLimitModal(true);
        return;
      } else {
        const updated = [...viewedProblems, prob.id];
        setViewedProblems(updated);
        localStorage.setItem('free_viewed_problems', JSON.stringify(updated));
      }
    }
    setSelectedProblemState(prob);
  };

  const handleSelectSuggestion = (err: ErrorCode) => {
    onSelectError(err);
    setQuery(err.code);
    setSelectedCategory(err.category);
    setSelectedBrand(err.brand);
    setSelectedModel(err.model);
    setShowSuggestions(false);
  };

  const handleModelChange = (val: string) => {
    setSelectedModel(val);
    if (selectedError) onSelectError(null as any);
    
    // Autofill Brand and Category if there's a match
    if (val) {
      const match = errorCodes.find(err => 
        err.model.toLowerCase().includes(val.toLowerCase()) || 
        val.toLowerCase().includes(err.model.toLowerCase())
      );
      if (match) {
        if (!selectedCategory) setSelectedCategory(match.category);
        if (!selectedBrand) setSelectedBrand(match.brand);
      }
    }
  };

  const handleConfirmBottomPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bottomBuyerName || !bottomBuyerPhone || !bottomBuyerAddress || !activeCheckoutPartOfBottom) return;

    if (onPurchase) {
      onPurchase(
        activeCheckoutPartOfBottom,
        bottomBuyerAddress,
        bottomBuyerName,
        bottomBuyerPhone
      );
      setBottomCheckoutStep('success');
    }
  };

  const getHazardBadge = (level: ErrorCode['hazardLevel']) => {
    switch (level) {
      case 'critical':
        return (
          <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1 animate-pulse">
            <Flame className="w-3.5 h-3.5 fill-white" />
            <span>بحرانی و پرخطر ⚠️</span>
          </span>
        );
      case 'high':
        return (
          <span className="bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5 text-white" />
            <span>خطر بالا ⚡</span>
          </span>
        );
      case 'medium':
        return (
          <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1">
            <Settings className="w-3.5 h-3.5 text-white" />
            <span>احتیاط عمومی</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-500 text-white text-[10px] font-bold px-2 py-1 rounded-sm flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5 text-white" />
            <span>کم‌خطر</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Input Card - Highly Visible and Boxed */}
      <div className="bg-gradient-to-br from-white to-slate-50/40 rounded-3xl border-2 border-blue-600/25 p-6 sm:p-8 shadow-lg shadow-blue-900/5 relative overflow-visible z-50">
        {/* Subtle decorative glow */}
        <div className="absolute -top-12 -left-12 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="mb-6 relative z-10">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="bg-blue-600 text-white text-[10px] font-extrabold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-white rounded-full"></span>
              پایگاه اطلاعات مرکزی کشور
            </span>
            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
              بروزرسانی زنده خرداد ۱۴۰۵
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
            <Search className="w-5 h-5 text-blue-600" />
            <span>جستجوی هوشمند و کالبدشکافی کدهای خطای لوازم خانگی ایران</span>
          </h2>
          <p className="text-slate-500 text-xs mt-1">
            کد خطا (مانند E01، F3 یا IE) یا مشکل کلی دستگاه را جستجو کنید تا فوراً علل بروز، راهکارهای گام‌به‌گام و ابزارهای ایمنی مورد نیاز نمایش داده شوند.
          </p>
        </div>

        {/* Form controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 relative z-30">
          {/* Main search bar with voice recognition entry */}
          <div className="col-span-12 md:col-span-6 lg:col-span-3 relative z-20" id="main-search-container">
            <div className="relative">
              <span className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-blue-600">
                <Search className="w-5 h-5" />
              </span>
              <input
                id="search-main"
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="تایپ کنید: E1 ، 5E ، F3 ، یا نام ایراد فنی..."
                value={query}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => {
                  const val = e.target.value;
                  setQuery(val);
                  setShowSuggestions(true);
                  if (selectedError) onSelectError(null as any); // Reset details to show search results
                  
                  if (val.trim() !== '') {
                    setSelectedCategory('');
                    setSelectedBrand('');
                    setSelectedModel('');
                    setCategoryInput('');
                    setBrandInput('');
                  }
                }}
                className="w-full bg-slate-50 focus:bg-white text-xs sm:text-sm rounded-2xl pr-12 pl-14 py-4 border-2 border-slate-200 outline-none transition-all focus:border-blue-600 focus:ring-4 focus:ring-blue-100 font-bold placeholder-slate-400 text-slate-800"
              />
              {/* Mic Icon Button for Voice Search */}
              <button
                type="button"
                onClick={handleVoiceSearch}
                className={`absolute inset-y-1.5 left-1.5 flex items-center justify-center px-3.5 rounded-xl transition-all border outline-none select-none cursor-pointer ${
                  isListening 
                    ? 'bg-rose-600 text-white border-rose-500 animate-pulse hover:bg-rose-700 shadow-md shadow-rose-500/25' 
                    : 'bg-white border-slate-200/80 hover:bg-slate-100 text-slate-500 hover:text-blue-600 shadow-xs'
                }`}
                title="جستجوی با مکالمه صوتی فارسی"
              >
                {isListening ? (
                  <div className="flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></span>
                    <Mic className="w-4 h-4" />
                  </div>
                ) : (
                  <Mic className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Float Autocomplete suggestions list is completely disabled to avoid overlaying on mobile inputs */}
          </div>

          {/* Custom Category Dropdown - Now typeable! */}
          <div className={`col-span-12 md:col-span-6 lg:col-span-3 relative ${showCategoryDropdown ? 'z-50' : 'z-20'}`} id="category-dropdown-container">
              <div className="relative">
                <input
                  type="text"
                  id="category-input-field"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="⚙️ همه دستگاه‌ها (کل دسته‌ها)"
                  value={categoryInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCategoryInput(val);
                    setShowCategoryDropdown(true);
                    if (!val) {
                      setSelectedCategory('');
                      setSelectedBrand('');
                      setSelectedModel('');
                      if (selectedError) onSelectError(null as any);
                    }
                  }}
                  onFocus={() => {
                    setShowCategoryDropdown(true);
                    setShowBrandDropdown(false);
                    setShowModelSuggestions(false);
                  }}
                  className="w-full bg-white hover:bg-slate-50 text-right text-xs sm:text-xs rounded-2xl p-4 pr-10 pl-8 border-2 border-slate-200 outline-none transition-all font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-slate-850 flex items-center justify-between shadow-xs"
                />
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  ⚙️
                </span>
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] transition-transform duration-200 pointer-events-none ${showCategoryDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
                {categoryInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryInput('');
                      setSelectedCategory('');
                      setSelectedBrand('');
                      setSelectedModel('');
                      if (selectedError) onSelectError(null as any);
                    }}
                    className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showCategoryDropdown && (
                <div 
                  className="absolute right-0 left-0 mt-1.5 bg-white opacity-100 rounded-2xl shadow-2xl border-2 border-slate-200 z-50 max-h-56 overflow-y-auto text-right text-xs"
                  style={{ backgroundColor: '#ffffff', opacity: 1 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="bg-slate-50 p-2.5 text-[10px] font-extrabold text-slate-500 border-b border-slate-150">
                    دسته‌بندی دستگاه مورد نظر خود را برگزینید:
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCategory('');
                      setSelectedBrand(''); // Connected: Reset brand
                      setSelectedModel(''); // Connected: Reset model
                      if (selectedError) onSelectError(null as any);
                      setShowCategoryDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-right hover:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer font-extrabold block text-rose-700 ${!selectedCategory ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700'}`}
                  >
                    ⚙️ همه دستگاه‌ها (کل دسته‌ها)
                  </button>
                  {filteredCategories.length === 0 ? (
                    <div className="px-4 py-3 text-slate-450 text-center font-bold text-[11px]">
                      دستگاهی مطابق با تایپ شما یافت نشد...
                    </div>
                  ) : (
                    filteredCategories.map((cat) => (
                      <button
                        type="button"
                        key={cat}
                        onClick={() => {
                          setSelectedCategory(cat);
                          setSelectedBrand(''); // Connected: Reset brand
                          setSelectedModel(''); // Connected: Reset model
                          if (selectedError) onSelectError(null as any);
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-right hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0 cursor-pointer font-bold block ${selectedCategory === cat ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-755'}`}
                      >
                        {cat}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

          {/* Custom Brand Dropdown - Connected - Now typeable! */}
          <div className={`col-span-12 md:col-span-6 lg:col-span-3 relative ${showBrandDropdown ? 'z-50' : 'z-20'}`} id="brand-dropdown-container">
              <div className="relative">
                <input
                  type="text"
                  id="brand-input-field"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder={selectedCategory ? `🏆 برند ${selectedCategory}` : '🏆 همه برندها (کل مارک‌ها)'}
                  value={brandInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrandInput(val);
                    setShowBrandDropdown(true);
                    if (!val) {
                      setSelectedBrand('');
                      setSelectedModel('');
                      if (selectedError) onSelectError(null as any);
                    }
                  }}
                  onFocus={() => {
                    setShowBrandDropdown(true);
                    setShowCategoryDropdown(false);
                    setShowModelSuggestions(false);
                  }}
                  className="w-full bg-white hover:bg-slate-50 text-right text-xs sm:text-xs rounded-2xl p-4 pr-10 pl-8 border-2 border-slate-200 outline-none transition-all font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-slate-850 flex items-center justify-between shadow-xs"
                />
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  🏆
                </span>
                <span className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-[10px] transition-transform duration-200 pointer-events-none ${showBrandDropdown ? 'rotate-180' : ''}`}>
                  ▼
                </span>
                {brandInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setBrandInput('');
                      setSelectedBrand('');
                      setSelectedModel('');
                      if (selectedError) onSelectError(null as any);
                    }}
                    className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showBrandDropdown && (
                <div 
                  className="absolute right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 max-h-56 overflow-y-auto text-right text-xs"
                  style={{ backgroundColor: '#ffffff', opacity: 1 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="bg-slate-50 p-2.5 text-[10px] font-extrabold text-slate-500 border-b border-slate-150">
                    برند دستگاه متبوع خود را انتخاب نمایید:
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedBrand('');
                      setSelectedModel(''); // Connected: Reset model on brand change
                      if (selectedError) onSelectError(null as any);
                      setShowBrandDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-right hover:bg-slate-100 transition-colors border-b border-slate-100 cursor-pointer font-extrabold block text-blue-700 ${!selectedBrand ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700'}`}
                  >
                    🏆 همه برندها
                  </button>
                  {filteredBrands.length === 0 ? (
                    <div className="px-4 py-3 text-slate-400 text-center font-bold text-[11px]">
                      برندی مطابق با تایپ شما یافت نشد...
                    </div>
                  ) : (
                    filteredBrands.map((br) => (
                      <button
                        type="button"
                        key={br}
                        onClick={() => {
                          setSelectedBrand(br);
                          setSelectedModel(''); // Connected: Reset model on brand change
                          if (selectedError) onSelectError(null as any);
                          setShowBrandDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-right hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0 cursor-pointer font-bold block ${selectedBrand === br ? 'bg-blue-50 text-blue-700' : 'bg-white text-slate-700'}`}
                      >
                        {br}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

          {/* Model Input & dynamic typing recommendations - Connected */}
          <div className={`col-span-12 md:col-span-6 lg:col-span-3 relative ${showModelSuggestions ? 'z-50' : 'z-20'}`} id="model-dropdown-container">
              <div className="relative">
                <input
                  id="model-input"
                  type="text"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="📝 درج یا انتخاب مدل..."
                  value={selectedModel}
                  onChange={(e) => handleModelChange(e.target.value)}
                  onFocus={() => {
                    setShowModelSuggestions(true);
                    setShowCategoryDropdown(false);
                    setShowBrandDropdown(false);
                  }}
                  className="w-full bg-white hover:bg-slate-50 text-right text-xs sm:text-xs rounded-2xl p-4 pr-10 pl-8 border-2 border-slate-200 outline-none transition-all font-bold focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-slate-850 flex items-center justify-between shadow-xs placeholder-slate-400"
                />
                <span className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400 text-xs">
                  📝
                </span>
                {selectedModel && (
                  <button
                    onClick={() => handleModelChange('')}
                    className="absolute inset-y-0 left-3 flex items-center text-slate-400 hover:text-rose-600 text-xs font-bold cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              {showModelSuggestions && (
                <div 
                  className="absolute right-0 left-0 mt-1.5 bg-white rounded-2xl shadow-2xl border-2 border-slate-200 z-50 max-h-56 overflow-y-auto text-right text-xs"
                  style={{ backgroundColor: '#ffffff', opacity: 1 }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div className="bg-slate-50 p-2.5 text-[10px] font-extrabold text-slate-500 border-b border-slate-150 flex justify-between">
                    <span>مدل‌های پیشنهادی متناظر:</span>
                    <span className="text-blue-600 font-mono">({availableModels.length})</span>
                  </div>
                  {availableModels.length === 0 ? (
                    <div className="px-4 py-3 text-slate-400 text-center font-bold text-[11px]">
                      مدل پیش‌فرضی یافت نشد. می‌توانید مدل را دستی تایپ نمایید.
                    </div>
                  ) : (
                    availableModels
                      .filter(m => !selectedModel || m.toLowerCase().includes(selectedModel.toLowerCase()))
                      .map((m) => (
                        <button
                          id={`model-opt-${m}`}
                          type="button"
                          key={m}
                          onClick={() => {
                            setSelectedModel(m);
                            setShowModelSuggestions(false);
                            if (selectedError) onSelectError(null as any);
                            
                            // Smart auto-fill linking
                            const match = errorCodes.find(err => 
                              err.model.toLowerCase().includes(m.toLowerCase()) || 
                              m.toLowerCase().includes(err.model.toLowerCase())
                            );
                            if (match) {
                              setSelectedCategory(match.category);
                              setSelectedBrand(match.brand);
                            }
                          }}
                          className="w-full px-4 py-3 text-right bg-white hover:bg-slate-100 transition-colors border-b border-slate-100 last:border-0 cursor-pointer text-slate-705 block font-bold"
                        >
                          {m}
                        </button>
                      ))
                  )}
                </div>
              )}
            </div>
          </div>

        {/* Quick searches */}
        <div className="flex flex-wrap items-center gap-2 mt-5 text-xs border-t border-slate-200/60 pt-4 relative z-10">
          <span className="text-slate-500 text-[10.5px] font-bold">پرتقاضاترین کدهای عیب‌یابی ایران‌سرویس:</span>
          {quickCodes.map((code) => {
            const matchedError = errorCodes.find((err) => err.code === code);
            const level = matchedError ? matchedError.hazardLevel : 'low';
            return (
              <button
                id={`quick-code-${code}`}
                key={code}
                onClick={() => {
                  setQuery(code);
                  if (matchedError) {
                    onSelectError(matchedError);
                    setSelectedCategory(matchedError.category);
                    setSelectedBrand(matchedError.brand);
                    setSelectedModel(matchedError.model);
                  }
                }}
                className={`inline-flex items-center justify-center min-w-[64px] text-center font-mono text-[11px] px-3.5 py-1.5 rounded-xl select-auto transition-all cursor-pointer font-extrabold border focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xs ${
                  level === 'critical' || level === 'high'
                    ? 'bg-red-600 text-white hover:bg-red-750 border-red-700 hover:text-white shadow-sm shadow-red-100'
                    : level === 'medium'
                    ? 'bg-amber-500 text-white hover:bg-amber-600 border-amber-600 hover:text-white shadow-sm shadow-amber-100'
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-700 hover:text-white shadow-sm shadow-emerald-100'
                }`}
              >
                {code}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main detail page OR list view */}
      <div className="opacity-100 mt-6 transition-all duration-300 w-full max-w-full overflow-hidden">
        {selectedError ? (
        <div className="space-y-6 w-full max-w-full overflow-hidden">
          {/* Back button */}
          <button
            onClick={() => onSelectError(null as any)}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-blue-600 cursor-pointer p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-4 h-4 rotate-180" />
            <span>بازگشت به نتایج جستجو</span>
          </button>

          {/* Error Details Board */}
          <div className="bg-white -mx-4 md:mx-0 rounded-none md:rounded-3xl border-x-0 md:border border-slate-200/90 shadow-xs overflow-hidden w-auto max-w-none">
            {/* Upper Info Header */}
            <div className="bg-slate-900 text-white p-4 sm:p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-600/15 rounded-full blur-2xl" />

              <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
                <div className="space-y-1 min-w-0 flex-1 w-full">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-md font-mono">
                      {selectedError.code}
                    </span>
                    <span className="bg-white/10 text-slate-200 text-[10px] px-2 py-0.5 rounded-md">
                      {selectedError.brand}
                    </span>
                    <span className="bg-white/10 text-slate-200 text-[10px] px-2 py-0.5 rounded-md">
                      {selectedError.category}
                    </span>
                  </div>
                  <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mt-2 break-words whitespace-normal leading-relaxed text-right select-all">
                    {selectedError.title}
                  </h1>
                  <p className="text-slate-300 text-xs font-mono break-words whitespace-normal text-right">
                    سازگار با مدل‌های: {selectedError.model}
                  </p>
                </div>

                <div className="flex-shrink-0">
                  {getHazardBadge(selectedError.hazardLevel)}
                </div>
              </div>
            </div>

            {/* Glowing red alert box for hazards */}
            {['critical', 'high'].includes(selectedError.hazardLevel) && (
              <div className="bg-rose-50 border-y border-rose-200 p-4 text-xs text-rose-900 flex items-start gap-3 animate-pulse">
                <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <span>هشدار امنیتی بسیار مهم: خطای با خطر شدید!</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed font-sans break-words whitespace-normal">{selectedError.hazardDescription}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-t border-slate-100 w-full max-w-full">
              {/* Primary Trouble diagnosis & instructions */}
              <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-full overflow-hidden">
                {(() => {
                  const hasDbContent = !!(
                    selectedError.description || 
                    (selectedError.causes && selectedError.causes.length > 0) || 
                    (selectedError.steps && selectedError.steps.length > 0) || 
                    (selectedError.precautions && selectedError.precautions.length > 0)
                  );

                  const hasAiContent = !!(aiDiagnoseResult || aiResult || aiLoading || aiDiagnoseLoading);

                  return (
                    <div className="space-y-6">
                      {/* 2- Information Recorded in the Site (Database Content) - Officially Prioritized to be displayed first */}
                      {hasDbContent && (
                        <div className="bg-white border-2 border-slate-200/80 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs relative">
                          {/* Section Header */}
                          <div className="border-b border-slate-100 pb-3 flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-2xl bg-blue-105 flex items-center justify-center text-blue-600">
                              <CheckCircle className="w-5 h-5 font-bold" />
                            </div>
                            <div>
                              <h3 className="text-xs sm:text-sm font-black text-slate-800">۲) اطلاعات ثبت‌شده در سایت (رسمی)</h3>
                              <p className="text-[10px] text-slate-500 font-medium font-sans">توضیحات رسمی و مستندات ثبت‌شده در دیتابیس ایران‌سرویس</p>
                            </div>
                          </div>

                          {/* Video Guide Play Banner */}
                          {selectedError.video_url && (
                            <div className="bg-gradient-to-r from-rose-500/10 to-amber-500/10 border border-rose-500/15 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                              <div className="flex items-center gap-3 text-right">
                                <div className="w-12 h-12 rounded-xl bg-red-600 flex items-center justify-center text-white shrink-0 shadow-md">
                                  <Play className="w-6 h-6 fill-current pr-0.5" />
                                </div>
                                <div className="space-y-0.5">
                                  <h4 className="text-xs font-extrabold text-slate-800">فیلم راهنمای تصویری ویدیویی رفع عیب</h4>
                                  <p className="text-[10px] text-slate-500 leading-relaxed font-sans font-medium">برای این خطای خاص، راهنمای ویدیویی و رفع عیب کارگاهی ثبت شده است.</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!currentUser) {
                                    setShowPremiumAlert('login');
                                  } else if (!currentUser.subscription?.is_premium && currentUser.role !== 'admin') {
                                    setShowPremiumAlert('premium');
                                  } else {
                                    setActiveVideoUrl(selectedError.video_url || null);
                                  }
                                }}
                                className="bg-red-650 hover:bg-red-700 text-white font-extrabold text-[10.5px] px-5 py-2.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs hover:shadow active:scale-[97%] w-full md:w-auto justify-center"
                              >
                                <Video className="w-4 h-4 text-white" />
                                <span>پخش فیلم آموزشی عیب‌یابی</span>
                              </button>
                            </div>
                          )}

                          {/* 2.1 Content from Database Admin: محتوای ذخیره‌شده توسط مدیر سایت */}
                          {selectedError.description && (
                            <div className="space-y-1">
                              <h4 className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                <span>محتوای ذخیره‌شده توسط مدیر سایت:</span>
                              </h4>
                              <p className="text-slate-600 text-xs leading-relaxed font-sans bg-slate-50 p-3.5 rounded-2xl border border-slate-100/70 whitespace-pre-line font-medium">
                                {selectedError.description}
                              </p>
                            </div>
                          )}

                          {/* 2.2 Official Error Code Explanation: توضیحات رسمی کد خطا */}
                          {selectedError.causes && selectedError.causes.length > 0 && (
                            <div className="bg-slate-50/55 rounded-2xl border border-slate-101 p-4 space-y-1.5">
                              <h4 className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-amber-550 rounded-full"></span>
                                <span>توضیحات رسمی کد خطا و دلایل شایع:</span>
                              </h4>
                              <ul className="space-y-1.5 text-xs text-slate-650 list-disc pr-4 font-sans leading-relaxed font-medium">
                                {selectedError.causes.map((cause, i) => (
                                  <li key={i}>{cause}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* 2.3 Instructions/notes in database: آموزش‌ها یا نکات ثبت‌شده در دیتابیس */}
                          {selectedError.steps && selectedError.steps.length > 0 && (
                            <div className="space-y-3">
                              <h4 className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full"></span>
                                <span>آموزش‌ها یا نکات ثبت‌شده در دیتابیس (مراحل رفع عیب):</span>
                              </h4>
                              <div className="space-y-2.5 mt-1">
                                {selectedError.steps.map((step, idx) => (
                                  <div key={idx} className="flex gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center font-sans">
                                      {idx + 1}
                                    </div>
                                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 flex-1">
                                      <p className="text-slate-700 text-xs leading-relaxed font-sans font-medium">{step}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Precautions in Database */}
                          {selectedError.precautions && selectedError.precautions.length > 0 && (
                            <div className="bg-amber-50/30 border border-amber-200/60 rounded-2xl p-4">
                              <h4 className="text-[11.5px] font-bold text-amber-800 mb-2 flex items-center gap-1.5">
                                <ShieldAlert className="w-4 h-4 text-amber-600" />
                                <span>دستورالعمل‌ها و نکات ایمنی واجب ثبت‌شده در دیتابیس:</span>
                              </h4>
                              <ul className="space-y-1.5 text-xs text-slate-600 list-inside pr-4 list-decimal font-sans leading-relaxed">
                                {selectedError.precautions.map((p, idx) => (
                                  <li key={idx}>{p}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* 1- AI Diagnosis Result - Separated Block */}
                      {hasAiContent && (
                        <div className="bg-gradient-to-br from-indigo-50/70 via-blue-50/50 to-slate-50/80 border border-blue-150 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xs">
                          {/* Section Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-blue-100 pb-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-10 h-10 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 animate-pulse">
                                <Cpu className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-1.5">
                                  <span>۱) نتیجه تحلیل هوش مصنوعی (اختصاصی)</span>
                                  <span className="bg-blue-600 text-white text-[8px] px-1.5 py-0.5 rounded-md font-bold tracking-wider animate-pulse">
                                    GEMINI AI
                                  </span>
                                </h3>
                                <p className="text-[10px] text-slate-500 font-medium">سرویس عیب‌یابی آنلاین و بهینه‌سازی شده بر پایه پردازش زبان طبیعی</p>
                              </div>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => {
                                handleAiAnalysis(selectedError);
                                handleAiDiagnose(selectedError);
                              }}
                              className="self-start sm:self-auto text-[9.5px] font-extrabold text-blue-700 hover:text-white bg-white hover:bg-blue-600 border border-blue-100 hover:border-blue-600 px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
                              disabled={aiLoading || aiDiagnoseLoading}
                            >
                              {aiLoading || aiDiagnoseLoading ? "در حال بازخوانی..." : "🔄 آنالیز مجدد خطا"}
                            </button>
                          </div>

                          {(aiLoading || aiDiagnoseLoading) && (
                            <div className="py-8 text-center space-y-3">
                              <div className="inline-block relative w-8 h-8">
                                <span className="absolute inset-0 border-3 border-blue-600/25 rounded-full"></span>
                                <span className="absolute inset-0 border-3 border-t-blue-600 rounded-full animate-spin"></span>
                              </div>
                              <p className="text-[11px] text-blue-900 font-extrabold animate-pulse">
                                هوش مصنوعی جفتیابی و سناریوهای مانیتورینگ کدهای خطای ایرانی را کالبدشکافی می‌کند...
                              </p>
                            </div>
                          )}

                          {aiDiagnoseError && (
                            <div className="bg-rose-50 border border-rose-150 text-rose-900 p-4 rounded-2xl text-[11px]">
                              {aiDiagnoseError}
                            </div>
                          )}

                          {aiDiagnoseResult && (
                            <div className="bg-gradient-to-br from-indigo-950 to-blue-900 text-white rounded-2xl p-5 border border-indigo-900/50 shadow-md space-y-4 font-sans animate-in fade-in duration-200">
                              <div className="flex items-center justify-between border-b border-indigo-800/60 pb-3">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 bg-cyan-400 rounded-full animate-pulse-fast"></span>
                                  <h4 className="font-extrabold text-[11px] sm:text-xs text-cyan-300">🤖 گزارش عیب‌یابی مصلح فنی - تحلیل تعمیرگاهی هوشمند</h4>
                                </div>
                                <span className="bg-cyan-500/10 text-cyan-400 text-[8px] font-bold px-2 py-0.5 rounded-full border border-cyan-400/20">مدل جمینای ۳.۵</span>
                              </div>

                              {/* Top Specs Grid */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-right font-sans">
                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                  <span className="text-[10px] text-indigo-200 block mb-0.5">⚠️ میزان خطر (هشدارهای لازم):</span>
                                  <strong className={`text-xs ${
                                    aiDiagnoseResult.risk_level.includes('بحرانی') || aiDiagnoseResult.risk_level.includes('بالا') 
                                      ? 'text-rose-400 animate-pulse' 
                                      : 'text-emerald-400'
                                  }`}>
                                    {aiDiagnoseResult.risk_level}
                                  </strong>
                                </div>

                                <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                                  <span className="text-[10px] text-indigo-200 block mb-0.5">⏱️ زمان تعمیر:</span>
                                  <strong className="text-xs text-white">{aiDiagnoseResult.repair_time}</strong>
                                </div>

                                <div className="bg-white/5 rounded-xl p-3 border border-white/5 col-span-2">
                                  <span className="text-[10px] text-indigo-200 block mb-0.5">🏠 امکان تعمیر در منزل:</span>
                                  <strong className="text-[11px] text-indigo-100 block truncate" title={aiDiagnoseResult.diy_possible}>
                                    {aiDiagnoseResult.diy_possible}
                                  </strong>
                                </div>
                              </div>

                              {/* Technician Requirement Alert - Warnings section */}
                              <div className={`p-4 rounded-xl border flex items-start gap-2.5 text-right ${
                                aiDiagnoseResult.technician_required 
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                                  : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                              }`}>
                                <span className="text-sm mt-0.5">{aiDiagnoseResult.technician_required ? '⚠️' : '✅'}</span>
                                <div className="text-right">
                                  <h5 className="font-extrabold text-xs text-white/95">نیاز به حضور تکنسین متخصص (هشدارهای لازم):</h5>
                                  <p className="text-[10px] text-white/80 mt-0.5 leading-normal">
                                    {aiDiagnoseResult.technician_required 
                                      ? 'بله، به علت الزامات ایمنی و فنی، رفع این خطا مستلزم حضور کارشناس کارآزموده ایران ارور در محل است.' 
                                      : 'خیر، با ممارست و ابراز احتیاط، امکان عیب‌یابی ساده توسط شما در منزل مقدور است.'}
                                  </p>
                                </div>
                              </div>

                              {/* Suggested Causes - Causes of Error */}
                              <div className="space-y-1 text-right">
                                <span className="text-[10.5px] font-bold text-cyan-300 block">🔌 علت احتمالی خطا:</span>
                                <ul className="space-y-1 text-[11px] text-indigo-100 list-disc pr-4 font-sans leading-relaxed font-semibold">
                                  {aiDiagnoseResult.causes.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                              </div>

                              {/* Likely Spare Part */}
                              <div className="bg-indigo-900/40 p-3 rounded-xl border border-indigo-800/60 text-xs text-right">
                                <span className="text-[10.5px] text-indigo-200">🔍 قطعه احتمالی آسیب‌دیده:</span>
                                <strong className="text-cyan-200 font-bold mr-1 inline-block text-xs">{aiDiagnoseResult.likely_part}</strong>
                              </div>

                              {/* Detailed Analysis Output - AI-specific Analysis & Suggested Solution */}
                              <div className="bg-slate-950/20 p-4 rounded-xl border border-white/5 text-right">
                                <span className="text-[10.5px] font-black text-cyan-300 block mb-1">📝 تحلیل اختصاصی AI و راهحل پیشنهادی:</span>
                                <p className="text-indigo-50 text-xs leading-relaxed font-sans whitespace-pre-line font-medium">
                                  {aiDiagnoseResult.detailed_analysis}
                                </p>
                              </div>
                            </div>
                          )}

                          {aiError && (
                            <div className="bg-rose-50 border border-rose-150 text-rose-900 p-4 rounded-2xl text-xs space-y-2">
                              <p className="font-bold">بروز خطا در اتصال به سرویس هوش مصنوعی:</p>
                              <p className="text-slate-600 font-sans leading-relaxed">{aiError}</p>
                              <button 
                                type="button"
                                onClick={() => handleAiAnalysis(selectedError)}
                                className="bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-xl text-[10.5px] cursor-pointer font-bold transition-all inline-block shadow-xs"
                              >
                                ارتباط مجدد با سرور
                              </button>
                            </div>
                          )}

                          {aiResult && (
                            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200 text-right">
                              {/* AI Analysis Summary as part of AI-specific Analysis */}
                              <div className="bg-white/95 border border-slate-150 rounded-2xl p-4 shadow-2xs">
                                <h5 className="text-[11.5px] font-black text-indigo-950 mb-1.5 flex items-center gap-1">
                                  <span>📝 گزارش تحلیل اختصاصی AI:</span>
                                </h5>
                                <p className="text-slate-705 text-xs leading-relaxed font-sans whitespace-pre-line font-semibold">
                                  {aiResult.aiReason}
                                </p>
                              </div>

                              {/* Suggested available parts inside store - Suggested solution component */}
                              <div className="space-y-2.5">
                                <span className="text-[10.5px] font-black text-slate-700 block text-right">🛍️ قطعات یدکی منطبق شناسایی شده در بخش فروشگاه (راهحل پیشنهادی):</span>
                                
                                {aiResult.recommendedPartIds && aiResult.recommendedPartIds.filter(id => spareParts.some(p => p.id === id)).length > 0 ? (
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {spareParts
                                      .filter(part => aiResult.recommendedPartIds.includes(part.id))
                                      .map((part) => (
                                        <div key={part.id} className="bg-white hover:bg-slate-50 border border-slate-150 hover:border-blue-300 rounded-2xl p-3 flex gap-3 transition-all shadow-2xs relative">
                                          <img
                                            referrerPolicy="no-referrer"
                                            src={part.image}
                                            alt={part.name}
                                            className="w-14 h-14 rounded-xl object-cover bg-slate-100 flex-shrink-0 border border-slate-100"
                                          />
                                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div>
                                              <div className="flex items-center gap-1 mb-1">
                                                <span className="bg-emerald-50 text-emerald-700 border border-emerald-100 text-[8px] font-bold px-1.5 py-0.5 rounded-md">انبار اصلی</span>
                                                <span className="text-[9px] text-slate-400 font-mono">کد: {part.id}</span>
                                              </div>
                                              <h6 className="font-extrabold text-[10px] sm:text-[10.5px] text-slate-800 line-clamp-1 text-right" title={part.name}>{part.name}</h6>
                                            </div>
                                            <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-50">
                                              <span className="text-blue-600 font-sans font-extrabold text-[10.5px]">
                                                {part.price.toLocaleString('fa-IR')} تومان
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => onFilterParts(selectedError.category, selectedError.brand)}
                                                className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white transition-all text-[9px] font-extrabold px-2 py-1 rounded-lg cursor-pointer"
                                              >
                                                خرید فوری →
                                              </button>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-slate-500 bg-white/70 p-3.5 rounded-2xl border border-slate-150 leading-relaxed font-sans text-right">
                                    قطعه مستقیم متناظری در دیتابیس فعلی پیدا نشد. برای عیب‌یابی دقیق‌تر یا تعویض قطعات جانبی می‌توانید با پشتیبانی ایران‌سرویس تماس بگیرید یا درخواست اعزام تکنسین بسازید.
                                  </p>
                                )}
                              </div>

                              {/* Additional custom fittings/actions */}
                              {aiResult.additionalFittings && aiResult.additionalFittings.length > 0 && (
                                <div className="bg-slate-100/50 rounded-2xl p-3.5 border border-slate-150 text-right">
                                  <span className="text-[10.5px] font-black text-indigo-950 block mb-2">💡 سایر قطعات متمم یا اقدامات پیشنهادی:</span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {aiResult.additionalFittings.map((item, idx) => (
                                      <span key={idx} className="bg-white text-indigo-900 text-[10px] px-3 py-1.5 rounded-xl border border-slate-150 shadow-2xs font-semibold">
                                        🔍 {item}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {!hasDbContent && !hasAiContent && (
                        <div className="text-center py-6 bg-slate-50 border border-slate-100 rounded-3xl text-xs text-slate-500 font-sans font-semibold">
                          هیچ اطلاعات رسمی یا تحلیل هوش مصنوعی برای این خطا ثبت نشده است.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Sidebar actions: order parts, request service, and tools needed */}
              <div className="lg:col-span-4 bg-slate-50/30 lg:border-r border-slate-150/80 p-4 sm:p-6 lg:p-8 space-y-6 w-full max-w-full overflow-hidden">
                {/* Book Technician Box */}
                <div className="bg-gradient-to-br from-slate-900 to-blue-950 text-white rounded-2xl p-5 shadow-sm space-y-4">
                  <div className="space-y-1">
                    <h4 className="font-bold text-xs">نتوانستید مشکل را حل کنید؟</h4>
                    <p className="text-slate-300 text-[10px] leading-relaxed">
                      اگر ابزار لازم ندارید یا احساس خطر میکنید، کار را به تعمیرکار باسابقه و تایید شده بسپارید.
                    </p>
                  </div>

                  <button
                    id="detailed-book-repair-btn"
                    onClick={() => onBookRepair(selectedError)}
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-xl text-xs font-semibold cursor-pointer transition-colors shadow-sm flex items-center justify-center gap-1.5"
                  >
                    <span>درخواست اعزام سریع تعمیرکار ۲۴ساعته</span>
                  </button>
                  <div className="text-center text-[9px] text-slate-400">تضمین سرویس عیب‌یابی و ۱۸۰ روز گارانتی رسمی قطعات</div>
                </div>

                {/* Tools Box */}
                {selectedError.toolsNeeded.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-200/60 p-4">
                    <h4 className="font-bold text-xs text-slate-800 mb-3 flex items-center gap-1.5">
                      <Wrench className="w-4 h-4 text-slate-500" />
                      <span>ابزار موردنیاز رفع خطا</span>
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedError.toolsNeeded.map((t, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-700 text-[10px] px-2.5 py-1 rounded-md border border-slate-200/50">
                          ⚙️ {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Related Parts List */}
                <div className="bg-white rounded-2xl border border-slate-200/60 p-4 space-y-3">
                  <h4 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span>خرید مستقیم قطعه آسیب‌دیده</span>
                  </h4>
                  <p className="text-[10px] text-slate-400">قطعه احتمالاً آسیب‌دیده با توجه به کده خطای بالا:</p>
                  
                  <div className="space-y-2">
                    {spareParts
                      .filter(part => selectedError.relatedParts?.includes(part.id) || part.category === selectedError.category)
                      .slice(0, 2)
                      .map((p) => (
                        <div key={p.id} className="border border-slate-100 hover:border-slate-300 p-2 rounded-xl flex items-center gap-3 transition-colors">
                          <img
                            referrerPolicy="no-referrer"
                            src={p.image}
                            alt={p.name}
                            className="w-10 h-10 rounded-lg object-cover bg-slate-100"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="font-bold text-[10px] text-slate-800 block truncate leading-normal">{p.name}</span>
                            <span className="text-[10px] text-blue-600 font-sans font-bold">{p.price.toLocaleString('fa-IR')} تومان</span>
                          </div>
                          <button
                            id={`filter-part-btn-${p.id}`}
                            onClick={() => onFilterParts(selectedError.category, selectedError.brand)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                            title="مشاهده در فروشگاه"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Category Matching Products at the end of Troubleshooting Details */}
            {selectedError.category && (
              <div className="border-t border-slate-150 p-4 sm:p-6 lg:p-8 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 text-right font-sans">
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-xs text-slate-950 flex items-center gap-1.5 justify-start">
                      <Cpu className="w-4 h-4 text-blue-600" />
                      <span>قطعات یدکی و قطعات مصرفی مرتبط با دسته «{selectedError.category}»</span>
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                      لیست جامع کلیه تجهیزات رسمی مربوط به {selectedError.category} در فروشگاه مرکزی ایران سرویس با گارانتی اصالت کالا
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onFilterParts(selectedError.category, selectedError.brand);
                    }}
                    className="text-[10px] text-blue-700 bg-blue-50/80 hover:bg-blue-100 font-extrabold px-3 py-1.5 rounded-xl border border-blue-200 transition-all cursor-pointer whitespace-nowrap active:scale-95 text-center flex items-center gap-1 self-start sm:self-auto"
                  >
                    <span>نمایش همه دسته‌ها در فروشگاه</span>
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                {(() => {
                  const matchingParts = spareParts.filter(part => {
                    return part.category === selectedError.category;
                  });

                  if (matchingParts.length === 0) {
                    return (
                      <div className="text-center py-6 text-xs text-slate-400 bg-white border border-slate-150 rounded-2xl">
                        قطعهٔ ثبت شده‌ای متمایز با این دسته‌بندی در انبار مرکزی یافت نشد.
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {matchingParts.map((part) => (
                        <div key={part.id} className="group bg-white border border-slate-150 hover:border-slate-300 rounded-2xl p-4 flex flex-col justify-between transition-all shadow-2xs hover:shadow-xs relative">
                          <div className="flex gap-4">
                            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-slate-150 border border-slate-150 shrink-0 select-none">
                              <img
                                referrerPolicy="no-referrer"
                                src={part.image}
                                alt={part.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                              />
                            </div>
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <span className="bg-blue-50 text-blue-700 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-blue-105 font-sans">
                                  {part.category}
                                </span>
                                <span className="text-slate-400 text-[9px] font-mono">کد کالا: {part.id}</span>
                              </div>
                              <h4 className="font-extrabold text-[11px] sm:text-xs text-slate-800 line-clamp-1 text-right">
                                {part.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 leading-relaxed font-sans line-clamp-2 text-right">
                                {part.description}
                              </p>
                            </div>
                          </div>

                          <div className="mt-3 pt-3 border-t border-slate-105 flex items-center justify-between">
                            <div className="text-right">
                              <span className="text-[9px] text-slate-400 block font-normal">قیمت مصرف‌کننده:</span>
                              <span className="font-extrabold text-blue-600 text-xs font-sans">
                                {part.price.toLocaleString('fa-IR')}
                              </span>
                              <span className="text-slate-500 text-[10px] mr-1 font-bold">تومان</span>
                            </div>

                            <div className="flex items-center gap-1.5 font-sans">
                              {part.stock > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveCheckoutPartOfBottom(part);
                                    setBottomCheckoutStep('form');
                                    setBottomBuyerName('');
                                    setBottomBuyerPhone('');
                                    setBottomBuyerAddress('');
                                    setBottomCardNumber('');
                                  }}
                                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold px-3.5 py-2 rounded-xl cursor-pointer shadow-2xs hover:shadow transition-all inline-flex items-center gap-1"
                                >
                                  <ShoppingBag className="w-3.5 h-3.5" />
                                  <span>خرید فوری</span>
                                </button>
                              ) : (
                                <span className="text-rose-500 font-bold text-[10px] bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                                  اتمام موجودی
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      ) : (query.trim() || selectedCategory || selectedBrand || selectedModel) ? (
        /* Results Table and Catalog Layout + Common Problems Bento Dashboard */
        <div className="space-y-6 text-right font-sans">
          {/* A: Matching Common Problems & DIY Guides Section */}
          {filteredProblems.length > 0 && (
            <div className="bg-gradient-to-br from-indigo-650 to-blue-800 text-white rounded-3xl p-5 sm:p-6 shadow-md border border-indigo-600/50 space-y-4 text-right animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/20 pb-3">
                <div className="space-y-0.5 text-right">
                  <div className="flex items-center gap-1.5 justify-start">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                    <span className="font-extrabold text-[#38bdf8] text-[10px] bg-white/10 px-2 py-0.5 rounded">عیب‌یابی خودکار DIY</span>
                  </div>
                  <h3 className="font-extrabold text-sm sm:text-base flex items-center justify-start gap-1.5 hover:text-[#38bdf8] mt-1">
                    <span>🛠️ راهکارهای هوشمند گام‌به‌گام برای مشکلات شایع ({filteredProblems.length} مورد)</span>
                  </h3>
                </div>
                <span className="text-[10px] text-indigo-200 font-medium font-sans">تطابق هوشمند صوتی و متنی بهار خدمت</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredProblems.map((prob) => {
                  const isExpanded = selectedProblem?.id === prob.id;
                  return (
                    <div 
                      key={prob.id} 
                      className={`bg-white text-slate-800 rounded-2xl p-4 transition-all duration-300 border shadow-xs flex flex-col justify-between text-right ${
                        isExpanded ? 'ring-4 ring-[#38bdf8]/40 border-indigo-400' : 'hover:bg-slate-50 border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="space-y-2.5 text-right">
                        <div className="flex justify-between items-start gap-2">
                          <span className="font-extrabold text-xs sm:text-sm text-indigo-950 block leading-relaxed text-right">{prob.title}</span>
                          <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 text-[9px] font-bold px-2 py-0.5 rounded-md flex-shrink-0">
                            {prob.category || 'عمومی'} ({prob.brand || 'عمومی'})
                          </span>
                        </div>

                        {/* Always show custom description or preview of causes if closed */}
                        {!isExpanded ? (
                          <p onClick={() => {
                            setSelectedProblem(prob);
                            prob.views = (prob.views || 0) + 1;
                          }} className="text-[10.5px] text-slate-500 cursor-pointer hover:underline flex items-center gap-1">
                            <span>🔍 برای مشاهده تمام علت‌ها و راهکارهای قدم‌به‌قدم بر روی متن ضربه بزنید...</span>
                          </p>
                        ) : (
                          <div className="space-y-3 pt-2 text-[11px] leading-relaxed border-t border-slate-150 animate-in fade-in duration-200 text-right">
                            <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-100 space-y-1 text-right">
                              <span className="font-extrabold text-rose-800 block text-[10px] text-right">⚠️ علل شایع بروز این چالش:</span>
                              <ul className="list-disc list-inside space-y-0.5 pr-2.5 text-slate-705 text-right">
                                {prob.causes.map((c, idx) => (
                                  <li key={idx} className="cursor-text text-right">{c}</li>
                                ))}
                              </ul>
                            </div>

                            <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100 space-y-1 text-right">
                              <span className="font-extrabold text-emerald-800 block text-[10px] text-right">⚙️ مراحل اقدامات گام‌به‌گام برطرف‌سازی (DIY):</span>
                              <ol className="list-decimal list-inside space-y-0.5 pr-2.5 text-slate-755 text-right">
                                {prob.solutions.map((s, idx) => (
                                  <li key={idx} className="cursor-text text-right">{idx + 1}. {s}</li>
                                ))}
                              </ol>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-between items-center mt-3 pt-2.5 border-t border-slate-100">
                        {prob.views ? (
                          <span className="text-[9px] text-slate-400 font-mono">⏱️ خوانده شده: {prob.views} مرتبه</span>
                        ) : (
                          <span className="text-[9px] text-slate-400">⏱️ مرجع عیب‌یابی بومی سریع</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (isExpanded) {
                              setSelectedProblem(null);
                            } else {
                              setSelectedProblem(prob);
                              prob.views = (prob.views || 0) + 1;
                            }
                          }}
                          className={`text-[10px] font-extrabold px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                            isExpanded ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {isExpanded ? '🔼 بستن این راهنما' : '📖 مشاهده پله‌پله راهنما'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* B: Catalog and Tables block */}
          <div className="bg-white rounded-2xl border border-slate-200/85 overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-150 flex items-center justify-between text-xs font-bold text-slate-600">
              <span>کدهای خطای مطابق با فیلتر شما ({filteredCodes.length} مورد)</span>
              <span className="text-slate-400 font-medium">نتایج فوری آپلود دیتابیس ایران</span>
            </div>

            {filteredCodes.length === 0 ? (
              <div className="divide-y divide-slate-100">
                <div className="text-center py-16 text-slate-400">
                  <AlertTriangle className="w-12 h-12 text-slate-200 mx-auto mb-3 stroke-[1.2]" />
                  <p className="text-xs">هیچ کد خطایی با پارامترهای بالا تطابق ندارد.</p>
                  <p className="text-[10px] mt-1">تعداد کاراکتر سرچ خود را تغییر داده یا برندهای دیگری همچون بوتان، ال‌جی، یا سامسونگ را بررسی و جستجو کنید.</p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 md:p-5 bg-slate-50/20">
                {(showAllCodes ? filteredCodes : filteredCodes.slice(0, 6)).map((err) => (
                  <a
                    href={`/?code=${encodeURIComponent(err.code)}&brand=${encodeURIComponent(err.brand)}&category=${encodeURIComponent(err.category)}`}
                    onClick={(e) => {
                      e.preventDefault();
                      onSelectError(err);
                    }}
                    key={err.id}
                    className="p-4 rounded-2xl border border-slate-150 bg-white hover:bg-blue-50/5 hover:border-blue-300 hover:shadow-xs cursor-pointer transition-all duration-200 flex flex-col justify-between gap-4 h-full"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 font-mono font-bold text-xs sm:text-sm px-3 py-1.5 rounded-xl border flex items-center justify-center min-w-[55px] ${
                        err.hazardLevel === 'critical' || err.hazardLevel === 'high'
                          ? 'bg-red-600 text-white border-red-700 shadow-sm shadow-red-100'
                          : err.hazardLevel === 'medium'
                          ? 'bg-amber-500 text-white border-amber-600 shadow-sm shadow-amber-100'
                          : 'bg-emerald-600 text-white border-emerald-700 shadow-sm shadow-emerald-100'
                      }`}>
                        {err.code}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                          <span className="bg-slate-100 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md">
                            {err.brand}
                          </span>
                          <span className="bg-slate-150 text-slate-600 text-[9px] px-2 py-0.5 rounded-md">
                            {err.category}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono truncate">
                            {err.model}
                          </span>
                        </div>
                        <h3 className="font-bold text-xs sm:text-sm text-slate-800 mb-1 truncate text-right">
                          {err.title}
                        </h3>
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-1 truncate font-sans text-right">
                          {err.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100/60">
                      <div className="text-right">
                        <span className="text-[9px] text-slate-400 block mb-0.5">شدت خطا:</span>
                        {err.hazardLevel === 'critical' ? (
                          <span className="text-rose-600 text-[10px] font-bold">⚠️ فوق بحرانی</span>
                        ) : err.hazardLevel === 'high' ? (
                          <span className="text-amber-600 text-[10px] font-bold">⚡ خطر جدی</span>
                        ) : (
                          <span className="text-slate-500 text-[10px]">عادی</span>
                        )}
                      </div>
                      
                      <button
                        id={`err-details-view-${err.id}`}
                        className="bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        <span>عیب‌یابی</span>
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </a>
                ))}
              </div>
            )}

            {filteredCodes.length > 6 && (
              <div className="p-4 bg-slate-50 border-t border-slate-100 text-center flex justify-center items-center">
                <button
                  type="button"
                  id="toggle-all-codes"
                  onClick={() => setShowAllCodes(!showAllCodes)}
                  className="bg-white hover:bg-slate-50 text-blue-600 hover:text-blue-800 border border-slate-200 hover:border-slate-300 font-extrabold text-xs px-5 py-2.5 rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-all active:scale-95 select-none"
                >
                  {showAllCodes ? '🔽 نمایش کمتر' : `🔼 نمایش بیشتر (کل ${filteredCodes.length} نتیجه)`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
      {/* GORGEOUS VIDEO PLAYER OVERLAY MODAL */}
      {activeVideoUrl && (
        <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl w-full max-w-3xl animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/70 text-right">
              <button
                type="button"
                onClick={() => setActiveVideoUrl(null)}
                className="text-slate-450 hover:text-white bg-slate-800/60 hover:bg-slate-800 p-2 rounded-full transition-all cursor-pointer"
              >
                <X className="w-5 h-5 font-bold" />
              </button>
              <span className="text-xs sm:text-sm font-black text-slate-100 flex items-center gap-2">
                🎥 پخش آنلاین فیلم راهنمای عیب‌یابی لوازم خانگی
              </span>
            </div>

            {/* Video Content */}
            <div className="p-4 sm:p-6 space-y-4">
              {(() => {
                const isDirect = activeVideoUrl.endsWith('.mp4') || activeVideoUrl.endsWith('.webm') || activeVideoUrl.endsWith('.ogg') || activeVideoUrl.includes('/storage/') || activeVideoUrl.includes('.mp4?');
                
                let embedUrl = '';
                const aparatMatch = activeVideoUrl.match(/aparat\.com\/v\/([a-zA-Z0-9]+)/);
                const youtubeMatch = activeVideoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]+)/);
                
                if (aparatMatch) {
                  embedUrl = `https://www.aparat.com/video/video/embed/videohash/${aparatMatch[1]}/vt/frame`;
                } else if (youtubeMatch) {
                  embedUrl = `https://www.youtube.com/embed/${youtubeMatch[1]}`;
                }

                if (isDirect) {
                  return (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md">
                      <video
                        src={activeVideoUrl}
                        controls
                        className="w-full h-full"
                        autoPlay
                      />
                    </div>
                  );
                } else if (embedUrl) {
                  return (
                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-slate-800 shadow-md">
                      <iframe
                        src={embedUrl}
                        allowFullScreen
                        className="w-full h-full border-0"
                        title="Video Player"
                      />
                    </div>
                  );
                } else {
                  return (
                    <div className="bg-slate-800 border border-slate-700/60 rounded-2xl p-6 text-center space-y-4 max-w-md mx-auto">
                      <div className="w-12 h-12 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center mx-auto">
                        <Play className="w-6 h-6 fill-current pr-0.5" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-200">سیستم پخش خودکار این ویدیو آماده است</h4>
                        <p className="text-[10px] text-slate-400">به علت عدم تشخیص فرمت آدرس مستقیم یا بستر آپارات/یوتیوب، می‌توانید مستقیماً فیلم را در وب‌سایت منبع مشاهده کنید.</p>
                      </div>
                      <a
                        href={activeVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-750 text-white font-extrabold text-[11.1px] px-5 py-2.5 rounded-xl transition-all cursor-pointer mx-auto"
                      >
                        <span>باز کردن لینک مستقیم پخش ویدیو</span>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </div>
                  );
                }
              })()}

              {/* Info/Open Link */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-right">
                <p className="text-[10px] text-slate-400 font-sans">
                  نکته: در صورت اختلال در لودینگ، می‌توانید فیلم را مستقیماً در پنجره جداگانه باز کنید.
                </p>
                <a
                  href={activeVideoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10.5px] text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 font-bold shrink-0 cursor-pointer"
                >
                  <span>ورود به آدرس اصلی فیلم</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PREMIUM CHANNELS EXCLUSIVE PAYWALL DIALOG CONTAINER */}
      {showPremiumAlert !== 'none' && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-3xl border border-slate-100 shadow-2xl overflow-hidden text-right font-sans">
            {/* Header image/gradient bar with crown icon */}
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 p-6 text-white flex flex-col items-center text-center relative">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2 text-white text-3xl shadow-lg border border-white/20">
                👑
              </div>
              <h3 className="font-black text-sm">دسترسی محرمانه به ویدیوهای عیب‌یابی</h3>
              <p className="text-[9.5px] text-amber-50/90 mt-1 leading-relaxed font-mono">EXCLUSIVE VIP VIDEO RESOURCE</p>
            </div>

            <div className="p-6 space-y-4">
              {showPremiumAlert === 'login' ? (
                <div className="space-y-2">
                  <p className="text-xs text-slate-805 leading-relaxed font-bold">
                    کاربر گرامی، فیلم‌های کارگاهی و ویدیوهای شایع رفع عیب کدهای خطا، متعلق به متخصصین برتر سامانه است.
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    جهت تماشای این فیلم‌ها، ابتدا باید یک حساب کاربری ثبت کرده یا وارد سیستم شوید و پلن پولی تهیه کنید.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-amber-950 leading-relaxed font-bold bg-amber-50/80 p-3 rounded-2xl border border-amber-100">
                    🎉 حساب کاربری شما فعال است، اما هنوز فاقد اشتراک ویژه طلایی هستید!
                  </p>
                  <p className="text-[11px] text-slate-550 leading-relaxed">
                    این ویدیو آموزشی منحصر به خریداران پکیج عضویت ویژه پولی ایران‌سرویس است. برای فعال‌سازی کامل پنل و دسترسی نامحدود به ویدیوها، لطفاً اقدام به فعال‌سازی اشتراک پولی نمایید.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPremiumAlert('none');
                    if (onGoToDashboard) {
                      onGoToDashboard();
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-[98%]"
                >
                  {showPremiumAlert === 'login' ? '🔑 ورود / ثبت‌نام سریع در سیستم' : '💳 مشاهده و تهیه پکیج‌های اشتراک ویژه'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowPremiumAlert('none')}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] py-2 px-4 rounded-lg transition-all cursor-pointer text-center"
                >
                  بعداً بررسی می‌کنم
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FREE ACCESS TRIAL EXCEEDED LIMIT MODAL */}
      {showFreeLimitModal && (
        <div className="fixed inset-0 z-[100] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white max-w-sm w-full rounded-2xl border border-rose-100 shadow-2xl overflow-hidden text-right font-sans">
            {/* Header with warning/lock icon */}
            <div className="bg-gradient-to-r from-red-500 to-rose-600 p-6 text-white flex flex-col items-center text-center relative">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-2 text-white text-3xl shadow-lg border border-white/20">
                🔒
              </div>
              <h3 className="font-extrabold text-sm">پایان اعتبار دسترسی رایگان</h3>
              <p className="text-[10px] text-rose-10/90 mt-1 leading-relaxed font-mono">DEMO FREE ACCESS EXCEEDED</p>
            </div>

            <div className="p-6 space-y-4 text-right">
              <div className="space-y-3">
                <p className="text-xs text-rose-800 leading-relaxed font-bold bg-rose-50 border border-rose-100 p-3 rounded-xl text-right">
                  {freeLimitReachedType === 'error_code' 
                    ? '⚠️ شما از حداکثر ۳ سهمیه مشاهده رایگان کدهای خطا استفاده کرده‌اید.'
                    : '⚠️ شما از حداکثر ۳ سهمیه مشاهده رایگان عیب‌یابی مشکلات متداول استفاده کرده‌اید.'}
                </p>
                <p className="text-[11px] text-slate-500 leading-relaxed text-right">
                  کاربر گرامی، دسترسی رایگان آزمایشی شما به اطلاعات تخصصی سامانه به اتمام رسیده است. جهت مشاهده بی‌مرز جزییات، راهکارهای قدم‌به‌قدم برای رفع خطا، مشاهده نقشه‌های فنی ویژه و عیب‌یابی کدهای نامحدود نیاز به فعال‌سازی پکیج عضویت ویژه دارید.
                </p>
                <p className="text-[10px] text-indigo-600 bg-indigo-50/50 p-2.5 rounded-lg leading-relaxed border border-indigo-100 text-right">
                  ℹ️ تمامی دوره‌های اشتراکی ایران‌سرویس زمان‌دار هستند و بعد از طی شدن مدت معین (مانند یک ماه)، حساب شما مجدداً شامل ۳ دسترسی رایگان اولیه خواهد شد.
                </p>
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowFreeLimitModal(false);
                    if (onGoToDashboard) {
                      onGoToDashboard();
                    } else {
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs py-3 px-4 rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-[98%]"
                >
                  💳 خرید و ارتقای سریع به اشتراک ویژه‌
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowFreeLimitModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-extrabold text-[11px] py-2 px-4 rounded-lg transition-all cursor-pointer text-center"
                >
                  متوجه شدم (بعداً بررسی می‌کنم)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Modal for bottom related parts */}
      {activeCheckoutPartOfBottom && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl border border-slate-250 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="bg-slate-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-blue-400" />
                <h3 className="font-bold text-xs font-sans">درگاه پرداخت الکترونیک شتاب</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveCheckoutPartOfBottom(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {bottomCheckoutStep === 'form' ? (
              <form onSubmit={handleConfirmBottomPurchase} className="p-6 text-right font-sans">
                {/* Summary */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 mb-4 text-xs">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500">مورد خرید:</span>
                    <span className="font-bold text-slate-800">{activeCheckoutPartOfBottom.name}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-slate-500">دسته قطعه:</span>
                    <span className="text-slate-700">{activeCheckoutPartOfBottom.category}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                    <span className="font-bold text-slate-800">مبلغ نهایی پرداختی:</span>
                    <span className="font-bold text-blue-600 text-sm font-sans">
                      {activeCheckoutPartOfBottom.price.toLocaleString('fa-IR')} تومان
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-605 text-[10px] font-bold mb-1 text-right">نام و نام خانوادگی خریدار *</label>
                    <input
                      required
                      type="text"
                      value={bottomBuyerName}
                      onChange={(e) => setBottomBuyerName(e.target.value)}
                      placeholder="مثال: محمد مهدوی"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 text-right"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-605 text-[10px] font-bold mb-1 text-right">شماره تلفن همراه *</label>
                    <input
                      required
                      type="tel"
                      value={bottomBuyerPhone}
                      onChange={(e) => setBottomBuyerPhone(e.target.value)}
                      placeholder="مثال: 09121234567"
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 text-left font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-605 text-[10px] font-bold mb-1 text-right">آدرس دقیق تحویل قطعه *</label>
                    <textarea
                      required
                      value={bottomBuyerAddress}
                      onChange={(e) => setBottomBuyerAddress(e.target.value)}
                      placeholder="آدرس کامل پستی، کد پستی در صورت امکان"
                      rows={2}
                      className="w-full bg-slate-50 border border-slate-200 px-3 py-2 text-xs rounded-xl outline-none focus:bg-white focus:border-blue-500 text-right"
                    />
                  </div>

                  {/* Card number simulation */}
                  <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    <span className="text-[9px] text-slate-400 block mb-1 text-right">شماره کارت ۱۶ رقمی شتاب (دلخواه)</span>
                    <input
                      maxLength={19}
                      type="text"
                      value={bottomCardNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '');
                        const p = val.match(/.{1,4}/g) || [];
                        setBottomCardNumber(p.join('-'));
                      }}
                      placeholder="۶۰۳۷-۹۹۷۵-...."
                      className="w-full bg-white border border-slate-200 px-3 py-2 text-xs rounded-lg text-center tracking-widest font-mono select-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full mt-5 bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-700 hover:to-sky-700 text-white rounded-xl py-2.5 text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer active:scale-[98%]"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>تایید پرداخت و ثبت نهایی سفارش قطعه</span>
                </button>
              </form>
            ) : (
              <div className="p-8 text-center bg-white font-sans">
                <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 scale-105 animate-pulse">
                  <Check className="w-8 h-8 text-emerald-600 font-bold" />
                </div>
                <h4 className="font-extrabold text-slate-900 text-sm mb-2">پرداخت شتاب با موفقیت انجام شد!</h4>
                <p className="text-slate-500 text-xs leading-relaxed mb-6">
                  سفارش خرید قطعه "{activeCheckoutPartOfBottom.name}" ثبت نهایی شد و فاکتور فروش برای شمارهٔ <span className="font-mono font-bold text-slate-800">{bottomBuyerPhone}</span> پیامک گردید.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveCheckoutPartOfBottom(null)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-2.5 rounded-xl cursor-pointer shadow-xs"
                >
                  بستن پنجره پرداخت
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
};
