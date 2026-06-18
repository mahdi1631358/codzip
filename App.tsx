/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wrench, 
  Search, 
  User, 
  MapPin, 
  Clock, 
  ListOrdered, 
  TrendingUp, 
  Database, 
  Flame, 
  Check, 
  Bell, 
  MessageSquare,
  Sparkles,
  ShoppingBag,
  ArrowRightLeft,
  Truck,
  Heart,
  Smartphone,
  PhoneCall,
  Laptop,
  Shield,
  Home,
  Megaphone,
  X
} from 'lucide-react';
import { ErrorCode, RepairOrder, Technician, SparePart, Notification, CommonProblem, PartPurchase } from './types';
import { 
  INITIAL_ERROR_CODES, 
  INITIAL_TECHNICIANS, 
  INITIAL_REPAIR_ORDERS, 
  INITIAL_SPARE_PARTS, 
  IRAN_CITIES,
  APPLIANCE_BRANDS,
  APPLIANCE_CATEGORIES,
  INITIAL_COMMON_PROBLEMS
} from './data';
import { NotificationCenter } from './components/NotificationCenter';
import { PartsStore } from './components/PartsStore';
import { ErrorSearch } from './components/ErrorSearch';
import { BookingForm } from './components/BookingForm';
import { TechnicianPanel } from './components/TechnicianPanel';
import { AdminPanel } from './components/AdminPanel';
import { InfoPageModal } from './components/InfoPageModal';
import { TechnicianAuth } from './components/TechnicianAuth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ClientDashboard } from './components/ClientDashboard';

export default function App() {
  const lastLocalUpdateRef = React.useRef(0);
  // Current user / auth state
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [clientActiveTab, setClientActiveTab] = useState<'search' | 'dashboard'>('search');

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('session_user_id') || '';
      const response = await fetch('/api/auth/me', {
        headers: {
          'X-Session-Token': token
        }
      });
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          if (data.status === 'ok' && data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('session_user_id', data.user.id);
            if (data.user.role === 'admin' || data.user.is_super_admin) {
              setCurrentRole('admin');
              setRoleSelection('admin');
            }
            // Real-time synchronization: pull updated database collections (e.g. usersList) on login or registration
            loadDatabase();
            return data.user;
          }
        } else {
          console.warn('Expected JSON response from checkAuth, but got:', contentType);
        }
      }
      setCurrentUser(null);
      return null;
    } catch (error) {
      console.error('Error checking auth:', error);
      setCurrentUser(null);
      return null;
    }
  };

  const isAdmin = currentUser?.role === 'admin' || currentUser?.is_super_admin === 1 || currentUser?.is_super_admin === true;

  // Current user role view
  const [currentRole, setCurrentRole] = useState<'client' | 'technician' | 'admin'>(() => {
    const loggedTechId = localStorage.getItem('ir_logged_in_tech_id');
    if (loggedTechId) {
      return 'technician';
    }
    return 'client';
  });

  const [roleSelection, setRoleSelection] = useState<'none' | 'client' | 'technician' | 'admin'>(() => {
    const loggedTechId = localStorage.getItem('ir_logged_in_tech_id');
    if (loggedTechId) {
      return 'technician';
    }
    return 'none'; // Starts on the role-selection landing gateway by default
  });
  
  // Storage states
  const [errorCodes, setErrorCodes] = useState<ErrorCode[]>([]);
  const [commonProblems, setCommonProblems] = useState<CommonProblem[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [orders, setOrders] = useState<RepairOrder[]>([]);
  const [spareParts, setSpareParts] = useState<SparePart[]>([]);
  const [partPurchases, setPartPurchases] = useState<PartPurchase[]>(() => {
    try {
      const saved = localStorage.getItem('ir_purchases');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [adminPassword, setAdminPassword] = useState<string>(() => 'admin');
  const [smsSettings, setSmsSettings] = useState<any>({
    provider: 'simulated',
    apiKey: '',
    lineNumber: '',
    otpPatternCode: '',
    statusNotificationPatternCode: '',
    enabled: false
  });
  const [smsLogs, setSmsLogs] = useState<any[]>([]);
  const [currentPath, setCurrentPath] = useState(window.location.pathname);
  const [usersList, setUsersList] = useState<any[]>([]);
  const [subscriptionsList, setSubscriptionsList] = useState<any[]>([]);
  const [paymentsList, setPaymentsList] = useState<any[]>([]);
  
  const [adminAnnouncement, setAdminAnnouncement] = useState<{
    text: string;
    isActive: boolean;
    style: 'info' | 'warning' | 'success' | 'danger';
  }>(() => {
    try {
      const saved = localStorage.getItem('ir_announcement');
      return saved ? JSON.parse(saved) : { text: '', isActive: false, style: 'info' };
    } catch {
      return { text: '', isActive: false, style: 'info' };
    }
  });

  const [trustBadges, setTrustBadges] = useState<{
    badge1Link: string;
    badge1Image: string;
    badge2Link: string;
    badge2Image: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('ir_trust_badges');
      return saved ? JSON.parse(saved) : {
        badge1Link: 'https://enamad.ir',
        badge1Image: '',
        badge2Link: 'https://samandehi.ir',
        badge2Image: ''
      };
    } catch {
      return {
        badge1Link: '',
        badge1Image: '',
        badge2Link: '',
        badge2Image: ''
      };
    }
  });
  
  const [supportPhone, setSupportPhone] = useState<string>(() => {
    return localStorage.getItem('ir_support_phone') || '۱۸۴۰';
  });

  const [pageContents, setPageContents] = useState<{
    aboutUs: string;
    contactUs: string;
    rules: string;
    dispute: string;
  }>(() => {
    try {
      const saved = localStorage.getItem('ir_page_contents');
      return saved ? JSON.parse(saved) : {
        aboutUs: `مجتمع فنی ایران‌سرویس با پشتوانه بیش از ۱۵ سال تجربه خدمت‌رسانی در زمینه‌ی عیب‌یابی، نگهداری و عیب‌زدایی پیشرفته لوازم برودتی و حرارتی، پکیج، کولر گازی و لوازم خانگی بزرگ، بزرگترین شبکه متخصصین سیار کل کشور را اداره می‌کند. هدف ما ایجاد بستری امن برای ارائه بالاترین سطوح کیفی خدمات فنی می‌باشد.`,
        contactUs: `دفتر مرکزی تهران: خیابان ولیعصر، بالاتر از میدان ولیعصر، مجتمع اداری تجاری ایرانیان، طبقه ۵، واحد ۱۲\n📞 تلفن تماس پشتیبانی فوری: ۱۸۴۰\n✉️ پست الکترونیک: office@iranservice.ir\nساعات پاسخگویی تیم پشتیبانی تلفنی: ۷ صبح الی ۲۳ شب (تمام روزهای هفته)`,
        rules: `۱. تمام تکنسین‌های منتخب دارای گواهی عدم سوء‌پیشینه، تأیید صلاحیت ایمنی و مدارک فنی و حرفه‌ای معتبر می‌باشند.\n۲. نرخ تمامی اقدامات فنی، اجرت کارگذار و قیمت قطعات بر اساس مصوبه صنف و اتحادیه رسمی لوازم خانگی کل کشور محاسبه می‌شود.\n۳. قطعات مصرفی تا ۱۸۰ روز شامل گارانتی کتبی خواهند بود.`,
        dispute: `در صورت بروز هرگونه ابهام، مغایرت در رفتار تکنسین یا تعرفه دریافتی، کاربری می‌تواند حداکثر ظرف ۴۸ ساعت پس از اتمام کار برگه‌ شکایت خود را جهت بازبینی مبالغ پرداختی ثبت نماید. داوران مجتمع ظرف ۱۲ ساعت به موضوع رسیدگی خواهند کرد و در صورت تایید مغایرت، مبالغ اضافی عودت داده می‌شود.`
      };
    } catch {
      return {
        aboutUs: 'درباره ما',
        contactUs: 'تماس با ما',
        rules: 'قوانین و مقررات',
        dispute: 'حل اختلاف و شکایت'
      };
    }
  });

  const [userFeedbacks, setUserFeedbacks] = useState<any[]>(() => {
    try {
      const saved = localStorage.getItem('ir_user_feedbacks');
      return saved ? JSON.parse(saved) : [
        {
          id: 'fb-1',
          name: 'امیررضا کریمی',
          phone: '۰۹۱۲۳۴۵۶۷۸۹',
          role: 'user',
          subject: 'پیشنهاد',
          message: 'برنامه عالیه! لطفا امکان پرداخت فیش اعتباری برای شهرستان‌ها رو باز فعال کنید.',
          submittedAt: '۱۴۰۵/۰۳/۱۵ ۱۰:۲۰',
          isRead: false
        },
        {
          id: 'fb-2',
          name: 'تکنسین رضایی',
          phone: '۰۹۱۸۷۶۵۴۳۲۱',
          role: 'technician',
          subject: 'همکاری',
          message: 'لطفاً لیست تامین ابزار فنی جدید را برای برندهای بوش و الجی به‌روزرسانی کنید.',
          submittedAt: '۱۴۰5/03/16 14:45',
          isRead: true
        }
      ];
    } catch {
      return [];
    }
  });

  const [openedInfoPage, setOpenedInfoPage] = useState<{
    isOpen: boolean;
    pageId: 'about' | 'contact' | 'rules' | 'dispute' | 'insurance' | 'settlement' | 'union' | '';
    title: string;
  }>({
    isOpen: false,
    pageId: '',
    title: ''
  });

  const [announcementDismissed, setAnnouncementDismissed] = useState<boolean>(() => {
    const savedText = localStorage.getItem('ir_announcement_dismissed_text');
    try {
      const savedAnnouncement = localStorage.getItem('ir_announcement');
      if (savedAnnouncement && savedText) {
        const parsed = JSON.parse(savedAnnouncement);
        return parsed.text === savedText;
      }
    } catch {}
    return false;
  });
  
  // Base metadata customizable by Admin
  const [citiesList, setCitiesList] = useState<{name: string, regions: string[]}[]>([]);
  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [categoriesList, setCategoriesList] = useState<string[]>([]);
  const [modelsList, setModelsList] = useState<string[]>([]);
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Logged in technician ID state
  const [loggedInTechId, setLoggedInTechId] = useState<string | null>(null);

  const handleSetLoggedInTechId = (id: string | null) => {
    setLoggedInTechId(id);
    if (id) {
      localStorage.setItem('ir_logged_in_tech_id', id);
    } else {
      localStorage.removeItem('ir_logged_in_tech_id');
    }
  };
  
  // Phone number digits normalizer to English
  const toEnglishDigits = (str: string): string => {
    if (!str) return '';
    return str.toString()
      .trim()
      .replace(/[\u0660-\u0669\u06f0-\u06f9]/g, c => (c.charCodeAt(0) & 0xf).toString())
      .replace(/\D/g, '');
  };

  // Client specific states
  const [selectedError, setSelectedError] = useState<ErrorCode | null>(null);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [trackingPhoneNumber, setTrackingPhoneNumber] = useState('');
  const [activeTrackingOrder, setActiveTrackingOrder] = useState<RepairOrder | null>(null);
  const [successOrder, setSuccessOrder] = useState<RepairOrder | null>(null);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);

  // Filter transmission for parts shop
  const [shopCategoryFilter, setShopCategoryFilter] = useState('');
  const [shopBrandFilter, setShopBrandFilter] = useState('');

  // Admin passcode modal entry states
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState(false);
  const [adminLoginPasswordInput, setAdminLoginPasswordInput] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  const handleCancelAdminLogin = () => {
    setIsAdminLoginModalOpen(false);
    setAdminLoginPasswordInput('');
    setAdminLoginError('');
    window.history.pushState({}, '', '/');
    setCurrentRole('client');
    setRoleSelection('none');
  };

  const handleSubmitAdminLogin = () => {
    if (adminLoginPasswordInput === adminPassword) {
      localStorage.setItem('session_user_id', 'admin');
      setCurrentUser({
        id: 'admin',
        phone: '09120000000',
        full_name: 'مدیریت کل سیستم',
        role: 'admin',
        is_super_admin: 1,
        subscription: { is_premium: true, expiry_date: null, plan_name: 'مادام‌العمر' },
        payments: [],
        repair_requests: []
      });
      setCurrentRole('admin');
      setRoleSelection('admin');
      setIsAdminLoginModalOpen(false);
      setAdminLoginPasswordInput('');
      setAdminLoginError('');
      triggerNotification('ورود موفق مدیریت', 'شما به عنوان مدیر عالی پلتفرم وارد شدید.', 'success');
    } else {
      setAdminLoginError('کلمه عبور وارد شده نادرست است!');
    }
  };

  // 1. Initial LocalStorage, Backend fetch, and real-time polling synchronizer
  const loadDatabase = async (forceForce: boolean = false) => {
    // Prevents race conditions: skip overwriting local UI memory if we performed a sync recently
    if (!forceForce && Date.now() - lastLocalUpdateRef.current < 6000) {
      return;
    }
    try {
      console.log('[App] Fetching database state from backend api...');
      const response = await fetch(`/api/get-database?t=${Date.now()}`, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error('Server API failed to return database');
      }
      const data = await response.json();
      
      // Double check: if user did any local updates or booking submits while this fetch was in flight, skip overwriting
      if (!forceForce && Date.now() - lastLocalUpdateRef.current < 6000) {
        console.log('[App] Skipping state override to prevent race conditions from in-flight requests.');
        return;
      }
      
      if (data.adminPassword) {
        setAdminPassword(data.adminPassword);
      }
      if (data.smsSettings) {
        setSmsSettings(data.smsSettings);
      }
      if (data.smsLogs) {
        setSmsLogs(data.smsLogs);
      }
      if (data.adminAnnouncement) {
        setAdminAnnouncement(data.adminAnnouncement);
        localStorage.setItem('ir_announcement', JSON.stringify(data.adminAnnouncement));
      }
      if (data.trustBadges) {
        setTrustBadges(data.trustBadges);
        localStorage.setItem('ir_trust_badges', JSON.stringify(data.trustBadges));
      }
      if (data.supportPhone) {
        setSupportPhone(data.supportPhone);
        localStorage.setItem('ir_support_phone', data.supportPhone);
      }
      if (data.errorCodes) {
        setErrorCodes(data.errorCodes);
        localStorage.setItem('ir_errors', JSON.stringify(data.errorCodes));
      }
      if (data.commonProblems !== undefined) {
        setCommonProblems(data.commonProblems);
        localStorage.setItem('ir_common_problems', JSON.stringify(data.commonProblems));
      } else {
        setCommonProblems(INITIAL_COMMON_PROBLEMS);
        localStorage.setItem('ir_common_problems', JSON.stringify(INITIAL_COMMON_PROBLEMS));
      }
      if (data.technicians) {
        setTechnicians(data.technicians);
        localStorage.setItem('ir_techs', JSON.stringify(data.technicians));
      }
      if (data.orders) {
        setOrders(data.orders);
        localStorage.setItem('ir_orders', JSON.stringify(data.orders));
      }
      if (data.spareParts) {
        setSpareParts(data.spareParts);
        localStorage.setItem('ir_parts', JSON.stringify(data.spareParts));
      }
      if (data.partPurchases) {
        setPartPurchases(data.partPurchases);
        localStorage.setItem('ir_purchases', JSON.stringify(data.partPurchases));
      }
      if (data.users) {
        setUsersList(data.users);
        localStorage.setItem('ir_users', JSON.stringify(data.users));
      }
      if (data.subscriptions) {
        setSubscriptionsList(data.subscriptions);
      }
      if (data.payments) {
        setPaymentsList(data.payments);
      }
      if (data.citiesList !== undefined) {
        setCitiesList(data.citiesList);
        localStorage.setItem('ir_cities', JSON.stringify(data.citiesList));
      } else {
        setCitiesList(IRAN_CITIES);
        localStorage.setItem('ir_cities', JSON.stringify(IRAN_CITIES));
      }
      if (data.brandsList !== undefined) {
        setBrandsList(data.brandsList);
        localStorage.setItem('ir_brands', JSON.stringify(data.brandsList));
      } else {
        setBrandsList(APPLIANCE_BRANDS);
        localStorage.setItem('ir_brands', JSON.stringify(APPLIANCE_BRANDS));
      }
      if (data.categoriesList !== undefined) {
        setCategoriesList(data.categoriesList);
        localStorage.setItem('ir_categories', JSON.stringify(data.categoriesList));
      } else {
        setCategoriesList(APPLIANCE_CATEGORIES);
        localStorage.setItem('ir_categories', JSON.stringify(APPLIANCE_CATEGORIES));
      }
      if (data.modelsList) {
        setModelsList(data.modelsList);
        localStorage.setItem('ir_models', JSON.stringify(data.modelsList));
      }
      if (data.pageContents) {
        setPageContents(data.pageContents);
        localStorage.setItem('ir_page_contents', JSON.stringify(data.pageContents));
      }
      if (data.userFeedbacks) {
        setUserFeedbacks(data.userFeedbacks);
        localStorage.setItem('ir_user_feedbacks', JSON.stringify(data.userFeedbacks));
      }
    } catch (err) {
      console.warn('[App] Backend synchronization offline, using client-side fallback:', err);
      
      const localErrors = localStorage.getItem('ir_errors');
      const localProblems = localStorage.getItem('ir_common_problems');
      const localTechs = localStorage.getItem('ir_techs');
      const localOrders = localStorage.getItem('ir_orders');
      const localParts = localStorage.getItem('ir_parts');
      const localUsers = localStorage.getItem('ir_users');

      setErrorCodes(localErrors ? JSON.parse(localErrors) : INITIAL_ERROR_CODES);
      setCommonProblems(localProblems ? JSON.parse(localProblems) : INITIAL_COMMON_PROBLEMS);
      setTechnicians(localTechs ? JSON.parse(localTechs) : INITIAL_TECHNICIANS);
      setOrders(localOrders ? JSON.parse(localOrders) : INITIAL_REPAIR_ORDERS);
      setSpareParts(localParts ? JSON.parse(localParts) : INITIAL_SPARE_PARTS);
      if (localUsers) {
        setUsersList(JSON.parse(localUsers));
      }

      const localCities = localStorage.getItem('ir_cities');
      const localBrands = localStorage.getItem('ir_brands');
      const localCategories = localStorage.getItem('ir_categories');
      const localModels = localStorage.getItem('ir_models');

      setCitiesList(localCities ? JSON.parse(localCities) : IRAN_CITIES);
      setBrandsList(localBrands ? JSON.parse(localBrands) : APPLIANCE_BRANDS);
      setCategoriesList(localCategories ? JSON.parse(localCategories) : APPLIANCE_CATEGORIES);
      setModelsList(localModels ? JSON.parse(localModels) : []);

      const localAnnouncement = localStorage.getItem('ir_announcement');
      if (localAnnouncement) {
        setAdminAnnouncement(JSON.parse(localAnnouncement));
      }
      const localBadges = localStorage.getItem('ir_trust_badges');
      if (localBadges) {
        setTrustBadges(JSON.parse(localBadges));
      }
      const localPhone = localStorage.getItem('ir_support_phone');
      if (localPhone) {
        setSupportPhone(localPhone);
      }
      const localPageContents = localStorage.getItem('ir_page_contents');
      if (localPageContents) {
        setPageContents(JSON.parse(localPageContents));
      }
      const localFeedbacks = localStorage.getItem('ir_user_feedbacks');
      if (localFeedbacks) {
        setUserFeedbacks(JSON.parse(localFeedbacks));
      }
    }

    // Restore session and notifications
    const localLoggedInTechId = localStorage.getItem('ir_logged_in_tech_id');
    if (localLoggedInTechId) setLoggedInTechId(localLoggedInTechId);

    const localNotifs = localStorage.getItem('ir_notifs');
    if (localNotifs) {
      try {
        const parsed = JSON.parse(localNotifs);
        if (Array.isArray(parsed)) {
          const seen = new Set();
          const deduplicated = parsed.filter(item => {
            if (!item || !item.id) return false;
            const cleanId = String(item.id);
            if (seen.has(cleanId)) return false;
            seen.add(cleanId);
            return true;
          });
          setNotifications(deduplicated);
          localStorage.setItem('ir_notifs', JSON.stringify(deduplicated));
        } else {
          setNotifications([]);
        }
      } catch {
        setNotifications([]);
      }
    } else {
      setNotifications([]);
    }
  };

  useEffect(() => {
    checkAuth();
    loadDatabase();

    // Setup periodic state polling synchronizer (every 4 seconds) to guarantee and fix technician available list 
    // updates and live client-side order tracking status updates automatically
    const pollInterval = setInterval(() => {
      loadDatabase();
    }, 4000);

    return () => clearInterval(pollInterval);
  }, []);

  // Synchronizer to show announcement if the message text has changed
  useEffect(() => {
    if (adminAnnouncement?.text) {
      const savedText = localStorage.getItem('ir_announcement_dismissed_text');
      setAnnouncementDismissed(savedText === adminAnnouncement.text);
    } else {
      setAnnouncementDismissed(false);
    }
  }, [adminAnnouncement?.text]);

  // Synchronize client order tracking drawer details instantly when order progresses dynamically
  useEffect(() => {
    if (activeTrackingOrder) {
      const liveOrderState = orders.find(o => o.id === activeTrackingOrder.id);
      if (liveOrderState) {
        if (JSON.stringify(liveOrderState) !== JSON.stringify(activeTrackingOrder)) {
          setActiveTrackingOrder(liveOrderState);
        }
      } else {
        setActiveTrackingOrder(null);
      }
    }
  }, [orders, activeTrackingOrder]);

  // Deep linking and URL parsing on initial database load for high Google indexation rate
  useEffect(() => {
    if (errorCodes.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    const brandParam = params.get('brand');
    const categoryParam = params.get('category');

    if (codeParam) {
      const found = errorCodes.find(e => 
        e.code.toLowerCase() === codeParam.toLowerCase() && 
        (!brandParam || e.brand.toLowerCase() === brandParam.toLowerCase()) &&
        (!categoryParam || e.category.toLowerCase() === categoryParam.toLowerCase())
      );
      if (found) {
        setSelectedError(found);
        setRoleSelection('client');
        setCurrentRole('client');
      }
    }
  }, [errorCodes]);

  // Dynamic Browser SEO Metadata (Title, Description, and Structured FAQ Schema JSON-LD)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (selectedError) {
      params.set('code', selectedError.code);
      params.set('brand', selectedError.brand);
      params.set('category', selectedError.category);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);

      document.title = `کد خطا ${selectedError.code} ${selectedError.brand} ${selectedError.category} - عیب‌یابی متبوع`;

      let metaDesc = document.querySelector('meta[name="description"]');
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.setAttribute('name', 'description');
        document.head.appendChild(metaDesc);
      }
      metaDesc.setAttribute('content', `کد خطای ${selectedError.code} مربوط به ${selectedError.category} برند ${selectedError.brand}. عیب‌یابی تخصصی به همراه راه‌حل‌ها: ${selectedError.description || 'بررسی وضعیت شیر برقی و پمپ'}`);

      let metaKeywords = document.querySelector('meta[name="keywords"]');
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.setAttribute('name', 'keywords');
        document.head.appendChild(metaKeywords);
      }
      metaKeywords.setAttribute('content', `${selectedError.code}, ارور ${selectedError.code}, خطای ${selectedError.brand}, تعمیرات ${selectedError.category}, بهار خدمت`);

      let scriptLd = document.getElementById('seo-jsonld-schema');
      if (scriptLd) {
        scriptLd.remove();
      }
      scriptLd = document.createElement('script');
      scriptLd.setAttribute('id', 'seo-jsonld-schema');
      scriptLd.setAttribute('type', 'application/ld+json');
      scriptLd.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{
          "@type": "Question",
          "name": `علت و راه‌حل ارور ${selectedError.code} در ${selectedError.category} ${selectedError.brand} چیست؟`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `علت بروز خطا: ${selectedError.description || 'بررسی مدار الکترونیکی و سنسورها'}.`
          }
        }]
      });
      document.head.appendChild(scriptLd);

    } else {
      if (params.has('code')) {
        params.delete('code');
        params.delete('brand');
        params.delete('category');
        window.history.replaceState({}, '', `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`);
      }
      document.title = "سامانه مدیریت کدهای خطا و تعمیرات لوازم خانگی - بهار خدمت";

      let metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        metaDesc.setAttribute('content', "پلتفرم جامع جستجوی کدهای خطا و ثبت آنلاین درخواست تعمیر لوازم خانگی در سراسر ایران");
      }

      let scriptLd = document.getElementById('seo-jsonld-schema');
      if (scriptLd) {
        scriptLd.remove();
      }
      scriptLd = document.createElement('script');
      scriptLd.setAttribute('id', 'seo-jsonld-schema');
      scriptLd.setAttribute('type', 'application/ld+json');
      scriptLd.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": "سامانه مدیریت کدهای خطا و تعمیرات - بهار خدمت",
        "description": "پلتفرم تخصصی تعمیرات و عیب‌یابی ارور لوازم خانگی",
        "telephone": "021-91000000",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "تهران",
          "addressCountry": "IR"
        }
      });
      document.head.appendChild(scriptLd);
    }
  }, [selectedError]);

  // 2. Strict Access Control & Routing redirects for Requirements 2 & 8
  useEffect(() => {
    const checkAdminRouteAccess = () => {
      const path = window.location.pathname;
      setCurrentPath(path);
      if (path === '/admin-panel' || path === '/admin') {
        const isAdminActive = currentUser?.role === 'admin' || currentUser?.is_super_admin === 1 || currentUser?.is_super_admin === true;
        if (isAdminActive) {
          if (currentRole === 'technician' && loggedInTechId) {
            // Under simulation masquerading, let them stay in 'technician' role!
            return;
          }
          setCurrentRole('admin');
          setRoleSelection('admin');
        } else {
          setIsAdminLoginModalOpen(true);
        }
      } else if (path === '/technician' || path === '/tech') {
        if (currentRole !== 'technician') {
          setCurrentRole('technician');
          setRoleSelection('technician');
        }
      } else {
        // If they are on regular path, but active role is admin, guide URL back to admin-panel
        if (currentRole === 'admin' && path !== '/admin-panel' && path !== '/admin') {
          window.history.pushState({}, '', '/admin-panel');
          setCurrentPath('/admin-panel');
        }
      }
    };

    checkAdminRouteAccess();

    window.addEventListener('popstate', checkAdminRouteAccess);
    return () => {
      window.removeEventListener('popstate', checkAdminRouteAccess);
    };
  }, [currentRole, currentUser]);

  // Sync helper with database in the backend
  const syncWithBackend = async (payload: Record<string, any>) => {
    lastLocalUpdateRef.current = Date.now();
    try {
      const response = await fetch('/api/save-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[Sync] Backend rejected update:', response.status, errorData);
        triggerNotification(
          'خطای همگام‌سازی',
          errorData.error || 'مقادیر ارسالی با قوانین اعتبارسنجی سیستم سازگار نیستند.',
          'warning'
        );
        return false;
      }
      return true;
    } catch (err: any) {
      console.error('[Sync] Failed to push update to backend storage:', err);
      triggerNotification(
        'خطای اتصال به سرور',
        'دیتابیس در دسترس نیست یا اتصال قطع شده است.',
        'warning'
      );
      return false;
    }
  };

  // Update Technician state helper
  const getActiveTech = (): Technician | undefined => {
    if (loggedInTechId) {
      const found = technicians.find(t => t.id === loggedInTechId);
      if (found) return found;
    }
    return technicians[0] || INITIAL_TECHNICIANS[0];
  };

  const activeTech = getActiveTech();

  // Real & simulated backend SMS sender Integration
  const dispatchSmsNotification = async (phone: string, text: string, type: 'otp' | 'status' = 'status', variables?: Record<string, string>) => {
    try {
      console.log(`[API Connect] Dispatching SMS to ${phone}...`);
      const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone,
          message: text,
          templateVars: variables,
          type
        })
      });
      if (response.ok) {
        const data = await response.json();
        if (data.log) {
          setSmsLogs(prev => [data.log, ...prev].slice(0, 500));
        }
      }
    } catch (err) {
      console.error('[SMS System API] Backend dispatch failed:', err);
    }
  };

  // Helper trigger for notifications + mock SMS logs
  const triggerNotification = (title: string, text: string, type: Notification['type'] = 'info', orderId?: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
    const newNotif: Notification = {
      id: `notif_${now.getTime()}_${Math.floor(Math.random() * 1000000)}`,
      title,
      text,
      date: timeStr,
      type,
      orderId
    };

    setNotifications(prev => {
      const updated = [newNotif, ...prev];
      localStorage.setItem('ir_notifs', JSON.stringify(updated));
      return updated;
    });
  };

  // State synchronization with DB simulation inside localStorage and Backend API
  const saveErrorsToStorage = (updated: ErrorCode[]) => {
    setErrorCodes(updated);
    localStorage.setItem('ir_errors', JSON.stringify(updated));
    syncWithBackend({ errorCodes: updated });
  };

  const saveCommonProblemsToStorage = (updated: CommonProblem[]) => {
    setCommonProblems(updated);
    localStorage.setItem('ir_common_problems', JSON.stringify(updated));
    syncWithBackend({ commonProblems: updated });
  };

  const saveOrdersToStorage = (updated: RepairOrder[]) => {
    setOrders(updated);
    localStorage.setItem('ir_orders', JSON.stringify(updated));
    syncWithBackend({ orders: updated });
  };

  const saveTechsToStorage = (updated: Technician[]) => {
    setTechnicians(updated);
    localStorage.setItem('ir_techs', JSON.stringify(updated));
    syncWithBackend({ technicians: updated });
  };

  const savePartsToStorage = (updated: SparePart[]) => {
    setSpareParts(updated);
    localStorage.setItem('ir_parts', JSON.stringify(updated));
    syncWithBackend({ spareParts: updated });
  };

  const savePurchasesToStorage = (updated: PartPurchase[]) => {
    setPartPurchases(updated);
    localStorage.setItem('ir_purchases', JSON.stringify(updated));
    syncWithBackend({ partPurchases: updated });
  };

  const savePageContentsToStorage = (contents: any) => {
    setPageContents(contents);
    localStorage.setItem('ir_page_contents', JSON.stringify(contents));
    syncWithBackend({ pageContents: contents });
  };

  const saveFeedbacksToStorage = (feedbacks: any[]) => {
    setUserFeedbacks(feedbacks);
    localStorage.setItem('ir_user_feedbacks', JSON.stringify(feedbacks));
    syncWithBackend({ userFeedbacks: feedbacks });
  };

  const handleClearNotifications = () => {
    setNotifications([]);
    localStorage.removeItem('ir_notifs');
  };

  const handleRemoveNotification = (id: string) => {
    setNotifications(prev => {
      const filtered = prev.filter(n => n.id !== id);
      localStorage.setItem('ir_notifs', JSON.stringify(filtered));
      return filtered;
    });
  };

  // CUSTOMER INTERACTIVE METHODS
  const handleBookingSubmit = (newOrderData: Partial<RepairOrder>) => {
    const orderId = `REQ-${Math.floor(100000 + Math.random() * 900000)}`;
    const fullOrder: RepairOrder = {
      id: orderId,
      customerName: newOrderData.customerName || 'مشتری بدون نام',
      customerPhone: newOrderData.customerPhone || '۰۹۱۲۰۰۰۰۰۰۰',
      city: newOrderData.city || 'تهران',
      region: newOrderData.region || 'نامشخص',
      address: newOrderData.address || 'ورودی دستی',
      category: newOrderData.category || 'پکیج دیواری',
      brand: newOrderData.brand || 'بوتان',
      model: newOrderData.model || 'عمومی',
      errorCode: newOrderData.errorCode || 'نامعلوم',
      description: newOrderData.description || '',
      status: 'waiting',
      date: newOrderData.date || '۱۴۰۵/۰۳/۱۵',
      timeSlot: newOrderData.timeSlot || '۰۹:۰۰ الی ۱۲:۰۰',
      mediaUrls: newOrderData.mediaUrls || [],
      createdAt: new Date().toISOString()
    };

    const updatedOrders = [fullOrder, ...orders];
    saveOrdersToStorage(updatedOrders);
    setIsBookingOpen(false);

    // Active instant tracking for current screen
    setTrackingPhoneNumber(fullOrder.customerPhone);
    setActiveTrackingOrder(fullOrder);

    // Trigger on-screen gorgeous modal
    setSuccessOrder(fullOrder);

    // Simulate standard OTP & assignment message
    triggerNotification(
      'ثبت موفقیت‌آمیز درخواست',
      `قبض موقت ${orderId} با موفقیت در سامانه هماهنگ گردید. تکنسین‌های تایید شده در منطقه هم‌اکنون این پرونده را ارزیابی می‌کنند.`,
      'success'
    );

    // Simulated SMS & real integration dispatch call
    const jobLabel = fullOrder.category === 'پکیج دیواری' ? 'تعمیر پکیج' : `تعمیر ${fullOrder.category}`;
    const smsMessageText = `مشتری گرامی ${fullOrder.customerName}، درخواست "${jobLabel} ${fullOrder.brand}" شما با شماره رهگیری ${orderId} با موفقیت در سامانه ثبت گردید. منتظر تماس همکاران ما بمانید. ایران‌سرویس`;
    
    // Call our real/simulated SMS dispatcher gateway
    dispatchSmsNotification(fullOrder.customerPhone, smsMessageText, 'status');

    triggerNotification(
      'سامانه پیامک ایران‌سرویس',
      smsMessageText,
      'sms',
      orderId
    );
  };

  const handleSearchTrackingPhoneNumber = () => {
    if (!trackingPhoneNumber) {
      alert('لطفا شماره تلفن همراه خود را ابتدا وارد کنید.');
      return;
    }
    const cleanSearch = toEnglishDigits(trackingPhoneNumber);
    const matched = orders.find(o => {
      const cleanOrderPhone = toEnglishDigits(o.customerPhone);
      return cleanOrderPhone === cleanSearch || 
             (cleanOrderPhone.length >= 10 && cleanSearch.length >= 10 && 
              (cleanOrderPhone.endsWith(cleanSearch.slice(-10)) || cleanSearch.endsWith(cleanOrderPhone.slice(-10))));
    });

    if (matched) {
      setActiveTrackingOrder(matched);
      triggerNotification('پیگیری سفارش', `سفارش شماره ${matched.id} برای نمایش در پنل ره‌گیری بارگذاری شد.`, 'info');
    } else {
      alert('هیچ درخواستی با این شماره تلفن همراه یافت نشد.');
    }
  };

  const handlePurchasePart = (part: SparePart, address: string, buyerName?: string, buyerPhone?: string) => {
    // Subtract from stock
    const updatedParts = spareParts.map(p => {
      if (p.id === part.id) {
        return { ...p, stock: Math.max(0, p.stock - 1) };
      }
      return p;
    });
    savePartsToStorage(updatedParts);

    // Record the purchase in the database
    const newPurchase: PartPurchase = {
      id: `PUR-${Math.floor(100000 + Math.random() * 900000)}`,
      partId: part.id,
      partName: part.name,
      partCategory: part.category,
      customerName: buyerName || 'مشتری ناشناس',
      customerPhone: buyerPhone || '09121111111',
      customerAddress: address,
      price: part.price,
      date: new Date().toLocaleDateString('fa-IR'),
      status: 'pending'
    };

    const updatedPurchases = [newPurchase, ...partPurchases];
    savePurchasesToStorage(updatedPurchases);

    triggerNotification(
      'خرید آنلاین قطعه',
      `تراکنش شتاب برای خرید "${part.name}" با موفقیت ثبت شد. محموله به آدرس "${address}" فرستاده می‌شود.`,
      'success'
    );

    triggerNotification(
      'پیامک انبارداری کالا',
      `سفارش قطعه یدکی شما به کد رهگیری PAR-${Math.floor(1000 + Math.random() * 9000)} آماده تحویل به پست پیشتاز گردید. هماهنگی قطعه‌سازان ایران.`,
      'sms'
    );
  };

  const handleFilterPartsForSelectedError = (category: string, brand: string) => {
    setShopCategoryFilter(category);
    setShopBrandFilter(brand);
    // Scroll to shopping block smoothly
    const element = document.getElementById('parts-store-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // TECHNICIAN METHODS
  const handleAcceptOrder = (orderId: string, techId: string) => {
    const techObj = technicians.find(t => t.id === techId);
    if (!techObj) return;

    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        return {
          ...o,
          status: 'accepted' as any,
          technicianId: techObj.id,
          technicianName: techObj.name,
          technicianPhone: techObj.phone
        };
      }
      return o;
    });

    saveOrdersToStorage(updatedOrders);

    // Notify Customer through simulated SMS
    const currentOrd = orders.find(o => o.id === orderId);
    if (currentOrd) {
      triggerNotification(
        'ارجاع تکنسین',
        `درخواست تعمیرکار شماره ${orderId} توسط "${techObj.name}" پذیرش گردید.`,
        'success'
      );

      triggerNotification(
        'اطلاع‌رسانی پیامکی مشتری',
        `مشتری محترم، تکنسین با تجربه جناب ${techObj.name} با شماره تماس ${techObj.phone} عهده دفتار فنی شما گردیدند. جهت بررسی مراجعه به زودی تماس خواهند گرفت.`,
        'sms',
        orderId
      );
    }
  };

  const handleUpdateOrderStatus = (orderId: string, status: RepairOrder['status'], updateData?: Partial<RepairOrder>) => {
    const currentOrder = orders.find(o => o.id === orderId);
    if (!currentOrder) return;

    const updatedOrders = orders.map(o => {
      if (o.id === orderId) {
        const merged = { ...o, status, ...updateData };
        return merged;
      }
      return o;
    });

    saveOrdersToStorage(updatedOrders);

    // If completed sum technician earnings minus 15% system fee
    if (status === 'completed' && updateData?.estimatedCost) {
      const payout = updateData.estimatedCost * 0.85; // 85% goes to tech
      const updatedTechs = technicians.map(t => {
        if (t.id === currentOrder.technicianId) {
          return {
            ...t,
            completedOrders: t.completedOrders + 1,
            balance: t.balance + payout
          };
        }
        return t;
      });
      saveTechsToStorage(updatedTechs);

      // Decrement part stock if used in repair
      if (updateData.partsUsed && updateData.partsUsed.length > 0) {
        const usedId = updateData.partsUsed[0].partId;
        const revisedParts = spareParts.map(sp => {
          if (sp.id === usedId) {
            return { ...sp, stock: Math.max(0, sp.stock - 1) };
          }
          return sp;
        });
        savePartsToStorage(revisedParts);
      }
    }

    // Dynamic Notifications based on state transitions
    let messageText = '';
    let smsText = '';

    if (status === 'enroute') {
      messageText = `تکنسین برای سفارش ${orderId} اعلام حرکت کرد.`;
      smsText = `مشتری ارجمند، تکنسین ${currentOrder.technicianName} در مسیر حرکت به سمت منزل/کارگاه شما جهت اقدامات فنی هستند.`;
    } else if (status === 'repairing') {
      messageText = `عیب‌یابی فعال و پروسه تعمیر برای سفارش ${orderId} رسماً آغاز شد.`;
      smsText = `تعمیرکار وارد محل کار شده و مشغول بررسی فنی جهت رفع کد خطای ${currentOrder.errorCode || 'دستگاه'} هستند.`;
    } else if (status === 'needs_part') {
      messageText = `سفارش ${orderId} به علت نیاز به قطعات یدکی به حالت تعلیق موقت درآمد.`;
      smsText = `نیاز به تهیه قطعه تکمیلی برای دستگاه شما؛ تکنسین پس از تهیه قطعه از انبار مرکزی، اقدام را ادامه خواهند داد.`;
    } else if (status === 'completed') {
      messageText = `فرآیند فاکتورسازی و اتمام کار با موفقیت تایید شد. مبلغ نهایی: ${updateData?.estimatedCost?.toLocaleString('fa-IR')} تومان.`;
      smsText = `پایان فرآیند تعمیر با موفقیت. از اعتماد شما به ایران‌سرویس سپاسگزاریم. کد ضمانت قطعه مصرفی صادر شد.`;
    } else if (status === 'cancelled') {
      messageText = `سفارش فنی ${orderId} به خواست مشتری یا مصلحت تکنسین ملغی گردید.`;
      smsText = `درخواست تعمیر ${orderId} شما ملغی گردید. با آرزوی تندرستی، دفتار مرکزی ایران‌سرویس.`;
    }

    triggerNotification('تغییر وضعیت سرویس', messageText, 'info', orderId);
    if (smsText) {
      triggerNotification('پیامک اطلاع‌رسانی خودکار دفتار فنی', smsText, 'sms', orderId);
      dispatchSmsNotification(currentOrder.customerPhone || '09120000000', smsText, 'status', { "order": orderId, "status": status });
    }

    // Update current active track if is the same
    if (activeTrackingOrder && activeTrackingOrder.id === orderId) {
      const syncOrd = updatedOrders.find(o => o.id === orderId);
      setActiveTrackingOrder(syncOrd || null);
    }
  };

  const handleNewErrorCodeSubmitFromTech = (newErr: Partial<ErrorCode>) => {
    const cleanStr = (s: string) => {
      if (!s) return '';
      return s
        .trim()
        .toLowerCase()
        .replace(/[يى]/g, 'ی')
        .replace(/ك/g, 'ک')
        .replace(/\s+/g, ' ');
    };

    const cleanModel = (m: string) => {
      const clean = cleanStr(m);
      if (!clean || clean === 'عمومی' || clean === 'عمومي' || clean === 'کل مدل‌ها' || clean === 'کل مدلها' || clean === 'كل مدلها' || clean === 'همه' || clean === 'همه مدل‌ها' || clean === 'همه مدل ها' || clean === 'general') {
        return 'عمومی';
      }
      return clean;
    };

    const targetCode = cleanStr(newErr.code || 'CODE');
    const targetCat = cleanStr(newErr.category || 'پکیج دیواری');
    const targetBrand = cleanStr(newErr.brand || 'بوتان');
    const targetModel = cleanModel(newErr.model || 'عمومی');

    const isDuplicate = errorCodes.some(err => {
      const codeClean = cleanStr(err.code);
      const catClean = cleanStr(err.category);
      const brandClean = cleanStr(err.brand);
      const modelClean = cleanModel(err.model || 'عمومی');
      return codeClean === targetCode && catClean === targetCat && brandClean === targetBrand && modelClean === targetModel;
    });

    if (isDuplicate) {
      triggerNotification(
        'خطا در ثبت کد',
        `کُد خطای "${newErr.code}" قبلاً برای دستگاه "${newErr.category}" برند "${newErr.brand}" ثبت شده است و نیازی به تعریف مجدد نیست.`,
        'error'
      );
      alert(`⚠️ کُد خطای تکراری: کُد خطای "${newErr.code}" برای این دستگاه، برند و مدل هم‌اکنون موجود است.`);
      return;
    }

    const freshErr: ErrorCode = {
      id: `err_pro_${new Date().getTime()}`,
      code: newErr.code || 'CODE',
      category: newErr.category || 'پکیج دیواری',
      brand: newErr.brand || 'بوتان',
      model: newErr.model || 'عمومی',
      title: newErr.title || 'ثبت شده توسط تکنسین',
      description: newErr.description || '',
      causes: newErr.causes || [],
      steps: newErr.steps || [],
      precautions: newErr.precautions || [],
      hazardLevel: newErr.hazardLevel || 'medium',
      hazardDescription: 'هشدار بررسی تخصصی قطعات داخلی پکیج و کابلها',
      toolsNeeded: newErr.toolsNeeded || [],
      relatedParts: [],
      views: 0,
      updatedBy: newErr.updatedBy || 'تکنیسین ناشناس',
      isApproved: false // Needs admin check
    };

    const updated = [freshErr, ...errorCodes];
    saveErrorsToStorage(updated);

    // Auto-register newly typed category, brand, or model by technician to the database lists
    let updatedCats = false, updatedBrands = false, updatedMods = false;
    const newCategories = [...categoriesList];
    const newBrands = [...brandsList];
    const newModels = [...modelsList];

    if (freshErr.category.trim() && !newCategories.includes(freshErr.category.trim())) {
      newCategories.push(freshErr.category.trim());
      updatedCats = true;
    }
    if (freshErr.brand.trim() && !newBrands.includes(freshErr.brand.trim())) {
      newBrands.push(freshErr.brand.trim());
      updatedBrands = true;
    }
    if (freshErr.model.trim() && freshErr.model !== 'عمومی' && !newModels.includes(freshErr.model.trim())) {
      const modelsToInsert = freshErr.model.split(/[\/,و،+]+/).map(m => m.trim()).filter(Boolean);
      modelsToInsert.forEach(m => {
        if (!newModels.includes(m)) {
          newModels.push(m);
          updatedMods = true;
        }
      });
    }

    if (updatedCats) {
      setCategoriesList(newCategories);
      localStorage.setItem('ir_categories', JSON.stringify(newCategories));
    }
    if (updatedBrands) {
      setBrandsList(newBrands);
      localStorage.setItem('ir_brands', JSON.stringify(newBrands));
    }
    if (updatedMods) {
      setModelsList(newModels);
      localStorage.setItem('ir_models', JSON.stringify(newModels));
    }

    triggerNotification(
      'ثبت کد خطای جدید',
      `کد خطای ${freshErr.code} متعلق به برند "${freshErr.brand}" ثبت گردید و هم‌اکنون در صف بررسی مدیر است.`,
      'success'
    );
  };

  // ADMIN METHODS
  const handleApproveErrorCode = (id: string) => {
    const target = errorCodes.find(err => err.id === id);
    const updated = errorCodes.map(err => {
      if (err.id === id) {
        return { ...err, isApproved: true };
      }
      return err;
    });
    saveErrorsToStorage(updated);
    triggerNotification('ممیزی کد خطا تایید شد', 'کد خطای جدید مورد تایید علمی قرار گرفت و منتشر شد.', 'success');
  };

  const handleRejectErrorCode = (id: string) => {
    const target = errorCodes.find(err => err.id === id);
    const updated = errorCodes.filter(err => err.id !== id);
    saveErrorsToStorage(updated);
    triggerNotification('پیشنهاد کد خطا حذف گردید', 'عیب‌یابی ثبت شده توسط ادمین تایید نشد و حذف گردید.', 'warning');
  };

  const handleVerifyTechnician = (id: string, isVerified: boolean) => {
    const target = technicians.find(t => t.id === id);
    const updated = technicians.map(t => {
      if (t.id === id) {
        return { 
          ...t, 
          isVerified,
          documents: isVerified ? t.documents : [] // Force resubmission by wiping existing documents upon suspension
        };
      }
      return t;
    });
    saveTechsToStorage(updated);
    triggerNotification(
      isVerified ? 'تکنسین تایید صلاحیت شد' : 'تکنسین معلق گردید',
      isVerified ? 'وضعیت تایید هویت تکنسین کلیدی بروزرسانی و فعال شد.' : 'همکاری معلق گردید و به دلیل تعلیق دسترسی، نامبرده ملزم به ارسال مجدد اسناد صلاحیت شد.',
      isVerified ? 'success' : 'info'
    );
  };

  const handleUpdatePartStock = (id: string, newStock: number, newPrice: number) => {
    const updated = spareParts.map(p => {
      if (p.id === id) {
        return { ...p, stock: newStock, price: newPrice };
      }
      return p;
    });
    savePartsToStorage(updated);
    triggerNotification('ویراستار قطعات انبار', 'قیمت و تعداد موجودی با موفقیت اصلاح شد.', 'success');
  };

  const handleAdminCancelOrder = (orderId: string) => {
    handleUpdateOrderStatus(orderId, 'cancelled');
  };

  const handleApprovePayment = async (paymentId: string) => {
    const pIndex = paymentsList.findIndex(p => p.id === paymentId);
    if (pIndex === -1) return;
    
    const payment = paymentsList[pIndex];
    if (payment.status === 'completed') return;
    
    const updatedPayments = [...paymentsList];
    updatedPayments[pIndex] = {
      ...payment,
      status: 'completed',
      completed_at: new Date().toISOString()
    };
    
    const plansList = [
      { id: "1_month", duration_days: 30 },
      { id: "3_month", duration_days: 90 },
      { id: "6_month", duration_days: 180 },
      { id: "12_month", duration_days: 365 }
    ];
    const selectedPlan = plansList.find(pl => pl.id === payment.plan) || plansList[0];
    
    const activeSub = subscriptionsList
      .filter((s: any) => s.user_id === payment.user_id && s.is_active && new Date(s.expiry_date) > new Date())
      .sort((a: any, b: any) => new Date(b.expiry_date).getTime() - new Date(a.expiry_date).getTime())[0];

    let baseTime = activeSub ? new Date(activeSub.expiry_date) : new Date();
    baseTime.setDate(baseTime.getDate() + selectedPlan.duration_days);
    const newExpiryDateStr = baseTime.toISOString();
    
    const newSub = {
      id: `sub_card_${Date.now()}`,
      user_id: payment.user_id,
      plan_name: payment.plan,
      start_date: new Date().toISOString(),
      expiry_date: newExpiryDateStr,
      is_active: true
    };
    
    const updatedSubList = [...subscriptionsList, newSub];
    
    setPaymentsList(updatedPayments);
    setSubscriptionsList(updatedSubList);
    
    const success = await syncWithBackend({
      payments: updatedPayments,
      subscriptions: updatedSubList
    });
    
    if (success) {
      triggerNotification('تایید عضویت پرداخت', 'اشتراک ویژه با تایید تراکنش با موفقیت فعال شد.', 'success');
    }
  };

  const handleRejectPayment = async (paymentId: string) => {
    const pIndex = paymentsList.findIndex(p => p.id === paymentId);
    if (pIndex === -1) return;
    
    const payment = paymentsList[pIndex];
    const updatedPayments = [...paymentsList];
    updatedPayments[pIndex] = {
      ...payment,
      status: 'failed'
    };
    
    setPaymentsList(updatedPayments);
    const success = await syncWithBackend({
      payments: updatedPayments
    });
    if (success) {
      triggerNotification('رد فیش تراکنش', 'تراکنش مربوطه به حالت ناموفق تغییر یافت.', 'warning');
    }
  };

  const activeTrackingSteps = [
    { label: 'ثبت شد', value: 'registered' },
    { label: 'در انتظار تکنسین', value: 'waiting' },
    { label: 'پذیرفته شد', value: 'accepted' },
    { label: 'تکنسین در مسیر', value: 'enroute' },
    { label: 'تعمیر در حال انجام', value: 'repairing' },
    { label: 'نیاز به قطعه یدکی', value: 'needs_part' },
    { label: 'تکمیل شد', value: 'completed' },
    { label: 'لغو شد', value: 'cancelled' }
  ];

  const getStepProgressPercentage = (status: RepairOrder['status']) => {
    const steps = ['registered', 'waiting', 'accepted', 'enroute', 'repairing', 'needs_part', 'completed'];
    const idx = steps.indexOf(status);
    if (idx === -1) return 100; // cancelled or invalid is full/different
    return Math.round(((idx + 1) / steps.length) * 100);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-start items-center p-0 md:p-6 lg:p-8 font-sans transition-all duration-300">
      
      {/* Boxed Content Frame */}
      <div className="w-full max-w-6xl bg-white border border-slate-200/90 shadow-2xl md:rounded-3xl flex flex-col overflow-visible relative">
      
      {/* Universal Top Notification Banner */}
      <div className="bg-slate-900 border-b border-slate-800 text-slate-350 py-1.5 px-4 text-[10px] sm:text-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>سامانه متمرکز خدمات پس از فروش و رفع عیوب مکانیکی، کولر، برودت و پکیج ایران</span>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <a href={`tel:${supportPhone}`} className="text-white hover:text-amber-300 transition-colors flex items-center gap-1 font-extrabold animate-pulse">
              <span>📞 پشتیبانی فوری: {supportPhone}</span>
            </a>
            <span className="text-slate-500">|</span>
            <span>بیمه ۱۸۰ روزه قطعه و اجرت کارگذار</span>
          </div>
        </div>
      </div>

      {/* Admin Broadcast Announcement Bar */}
      {adminAnnouncement?.isActive && adminAnnouncement?.text && !announcementDismissed && (
        <div className={`w-full py-3 px-4 flex items-center justify-between text-right gap-3 transition-all duration-300 border-b animate-in slide-in-from-top ${
          adminAnnouncement.style === 'success' 
            ? 'bg-emerald-50 border-emerald-100/90 text-emerald-900' 
            : adminAnnouncement.style === 'warning' 
            ? 'bg-amber-50 border-amber-100/90 text-amber-900' 
            : adminAnnouncement.style === 'danger' 
            ? 'bg-rose-50 border-rose-100/80 text-rose-950 font-semibold' 
            : 'bg-blue-50 border-blue-100/90 text-blue-950'
        }`} id="admin-global-announcement">
          <div className="flex items-center gap-2.5 mx-auto">
            <Megaphone className={`w-4 h-4 flex-shrink-0 animate-bounce ${
              adminAnnouncement.style === 'danger' ? 'text-rose-600' : 'text-blue-600'
            }`} />
            <span className="text-[11px] sm:text-xs leading-relaxed font-black">
              {adminAnnouncement.text}
            </span>
          </div>
          <button
            id="dismiss-announcement-btn"
            onClick={() => {
              setAnnouncementDismissed(true);
              localStorage.setItem('ir_announcement_dismissed_text', adminAnnouncement.text);
            }}
            className="p-1.5 rounded-full hover:bg-black/5 text-slate-500 hover:text-slate-800 transition-all font-bold text-xs shrink-0 cursor-pointer"
            title="بستن این پیام"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Beautiful Header Navigation - Solid Solid Sticky Opaque Layout */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-col md:flex-row items-center justify-between gap-3.5 text-right">
          
          {/* Logo container and mobile actions */}
          <div className="w-full md:w-auto flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-gradient-to-tr from-blue-700 to-sky-500 rounded-2xl flex items-center justify-center text-white shadow-md shadow-blue-500/10 flex-shrink-0">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h1 className="font-extrabold text-xs sm:text-sm text-slate-900 tracking-tight">
                  سامانه هوشمند ایران‌سرویس
                </h1>
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-0.5">
                  <p className="text-[10px] text-slate-400 font-semibold">عیب‌یابی کدهای خطا، ثبت اعزام و تأمین قطعه سراسر کشور</p>
                  <a href={`tel:${supportPhone}`} className="text-[10px] text-emerald-700 hover:text-emerald-800 font-extrabold flex items-center gap-1 bg-emerald-50 border border-emerald-100/70 px-2 py-0.5 rounded-full hover:underline transition-all shadow-3xs" title="تماس فوری با پشتیبانی">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>پشتیبانی: {supportPhone}</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Mobile Actions Only */}
            <div className="flex md:hidden items-center gap-2">
              {roleSelection !== 'none' && currentRole !== 'admin' && (
                <button
                  id="role-exit-mobile-btn"
                  onClick={() => {
                    if (currentRole === 'technician') {
                      handleSetLoggedInTechId(null);
                    }
                    setRoleSelection('none');
                    setCurrentRole('client');
                    setSelectedError(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-250 font-extrabold px-3 py-1.5 rounded-xl text-[10px] cursor-pointer"
                >
                  تغییر نقش
                </button>
              )}
              {currentRole === 'client' && (
                <button
                  onClick={() => {
                    setRoleSelection('client');
                    setClientActiveTab('dashboard');
                  }}
                  className="bg-amber-500 text-slate-900 p-2.5 rounded-xl border border-amber-650/20 shadow-xs flex items-center justify-center cursor-pointer"
                  title="داشبورد من"
                >
                  <User className="w-4.5 h-4.5" />
                </button>
              )}
              <button
                id="back-to-home-header-btn-mobile"
                onClick={() => {
                  setSelectedError(null);
                  setActiveTrackingOrder(null);
                  setTrackingPhoneNumber('');
                  const s = document.getElementById('search-main');
                  if (s) {
                    s.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    s.focus();
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="bg-blue-50 text-blue-700 p-2.5 rounded-xl transition-all border border-blue-200/50 shadow-xs flex items-center justify-center cursor-pointer"
                title="صفحه اصلی"
              >
                <Home className="w-4.5 h-4.5" />
              </button>
              {currentRole === 'admin' && (
                <NotificationCenter
                  notifications={notifications}
                  onClear={handleClearNotifications}
                  onRemove={handleRemoveNotification}
                />
              )}
            </div>
          </div>

          {/* Core App Role Switching Navigation */}
          {isAdmin && (
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl border border-slate-200/60 max-w-full overflow-x-auto scrollbar-none">
              <button
                id="role-client-tab"
                onClick={() => {
                  setCurrentRole('client');
                  setRoleSelection('client');
                  setSelectedError(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  (currentRole as string) === 'client'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50/60'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                <span>پورتال مشتریان روتین</span>
              </button>

              <button
                id="role-technician-tab"
                onClick={() => {
                  setCurrentRole('technician');
                  setRoleSelection('technician');
                  setSelectedError(null);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap flex-shrink-0 ${
                  (currentRole as string) === 'technician'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-650 hover:text-slate-900 hover:bg-slate-50/60'
                }`}
              >
                <Truck className="w-4 h-4" />
                <span>پنل اختصاصی تکنسین‌ها</span>
              </button>

              {isAdmin && currentRole === 'admin' && (
                <button
                  id="role-admin-tab"
                  onClick={() => {
                    setCurrentRole('admin');
                    setRoleSelection('admin');
                    setSelectedError(null);
                  }}
                  className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap bg-rose-600 text-white shadow-sm flex-shrink-0"
                >
                  <Laptop className="w-4 h-4" />
                  <span>مقر مدیریت کشور (خروج با کلیک)</span>
                </button>
              )}
            </div>
          )}

          {/* Desktop Actions Only */}
          <div className="hidden md:flex items-center gap-2.5">
            {roleSelection !== 'none' && currentRole !== 'admin' && (
              <button
                id="role-exit-desktop-btn"
                onClick={() => {
                  if (currentRole === 'technician') {
                    handleSetLoggedInTechId(null);
                  }
                  setRoleSelection('none');
                  setCurrentRole('client');
                  setSelectedError(null);
                }}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 font-bold px-3.5 py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                title="تغییر نقش یا خروج از سیستم"
              >
                <span>خروج و تغییر نقش</span>
              </button>
            )}

            {currentRole === 'client' && (
              <button
                onClick={() => {
                  setRoleSelection('client');
                  setClientActiveTab('dashboard');
                }}
                className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <User className="w-4 h-4" />
                <span>{currentUser ? 'پروفایل / اشتراک من' : 'ورود / ثبت‌نام مشتریان'}</span>
              </button>
            )}

            <button
              id="back-to-home-header-btn"
              onClick={() => {
                setSelectedError(null);
                setActiveTrackingOrder(null);
                setTrackingPhoneNumber('');
                const s = document.getElementById('search-main');
                if (s) {
                  s.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  s.focus();
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
              }}
              className="bg-blue-50 hover:bg-blue-600 text-blue-700 hover:text-white px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer border border-blue-200/50 shadow-xs"
              title="بازگشت زنده به صفحه اصلی عیب‌یابی"
            >
              <Home className="w-4 h-4" />
              <span>صفحه اصلی</span>
            </button>

            {currentRole === 'admin' && (
              <NotificationCenter
                notifications={notifications}
                onClear={handleClearNotifications}
                onRemove={handleRemoveNotification}
              />
            )}
          </div>

        </div>
      </header>

      {/* Admins Masquerading Banner */}
      {isAdmin && currentRole === 'technician' && loggedInTechId && (
        <div className="bg-gradient-to-r from-amber-600 to-rose-600 text-white text-center py-2.5 px-4 text-xs font-bold font-sans flex flex-col sm:flex-row items-center justify-center gap-3 shadow-md border-b border-amber-500/30 animate-in slide-in-from-top duration-300">
          <span>⚠️ دسترسی نظارتی ارشد: شما در حال حاضر کنترل کامل پنل تکنسین <strong>{activeTech?.name || 'مربوطه'}</strong> را به عنوان مدیر کل در اختیار دارید.</span>
          <button
            onClick={() => {
              handleSetLoggedInTechId(null);
              setCurrentRole('admin');
              setRoleSelection('admin');
              triggerNotification('بازگشت به مدیریت', 'با موفقیت به مقر مدیریت کشور بازگشتید.', 'info');
            }}
            className="bg-white/25 hover:bg-white/35 text-white border border-white/40 px-3.5 py-1.5 rounded-xl text-[10px] font-extrabold cursor-pointer transition-colors"
          >
            ← خروج و بازگشت به پنل مدیریت
          </button>
        </div>
      )}

      {/* Main Content Body Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        
        <AnimatePresence mode="wait">
          {/* USER SELECTION IDENTITY GATE - RENDERED BY DEFAULT ON NEW VISITS */}
          {roleSelection === 'none' && currentRole !== 'admin' && (
            <motion.div
              key="gateway-gate"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="max-w-4xl mx-auto my-4 space-y-8 text-center font-sans animate-fade-in"
            >
              <div className="space-y-3">
                <span className="bg-blue-50 text-blue-700 border border-blue-200 px-4 py-1.5 rounded-full text-xs font-black inline-block shadow-xs">
                  درگاه ورودی اختصاصی پلتفرم ایران‌سرویس 🇮🇷
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-relaxed">
                  لطفاً نقش خود را جهت ورود به پورتال انتخاب فرمایید
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-xl mx-auto leading-relaxed">
                  جهت تسریع در خدمات فنی کشور، دسترسی مشتریان محترم و تکنسین‌های فنی صنف به صورت کامل مجزا و تفکیک گردیده است.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                {/* 1. CUSTOMER PORTAL GATE */}
                <div 
                  onClick={() => {
                    setRoleSelection('client');
                    setCurrentRole('client');
                  }}
                  className="bg-white border-2 border-slate-200 hover:border-blue-600 rounded-3xl p-6 sm:p-8 text-right space-y-5 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group select-none"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 group-hover:bg-blue-100/50 rounded-full -mr-16 -mt-16 transition-colors" />
                  
                  <div className="relative z-10 w-12 h-12 bg-blue-100 text-blue-700 rounded-2xl flex items-center justify-center border border-blue-200 shadow-sm mb-4">
                    <Smartphone className="w-6 h-6" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <h3 className="font-black text-md sm:text-lg text-slate-900 group-hover:text-blue-700 transition-colors">
                      ورود به عنوان مشتری (یافتن کدهای ارور / اعزام فوری تعمیرکار)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      اگر صاحب دستگاه معیوب هستید؛ عکس یا کد خطا را عیب‌یابی کنید، راهکارهای علمی را مطالعه کنید، استعلام قطعه بگیرید یا نوبت اعزام تعمیرکار ثبت نمایید.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold">بخش عمومی - بدون نیاز به حساب</span>
                    <span className="bg-blue-600 group-hover:bg-blue-700 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1">
                      ورود به پورتال مشتریان
                    </span>
                  </div>
                </div>

                {/* 2. TECHNICIAN PORTAL GATE */}
                <div 
                  onClick={() => {
                    setRoleSelection('technician');
                    setCurrentRole('technician');
                  }}
                  className="bg-white border-2 border-slate-200 hover:border-slate-900 rounded-3xl p-6 sm:p-8 text-right space-y-5 cursor-pointer hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 relative overflow-hidden group select-none"
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-slate-100 group-hover:bg-slate-200/50 rounded-full -mr-16 -mt-16 transition-colors" />
                  
                  <div className="relative z-10 w-12 h-12 bg-slate-900 text-white rounded-2xl flex items-center justify-center border border-slate-800 shadow-sm mb-4">
                    <Truck className="w-6 h-6" />
                  </div>

                  <div className="relative z-10 space-y-2">
                    <h3 className="font-black text-md sm:text-lg text-slate-900 group-hover:text-slate-950 transition-colors">
                      ورود به عنوان همکار فنی (تکنسین متخصص صنف)
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      ویژه همکاران فنی و ارائه‌دهندگان خدمات مهارتی. دسترسی گام‌به‌گام به مأموریت‌ها، مدارک پرونده و ثبت راهکارهای فنی برندهای همکار کشور.
                    </p>
                  </div>

                  <div className="relative z-10 flex items-center justify-between pt-4 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-bold">ملزم به احراز هویت و کلمه عبور</span>
                    <span className="bg-slate-900 group-hover:bg-black text-white rounded-xl px-4 py-2 text-xs font-bold transition-all flex items-center gap-1">
                      احراز هویت و ورود تکنسین
                    </span>
                  </div>
                </div>
              </div>

              {/* Master Administrator quick simulation gateway - Elegant & Seamless (Only visible on admin paths/addresses) */}
              {(currentPath === '/admin-panel' || currentPath === '/admin') && (
                <div className="pt-6 border-t border-slate-205 flex flex-col items-center justify-center gap-2">
                  <p className="text-[10.5px] text-slate-500 font-semibold">توسعه‌دهنده گرامی یا ناظر ارشد سیستم کل کشور؟</p>
                  <button
                    onClick={() => {
                      window.history.pushState({}, '', '/admin-panel');
                      window.dispatchEvent(new PopStateEvent('popstate'));
                    }}
                    className="bg-slate-900 hover:bg-slate-950 text-rose-500 hover:text-rose-450 border border-slate-200 hover:border-slate-300 font-black px-6 py-3 rounded-2xl text-[11px] cursor-pointer transition-all flex items-center gap-2 shadow-md hover:shadow-lg active:scale-95 duration-150"
                    title="ورود به پنل ممیزی و مانیتورینگ کل کشور"
                  >
                    <Shield className="w-4.5 h-4.5 text-rose-600 animate-pulse" />
                    <span>ورود به سامانه نظارت و مانیتورینگ مدیریت ارشد ایران‌سرویس (رمز پیش‌فرض: admin)</span>
                  </button>
                </div>
              )}

            </motion.div>
          )}

          {/* 1. CUSTOMER PORTAL */}
          {roleSelection === 'client' && currentRole === 'client' && (
            <ErrorBoundary fallbackTitle="خطا در بارگذاری پنل عیب‌یابی لوازم خانگی">
              <motion.div
                key="client-portal"
                initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="space-y-8"
            >
              {/* Tab Selector pills for Client Portal */}
              <div className="flex justify-center mb-6">
                <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200/80 flex items-center gap-1.5 shadow-2xs">
                  <button
                    onClick={() => setClientActiveTab('search')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                      clientActiveTab === 'search'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Search className="w-4 h-4" />
                    <span>جستجو و عیب‌یابی کدهای خطا</span>
                  </button>
                  <button
                    onClick={() => setClientActiveTab('dashboard')}
                    className={`px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 relative ${
                      clientActiveTab === 'dashboard'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <User className="w-4 h-4" />
                    <span>داشبورد و حساب کاربری</span>
                    {currentUser?.subscription?.is_premium && (
                      <span className="absolute top-1 left-1.5 w-2 h-2 bg-amber-500 rounded-full" />
                    )}
                  </button>
                </div>
              </div>

              {clientActiveTab === 'dashboard' ? (
                <ClientDashboard
                  currentUser={currentUser}
                  checkAuth={checkAuth}
                  onLogout={() => setCurrentUser(null)}
                  triggerNotification={triggerNotification}
                  citiesList={citiesList}
                />
              ) : (
                <>
                  {/* Error Search and visual diagnosing Engine section - Placed First for Max Saliency */}
              <div id="quick-diagnosis-section" className="scroll-mt-24 space-y-4">
                <div className="bg-blue-600 text-white rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-sm border border-blue-700/50">
                  <div className="space-y-0.5">
                    <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded-md inline-block">راهنمای هوشمند پیشگیری</span>
                    <h3 className="font-bold text-xs sm:text-xs">ابتدا کد ارور خود را عیب‌یابی کنید</h3>
                    <p className="text-blue-100 text-[10px]">بیش از ۹۰٪ خرابی‌های لوازم خانگی به صورت دستی با عیب‌یابی کدهای خطا مرتفع شده است.</p>
                  </div>
                  <button
                    onClick={() => {
                      const s = document.getElementById('search-main');
                      if (s) s.focus();
                    }}
                    className="bg-white text-blue-700 text-[10px] sm:text-xs font-extrabold px-3.5 py-1.5 rounded-xl hover:bg-blue-50 transition-colors w-max"
                  >
                    پرش سریع به فیلد جستجو
                  </button>
                </div>

                <ErrorSearch
                  errorCodes={errorCodes.filter(c => c.isApproved)}
                  commonProblems={commonProblems}
                  spareParts={spareParts}
                  onSelectError={setSelectedError}
                  selectedError={selectedError}
                  onBookRepair={(err) => {
                    setSelectedError(err);
                    setIsBookingOpen(true);
                  }}
                  onFilterParts={handleFilterPartsForSelectedError}
                  onSearchActiveChange={setIsSearchActive}
                  currentUser={currentUser}
                  onGoToDashboard={() => {
                    setRoleSelection('client');
                    setClientActiveTab('dashboard');
                    setTimeout(() => {
                      const element = document.getElementById('client-premium-plans-section') || document.getElementById('role-client-tab');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }
                    }, 200);
                  }}
                  onPurchase={handlePurchasePart}
                />
              </div>

              {!isSearchActive && (
                <>
                  {/* Promotional Hero Block */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-950 to-blue-955 text-white rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-lg">
                <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/5 rounded-full blur-3xl" />

                <div className="relative z-10 max-w-3xl space-y-4">
                  <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10.5px] font-bold px-3 py-1 rounded-full inline-block">
                    مرجع جامع کدهای ارور لوازم خانگی ایران
                  </span>
                  
                  <h2 className="text-xl sm:text-2xl font-extrabold leading-normal sm:leading-relaxed text-white">
                    حل سریع و تضمینی تمام کدهای خطای پکیج، کولرگازی و لباسشویی
                  </h2>

                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    دیگر نیازی به گشت و گذارهای خسته‌کننده در سایت‌های نامعتبر نیست. اینجا کدهای ارور تمام برندها (بوتان، ایران رادیاتور، ال‌جی، سامسونگ، اسنوا و...) به صورت علمی مستند شده است. در صورت نیاز، متبحرترین تکنسین محلی در کنار شماست.
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      id="scroll-to-search-btn"
                      onClick={() => {
                        const s = document.getElementById('search-main');
                        if (s) {
                          s.scrollIntoView({ behavior: 'smooth', block: 'center' });
                          s.focus();
                        }
                      }}
                      className="bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold py-2.5 px-5 transition-transform hover:scale-[1.02] cursor-pointer"
                    >
                      شروع عیب‌یابی فوری کد خطا
                    </button>
                    
                    <button
                      id="order-repair-direct"
                      onClick={() => setIsBookingOpen(true)}
                      className="bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-xl text-xs font-semibold py-2.5 px-5 transition-transform hover:scale-[1.02] cursor-pointer"
                    >
                      اعزام مستقیم تعمیرکار بدون کد خطا
                    </button>
                  </div>
                </div>
              </div>

              {/* Online Tracker Module per customer request */}
              <div id="tracking-section" className="bg-white rounded-2xl border border-slate-205 p-5 shadow-xs space-y-4">
                <div className="border-r-3 border-sky-505 pr-2">
                  <h3 className="font-extrabold text-slate-800 text-xs sm:text-xs">پیگیری برخط وضعیت گام‌های سفارش تعمیر</h3>
                  <p className="text-slate-400 text-[10px] mt-0.5">شماره موبایلی که با آن سفارش داده‌اید را وارد کنید تا وضعیت لحظه‌ای تکنسین در مسیر را پیگیری کنید.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
                  <input
                    id="track-phone-input"
                    type="tel"
                    placeholder="مثال: 09123456789"
                    value={trackingPhoneNumber}
                    onChange={(e) => setTrackingPhoneNumber(e.target.value.replace(/[^0-9۰-۹\u0660-\u0669\u06f0-\u06f9]/g, ''))}
                    className="bg-slate-50 border border-slate-220 text-xs px-4 py-2.5 rounded-xl flex-1 focus:bg-white outline-none focus:border-blue-500 text-left font-mono"
                  />
                  <button
                    id="track-phone-submit"
                    onClick={handleSearchTrackingPhoneNumber}
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold py-2.5 px-5 transition-colors cursor-pointer"
                  >
                    پیگیری آنلاین وضعیت
                  </button>
                </div>

                {/* Tracking Progress visualized */}
                {activeTrackingOrder && (
                  <div className="mt-4 bg-blue-50/20 border border-blue-100 rounded-2xl p-4 sm:p-5 space-y-4 animate-in fade-in slide-in-from-top-3 duration-200">
                    <div className="flex flex-wrap items-center justify-between gap-1 border-b border-blue-105 pb-3">
                      <div>
                        <span className="text-[10px] text-slate-400 block">برند و مدل دستگاه</span>
                        <span className="text-slate-800 font-bold text-xs">
                          {activeTrackingOrder.category} {activeTrackingOrder.brand} {activeTrackingOrder.model && `(${activeTrackingOrder.model})`}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block">کد رهگیری فاکتور</span>
                        <span className="text-blue-700 font-bold font-mono text-xs">{activeTrackingOrder.id}</span>
                      </div>
                    </div>

                    {/* Progress milestone line */}
                    <div>
                      <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-2">
                        <span>روند پیشرفت:</span>
                        <span className="text-blue-600">{getStepProgressPercentage(activeTrackingOrder.status)}٪</span>
                      </div>
                      
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                        <div 
                          className="bg-blue-600 h-full rounded-full transition-all duration-500" 
                          style={{ width: `${getStepProgressPercentage(activeTrackingOrder.status)}%` }} 
                        />
                      </div>
                    </div>

                    {/* Horizon display dots */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-center pt-2">
                      {activeTrackingSteps.map((s) => {
                        const isCurrent = activeTrackingOrder.status === s.value;
                        return (
                          <div 
                            key={s.value} 
                            className={`p-2 rounded-xl border text-[10px] font-bold transition-all ${
                              isCurrent 
                                ? 'bg-blue-600 text-white border-blue-650 scale-105 shadow-xs' 
                                : 'bg-slate-100/60 text-slate-500 border-slate-100'
                            }`}
                          >
                            <span>{s.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-white rounded-xl border border-slate-150 p-3 text-xs leading-relaxed text-slate-600 block sm:flex sm:items-center justify-between gap-4 font-sans">
                      <div>
                        <strong>وضعیت تکنسین: </strong>
                        {activeTrackingOrder.technicianName ? (
                          <span>جناب {activeTrackingOrder.technicianName} عهده‌دار سفارش هستند (شماره تماس: <span className="font-semibold">{activeTrackingOrder.technicianPhone}</span>)</span>
                        ) : (
                          <span>در حال جستجوی نزدیک‌ترین تکنسین تایید صلاحیت شده در محله شما...</span>
                        )}
                        {activeTrackingOrder.repairLog && (
                          <div className="mt-1 text-[11px] text-blue-700 bg-blue-50/50 p-1.5 rounded-lg">گزارش کار نهایی: {activeTrackingOrder.repairLog}</div>
                        )}
                      </div>

                      {/* Display cancel option for clients if order is still fresh */}
                      {activeTrackingOrder.status === 'waiting' && (
                        <button
                          id="client-cancel-own-order"
                          onClick={() => handleUpdateOrderStatus(activeTrackingOrder.id, 'cancelled')}
                          className="text-rose-600 hover:text-white hover:bg-rose-600 border border-rose-200 text-[10px] py-1 px-3 rounded-lg flex-shrink-0 cursor-pointer text-center mt-2 sm:mt-0"
                        >
                          انصراف از رزرو نوبت
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* 14. SPARE PARTS MARKETPLACE SECTION */}
              <div id="parts-store-section">
                <PartsStore
                  parts={spareParts}
                  onPurchase={handlePurchasePart}
                  brandFilter={shopBrandFilter}
                  categoryFilter={shopCategoryFilter}
                  onClearFilters={() => {
                    setShopBrandFilter('');
                    setShopCategoryFilter('');
                  }}
                />
              </div>
            </>
          )}
                </>
              )}
        </motion.div>
            </ErrorBoundary>
          )}

          {/* 2. TECHNICIAN PORTAL */}
          {roleSelection === 'technician' && currentRole === 'technician' && (
            <ErrorBoundary fallbackTitle="خطا در پردازش پنل اختصاصی تکنسین‌های فنی">
              <motion.div
                key="technician-portal"
                initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              {loggedInTechId && activeTech && (activeTech.isVerified || isAdmin) ? (
                <TechnicianPanel
                  technicians={technicians}
                  activeTech={activeTech}
                  orders={orders}
                  spareParts={spareParts}
                  onAcceptOrder={handleAcceptOrder}
                  onUpdateOrderStatus={handleUpdateOrderStatus}
                  onNewErrorSubmit={handleNewErrorCodeSubmitFromTech}
                  triggerNotification={triggerNotification}
                  onUpdateTechnician={(techId, updatedFields) => {
                    const updated = technicians.map(t => {
                      if (t.id === techId) {
                        return { ...t, ...updatedFields };
                      }
                      return t;
                    });
                    saveTechsToStorage(updated);
                  }}
                  onLogout={() => {
                    const isAdminActive = isAdmin;
                    handleSetLoggedInTechId(null);
                    if (isAdminActive) {
                      setCurrentRole('admin');
                      setRoleSelection('admin');
                      triggerNotification('پایان مدیریت هویت', 'با موفقیت به مقر مدیریت کشور بازگشتید.', 'info');
                    } else {
                      setRoleSelection('none');
                      setCurrentRole('client');
                      triggerNotification('خروج موفق', 'با موفقیت از پنل اختصاصی تکنسین خارج شدید.', 'info');
                    }
                  }}
                  onChangeTech={(id) => {
                    const techObj = technicians.find(t => t.id === id);
                    if (techObj) {
                      handleSetLoggedInTechId(id);
                      // switch active technician simulation
                      const temp = [...technicians];
                      const idx = temp.findIndex(t => t.id === id);
                      if (idx > -1) {
                        temp.splice(idx, 1);
                        temp.unshift(techObj); // Make first
                        setTechnicians(temp);
                      }
                    }
                  }}
                />
              ) : (
                <TechnicianAuth
                  technicians={technicians}
                  loggedInTech={loggedInTechId && activeTech ? activeTech : null}
                  citiesList={citiesList}
                  categoriesList={categoriesList}
                  onRegister={(newTech) => {
                    const updated = [...technicians, newTech];
                    saveTechsToStorage(updated);
                    // Automatically mark password and cache so they fall into login context
                    handleSetLoggedInTechId(newTech.id);
                  }}
                  onLoginSuccess={(techId) => {
                    handleSetLoggedInTechId(techId);
                  }}
                  onLogout={() => {
                    handleSetLoggedInTechId(null);
                    setRoleSelection('none');
                    triggerNotification('خروج از حساب', 'با موفقیت از سامانه احراز هویت خارج شدید.', 'info');
                  }}
                  onResubmitDocs={(techId, newDocs) => {
                    const updated = technicians.map(t => {
                      if (t.id === techId) {
                        return { ...t, documents: newDocs };
                      }
                      return t;
                    });
                    saveTechsToStorage(updated);
                    triggerNotification('ارسال مجدد مدارک', 'اسناد جدید صلاحیت شغلی صمیمانه پیوست شد و در صف اولویت ممیزی قرار گرفت.', 'success');
                  }}
                  triggerNotification={triggerNotification}
                />
              )}
            </motion.div>
            </ErrorBoundary>
          )}

          {/* 3. ADMINISTRATIVE CONTROL PANEL */}
          {currentRole === 'admin' && (
            <ErrorBoundary fallbackTitle="خطا در پردازش داشبورد ممیزی مدیریت کل">
              <motion.div
                key="admin-portal"
                initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
            >
              <AdminPanel
                orders={orders}
                errorCodes={errorCodes}
                usersList={usersList}
                subscriptionsList={subscriptionsList}
                paymentsList={paymentsList}
                adminPassword={adminPassword}
                adminAnnouncement={adminAnnouncement}
                onUpdateAdminAnnouncement={(announcement) => {
                  setAdminAnnouncement(announcement);
                  localStorage.setItem('ir_announcement', JSON.stringify(announcement));
                  syncWithBackend({ adminAnnouncement: announcement });
                }}
                trustBadges={trustBadges}
                onUpdateTrustBadges={(badges) => {
                  setTrustBadges(badges);
                  localStorage.setItem('ir_trust_badges', JSON.stringify(badges));
                  syncWithBackend({ trustBadges: badges });
                }}
                supportPhone={supportPhone}
                onUpdateSupportPhone={(phone) => {
                  setSupportPhone(phone);
                  localStorage.setItem('ir_support_phone', phone);
                  syncWithBackend({ supportPhone: phone });
                }}
                onUpdateAdminPassword={(newPass) => {
                  setAdminPassword(newPass);
                  localStorage.setItem('ir_admin_password', newPass);
                  syncWithBackend({ adminPassword: newPass });
                }}
                smsSettings={smsSettings}
                onUpdateSmsSettings={(settings) => {
                  setSmsSettings(settings);
                  syncWithBackend({ smsSettings: settings });
                }}
                smsLogs={smsLogs}
                onSendTestSms={dispatchSmsNotification}
                technicians={technicians}
                spareParts={spareParts}
                citiesList={citiesList}
                brandsList={brandsList}
                categoriesList={categoriesList}
                modelsList={modelsList}
                onApproveErrorCode={handleApproveErrorCode}
                onRejectErrorCode={handleRejectErrorCode}
                onVerifyTechnician={handleVerifyTechnician}
                onUpdatePartStock={handleUpdatePartStock}
                onAdminCancelOrder={handleAdminCancelOrder}
                onApprovePayment={handleApprovePayment}
                onRejectPayment={handleRejectPayment}
                onUpdateCitiesList={(list) => {
                  setCitiesList(list);
                  localStorage.setItem('ir_cities', JSON.stringify(list));
                  syncWithBackend({ citiesList: list });
                }}
                onUpdateBrandsList={(list) => {
                  setBrandsList(list);
                  localStorage.setItem('ir_brands', JSON.stringify(list));
                  syncWithBackend({ brandsList: list });
                }}
                onUpdateCategoriesList={(list) => {
                  setCategoriesList(list);
                  localStorage.setItem('ir_categories', JSON.stringify(list));
                  syncWithBackend({ categoriesList: list });
                }}
                onUpdateModelsList={(list) => {
                  setModelsList(list);
                  localStorage.setItem('ir_models', JSON.stringify(list));
                  syncWithBackend({ modelsList: list });
                }}
                onUpdateErrorCodesList={(list) => {
                  setErrorCodes(list);
                  localStorage.setItem('ir_errors', JSON.stringify(list));
                  syncWithBackend({ errorCodes: list });
                }}
                onUpdateSparePartsList={(list) => {
                  setSpareParts(list);
                  localStorage.setItem('ir_parts', JSON.stringify(list));
                  syncWithBackend({ spareParts: list });
                }}
                commonProblems={commonProblems}
                onUpdateCommonProblemsList={saveCommonProblemsToStorage}
                partPurchases={partPurchases}
                onUpdatePartPurchases={savePurchasesToStorage}
                pageContents={pageContents}
                onUpdatePageContents={savePageContentsToStorage}
                userFeedbacks={userFeedbacks}
                onUpdateUserFeedbacks={saveFeedbacksToStorage}
                onLoginAsTechnician={(techId) => {
                  handleSetLoggedInTechId(techId);
                  setCurrentRole('technician');
                  setRoleSelection('technician');
                  triggerNotification('دسترسی نظارت ارشد', 'ورود موازی مدیریت و کنترل کامل پنل اختصاصی تکنسین فعال گردید.', 'success');
                }}
                onResetDatabase={async () => {
                  setOrders([]);
                  setTechnicians([]);
                  setErrorCodes([]);
                  setCommonProblems(INITIAL_COMMON_PROBLEMS);
                  setSpareParts([]);
                  setNotifications([]);
                  setCitiesList(IRAN_CITIES);
                  setBrandsList(APPLIANCE_BRANDS);
                  setCategoriesList(APPLIANCE_CATEGORIES);
                  setModelsList([]);
                  localStorage.setItem('ir_orders', '[]');
                  localStorage.setItem('ir_techs', '[]');
                  localStorage.setItem('ir_errors', '[]');
                  localStorage.setItem('ir_common_problems', JSON.stringify(INITIAL_COMMON_PROBLEMS));
                  localStorage.setItem('ir_parts', '[]');
                  localStorage.setItem('ir_notifs', '[]');
                  localStorage.setItem('ir_cities', JSON.stringify(IRAN_CITIES));
                  localStorage.setItem('ir_brands', JSON.stringify(APPLIANCE_BRANDS));
                  localStorage.setItem('ir_categories', JSON.stringify(APPLIANCE_CATEGORIES));
                  localStorage.setItem('ir_models', '[]');
                  try {
                    await syncWithBackend({
                      orders: [],
                      technicians: [],
                      errorCodes: [],
                      commonProblems: INITIAL_COMMON_PROBLEMS,
                      spareParts: [],
                      smsLogs: [],
                      citiesList: IRAN_CITIES,
                      brandsList: APPLIANCE_BRANDS,
                      categoriesList: APPLIANCE_CATEGORIES,
                      modelsList: []
                    });
                    
                    // Send simulated SMS alert to the manager
                    const managerSmsMsg = 'مدیر گرامی، دیتابیس سراسری ایران‌سرویس و کدهای عیب‌یابی با موفقیت کاملاً پاکسازی و ریست شدند. آماده ثبت اطلاعات جدید هستیم.';
                    dispatchSmsNotification('09120000000', managerSmsMsg, 'status');

                    triggerNotification('تنظیم مجدد کلان‌داده‌ها', 'دیتابیس سراسری و تمام داده‌های هویتی، انبار، خطاها و عیب‌یابی‌ها با موفقیت صفر شدند.', 'warning');
                    triggerNotification('پاکسازی کامل', 'پاکسازی دیتابیس با موفقیت انجام یافت! هم‌اکنون داده‌های سامانه صفر شده و آماده ثبت اطلاعات جدید شماست.', 'success');
                    triggerNotification('پیام مخابراتی به مدیر', 'پیامک امنیتی گزارش پاکسازی کامل کلان‌داده‌ها با موفقیت برای مدیریت کل ارسال شد.', 'success');
                    
                    alert('⚠️ مدیریت محترم ایران‌سرویس\n\nکلان‌داده‌های دیتابیس شامل سفارشات، کدهای خطا و تکنسین‌ها با موفقیت پاکسازی و ریست گردید.\n\nپیامک گزارش ایمنی این اقدام به شماره همراه مدیریت ارسال شد.');
                  } catch (err: any) {
                    triggerNotification('خطای همگام‌سازی', 'خطا در همگام‌سازی ریست دیتابیس با سرور مرکزی.', 'warning');
                  }
                }}
                onUpdateTechniciansList={saveTechsToStorage}
                onLogout={async () => {
                  try {
                    const token = localStorage.getItem('session_user_id') || '';
                    await fetch('/api/auth/logout', { 
                      method: 'POST',
                      headers: { 'X-Session-Token': token }
                    });
                  } catch (e) {}
                  localStorage.removeItem('session_user_id');
                  setCurrentUser(null);
                  window.history.pushState({}, '', '/');
                  setCurrentRole('client');
                  setRoleSelection('none');
                  setCurrentPath('/');
                  triggerNotification('خروجی ایمن', 'شما به صورت موفقیت‌آمیز از پنل مدیریت خارج شدید.', 'success');
                }}
                onForceRefreshDatabase={async () => {
                  await loadDatabase(true);
                }}
              />
            </motion.div>
            </ErrorBoundary>
          )}
        </AnimatePresence>

      </main>

      {/* Booking Form Overlay Drawer */}
      {isBookingOpen && (
        <BookingForm
          prefilledError={selectedError}
          onBookingSubmit={handleBookingSubmit}
          onClose={() => setIsBookingOpen(false)}
          citiesList={citiesList}
          brandsList={brandsList}
          categoriesList={categoriesList}
          onSendSms={dispatchSmsNotification}
        />
      )}

      {/* Booking Success On-Screen Notification Modal */}
      {successOrder && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[4px] font-sans text-right dir-rtl" id="booking-success-modal">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Success Header banner styled beautifully with custom background gradient */}
            <div className="bg-gradient-to-l from-emerald-600 to-teal-600 text-white p-6 text-center space-y-2 relative">
              <div className="mx-auto w-12 h-12 bg-white/20 rounded-full flex items-center justify-center animate-bounce mb-1">
                <Check className="w-6 h-6 text-white stroke-[3.5]" />
              </div>
              <h3 className="font-extrabold text-base">ثبت موفقیت‌آمیز سفارش کار</h3>
              <p className="text-[11px] text-emerald-50">درخواست شما با موفقیت در شبکه همکاران ایران‌سرویس گشایش گردید</p>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl text-xs space-y-2.5">
                <div className="text-center font-extrabold text-[13px] text-slate-800 border-b border-slate-200/55 pb-2.5 mb-2 flex items-center justify-center gap-1.5">
                  <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md text-[10px] font-bold">تأییدیه رزرو</span>
                  <span>جزئیات پرونده فنی و تعمیراتی فرستاده شده</span>
                </div>
                <div className="grid grid-cols-2 gap-3.5 text-slate-705 leading-relaxed font-sans">
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">نام متقاضی محترم:</span>
                    <strong className="text-slate-900 font-extrabold">{successOrder.customerName}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">کد رهگیری پیگیری فاکتور:</span>
                    <strong className="text-blue-700 font-extrabold font-mono text-xs">{successOrder.id}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">نوع سرویس و محصول:</span>
                    <strong className="text-slate-900 font-extrabold">
                      {successOrder.category === 'پکیج دیواری' ? 'تعمیر پکیج دیواری' : `تعمیر ${successOrder.category}`} {successOrder.brand}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9.5px]">مدل و خطای اعلام شده:</span>
                    <strong className="text-orange-600 font-bold font-mono">{successOrder.errorCode || 'عیب‌یابی عمومی'}</strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/40 pt-2.5">
                    <span className="text-slate-400 block text-[9.5px]">موقعیت مأموریت و خدمت:</span>
                    <strong className="text-slate-850 font-bold">{successOrder.city}، {successOrder.region}، {successOrder.address}</strong>
                  </div>
                  <div className="col-span-2 border-t border-slate-200/40 pt-2.5">
                    <span className="text-slate-400 block text-[9.5px]">زمان مقرر حضور تکنسین:</span>
                    <span className="text-slate-850 font-bold font-semibold text-rose-600">{successOrder.date} (بازه {successOrder.timeSlot})</span>
                  </div>
                </div>
              </div>

              {/* Informative SMS block */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-start gap-2.5">
                <span className="bg-emerald-100 p-1.5 rounded-lg text-emerald-700 mt-0.5 shrink-0">
                  <Smartphone className="w-5 h-5 text-emerald-700" />
                </span>
                <div className="text-[11px] leading-relaxed text-slate-700">
                  <span className="font-extrabold text-emerald-800 block mb-0.5">سیستم پایش پیامکی خدمت:</span>
                  <span>پیامک تأیید نهایی ثبت درخواست و کد رهگیری برای شماره همراه <span className="font-bold underline">{successOrder.customerPhone}</span> ارسال گردید. هم‌اکنون این خدمت به کارتابل تکنسین‌های فعال در محدوده شما ارسال شد.</span>
                </div>
              </div>

              {/* Submit & Close */}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSuccessOrder(null);
                    // Scroll to the online tracking progress section to show it immediately
                    setTimeout(() => {
                      const element = document.getElementById('tracking-section');
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                      }
                    }, 100);
                  }}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold rounded-xl py-3 px-4 text-xs transition-colors shadow-md hover:shadow-lg flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>امضای فاکتور و مشاهده زنده روند کارشناسی</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Brand-new inline gorgeous Modal for Admin Authentication, fully compatible with Sandboxed Iframes */}
      {isAdminLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs font-sans">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 text-right space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="flex items-center gap-1.5 font-black text-rose-600 text-sm">
                <Shield className="w-5 h-5 text-rose-600 animate-pulse animate-duration-1000" />
                سامانه امنیت و پایش عالی ایران‌سرویس
              </span>
              <button 
                onClick={handleCancelAdminLogin}
                className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-1.5 rounded-lg transition-all cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold text-slate-700">تاییدی امنیتی ورود ناظر ممیزی</p>
              <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                به منظور تایید هویت ناظر محترم ارشد، لطفاً کلمه عبور مدیر ارشد سامانه را وارد فرمایید.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-slate-800">کلمه عبور مدیر ارشد:</label>
              <input
                type="password"
                value={adminLoginPasswordInput}
                onChange={(e) => {
                  setAdminLoginPasswordInput(e.target.value);
                  setAdminLoginError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSubmitAdminLogin();
                }}
                className="w-full bg-white border border-slate-200 text-xs px-3.5 py-2.5 rounded-xl outline-none focus:border-rose-600 font-mono text-center text-sm font-extrabold tracking-widest text-slate-900"
                placeholder="••••••"
                autoFocus
              />
              {adminLoginError && (
                <p className="text-rose-600 text-[10px] font-extrabold">{adminLoginError}</p>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                onClick={handleSubmitAdminLogin}
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                کد گشایی و ورود به پنل
              </button>
              <button
                onClick={handleCancelAdminLogin}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold py-2.5 rounded-xl text-xs transition-colors cursor-pointer text-center"
              >
                انصراف و لغو
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal professional footer */}
      <footer className="bg-slate-900 text-white border-t border-slate-800 mt-12 py-8 px-4 font-sans">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 text-xs text-slate-400">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Wrench className="w-5 h-5 text-blue-500" />
              <span className="font-bold text-sm">مجتمع دفتار و خدمات فنی ایران‌سرویس</span>
            </div>
            <p className="leading-relaxed text-[11px]">
              بزرگترین مرجع کشوری کدهای ارور، هماهنگی اعزام تکنسین، عیب‌یابی دوره‌ای و توزیع بدون واسطه قطعات یدکی اصلی لوازم خانگی به تمام نقاط ایران با فاکتور رسمی و ضمانت کتبی.
            </p>
          </div>

          <div className="space-y-2 select-none">
            <span className="font-bold text-white text-xs block mb-1">حمایت کاربری و قوانین ایران‌سرویس</span>
            <p 
              onClick={() => triggerNotification('بیمه حوادث ایران‌سرویس', '🛡️ بیمه امنیت پلتفرم: این پوشش کارگاهی بر روی کلیه اقدامات متخصصین منصوبه پلتفرم دایر است و تا سقف مصوب اتحادیه تامین خسارت می‌کند.', 'success')}
              className="cursor-pointer hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium text-[11px]"
            >
              • بیمه کامل خسارت‌های احتمالی ناشی از تعمیرات (مشاهده جزئیات)
            </p>
            <p 
              onClick={() => triggerNotification('تسویه رضایت مشتری', '💳 سیستم گروگذاری وجه: حق‌العمل تعمیرکار تنها پس از تایید نهایی کار با اخذ فیش چاپی و به صورت امن پایا تسویه می‌گردد.', 'info')}
              className="cursor-pointer hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium text-[11px]"
            >
              • تسویه پس از اتمام کار با رمز رضایت شتابی (مشاهده جزئیات)
            </p>
            <p 
              onClick={() => triggerNotification('مصوبه قیمت‌های مصوب اتحادیه', '⚖️ ممیزی تعرفه: تمام نرخ‌های خدمات ثبت‌شده در سیستم مطابق دقیق آخرین ضوابط اصناف کل کشور تنظیم و تایید شده‌اند.', 'success')}
              className="cursor-pointer hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium text-[11px]"
            >
              • کنترل قیمت‌ها بر اساس مصوبه رسمی اتحادیه (مشاهده جزئیات)
            </p>
          </div>

          <div className="space-y-2 text-right">
            <span className="font-bold text-white text-xs block mb-1 select-none">صفحات راهنما و تماس مجتمع</span>
            <ul className="space-y-1.5 text-[11px] list-none p-0 inline-block text-right">
              <li className="text-right font-sans">
                <button
                  type="button"
                  onClick={() => setOpenedInfoPage({
                    isOpen: true,
                    pageId: 'about',
                    title: 'درباره ما و معرفی مجتمع ایران‌سرویس'
                  })}
                  className="hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium cursor-pointer block text-right"
                >
                  • درباره ما و معرفی مجتمع ایران‌سرویس
                </button>
              </li>
              <li className="text-right">
                <button
                  type="button"
                  onClick={() => setOpenedInfoPage({
                    isOpen: true,
                    pageId: 'contact',
                    title: 'تماس با ما و کانال‌های ارتباطی رسمی'
                  })}
                  className="hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium cursor-pointer block text-right"
                >
                  • تماس با ما و فرم ارتباط مستقیم
                </button>
              </li>
              <li className="text-right">
                <button
                  type="button"
                  onClick={() => setOpenedInfoPage({
                    isOpen: true,
                    pageId: 'rules',
                    title: 'قوانین و مقررات فعالیت در ایران‌سرویس'
                  })}
                  className="hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium cursor-pointer block text-right"
                >
                  • قوانین عمومی و ضوابط فعالیت متخصصین
                </button>
              </li>
              <li className="text-right">
                <button
                  type="button"
                  onClick={() => setOpenedInfoPage({
                    isOpen: true,
                    pageId: 'dispute',
                    title: 'راهنمای حل اختلاف و شکایت از فاکتور'
                  })}
                  className="hover:text-blue-400 hover:underline transition-all text-slate-300 font-medium cursor-pointer block text-right"
                >
                  • رسیدگی به شکایات، ممیزی و حل اختلاف صنفی
                </button>
              </li>
            </ul>
            <div className="pt-2 text-[9.5px] text-blue-400 font-bold select-none">تاریخ آپدیت رسمی دیتابیس ایران: خرداد ۱۴۰۵ • نسخه ۲.۰</div>
          </div>

          <div className="space-y-2.5">
            <span className="font-bold text-white text-xs block mb-1">مجوزها و نمادهای الکترونیکی</span>
            <div className="flex items-center gap-3 justify-start pt-1">
              {/* Badge 1 */}
              {trustBadges && (trustBadges.badge1Link || trustBadges.badge1Image) && (
                <a
                  href={trustBadges.badge1Link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-750 transition-all border border-slate-700/60 p-2 rounded-xl flex items-center justify-center w-16 h-16 shadow-xs group cursor-pointer relative overflow-hidden"
                  title="نماد اعتماد اول"
                >
                  {trustBadges.badge1Image ? (
                    <img
                      src={trustBadges.badge1Image}
                      alt="نماد اعتماد اول"
                      className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[9px] text-slate-400 font-extrabold leading-tight select-none">
                      <Shield className="w-5 h-5 text-blue-500 mb-0.5" />
                      <span>ای‌نماد</span>
                    </div>
                  )}
                </a>
              )}

              {/* Badge 2 */}
              {trustBadges && (trustBadges.badge2Link || trustBadges.badge2Image) && (
                <a
                  href={trustBadges.badge2Link || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-slate-800 hover:bg-slate-750 transition-all border border-slate-700/60 p-2 rounded-xl flex items-center justify-center w-16 h-16 shadow-xs group cursor-pointer relative overflow-hidden"
                  title="نماد اعتماد دوم"
                >
                  {trustBadges.badge2Image ? (
                    <img
                      src={trustBadges.badge2Image}
                      alt="نماد اعتماد دوم"
                      className="w-full h-full object-contain filter grayscale group-hover:grayscale-0 transition-all"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-[9px] text-slate-400 font-extrabold leading-tight select-none">
                      <Shield className="w-5 h-5 text-indigo-500 mb-0.5" />
                      <span>ساماندهی</span>
                    </div>
                  )}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto border-t border-slate-800/80 mt-6 pt-4 text-center text-[10px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 font-sans">
          <span>کپی‌رایت © ۲۰۲۶-۱۴۰۵ تمامی حقوق و مالکیت فناوری متعلق به ایران‌سرویس دات آی‌آر است.</span>
          <span>توسعه یافته بر پایه استانداردهای وب ایران با کاربری آسان</span>
        </div>
      </footer>

      {/* Absolute Admin Floating Back-to-Admin-panel Button */}
      {isAdmin && currentRole !== 'admin' && (
        <div className="fixed bottom-6 left-6 z-50 group font-sans animate-bounce">
          <button
            onClick={() => {
              setCurrentRole('admin');
              setRoleSelection('admin');
              setSelectedError(null);
            }}
            className="bg-rose-650 hover:bg-rose-700 text-white font-black text-xs px-4 py-3 rounded-2xl shadow-xl transition-all cursor-pointer hover:scale-105 active:scale-95 flex items-center gap-2 border border-rose-500"
            title="بازگشت فوری به پنل مدیریت"
          >
            <Laptop className="w-4 h-4 text-white" />
            <span>🔙 بازگشت به پنل مدیریت ارشد</span>
          </button>
        </div>
      )}

      <InfoPageModal
        isOpen={openedInfoPage.isOpen}
        pageId={openedInfoPage.pageId}
        title={openedInfoPage.title}
        onClose={() => setOpenedInfoPage({ isOpen: false, pageId: '', title: '' })}
        pageContents={pageContents}
        onSubmitFeedback={(newFeedback) => {
          const feedbackWithMeta = {
            ...newFeedback,
            id: `fb-${Date.now()}`,
            submittedAt: new Date().toLocaleDateString('fa-IR') + ' ' + new Date().toLocaleTimeString('fa-IR', {hour: '2-digit', minute:'2-digit'}),
            isRead: false
          };
          saveFeedbacksToStorage([feedbackWithMeta, ...userFeedbacks]);
          triggerNotification('ثبت موفقیت‌آمیز دیدگاه', 'پیام شما به صندوق نظرات ارسال شد و در صف ممیزی مدیریت قرار گرفت.', 'success');
        }}
      />

      </div> {/* Closing Boxed Content Frame */}
    </div>
  );
}
