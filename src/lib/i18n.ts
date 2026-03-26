import type { PartnerType } from "@/hooks/useAuth";

const translations: Record<string, Record<string, string>> = {
  japan: {
    // Browser titles
    "Partner Portal": "パートナーポータル",

    // Page titles
    "Home": "ホーム",
    "Leads": "リード",
    "Lead Detail": "リード詳細",
    "Opportunities": "商談",
    "Opportunity Detail": "商談詳細",
    "Submit Lead": "リード登録",
    "Lead Referral Form": "リード紹介フォーム",
    "Sign In": "ログイン",
    "User Management": "ユーザー管理",
    "Partner Management": "パートナー管理",

    // Navigation
    "Submit a Lead": "リードを登録",
    "Users": "ユーザー",
    "Partners": "パートナー",
    "Admin": "管理",
    "Log out": "ログアウト",
    "Toggle theme": "テーマ切替",

    // Home page
    "Overview": "概要",
    "Welcome back. Here's your partnership overview.": "おかえりなさい。パートナーシップの概要です。",
    "New Referral": "新規紹介",
    "Active Leads": "アクティブリード",
    "total": "合計",
    "Open Opportunities": "進行中の商談",
    "pipeline": "パイプライン",
    "New Leads": "新規リード",
    "Awaiting outreach": "対応待ち",
    "Closed Won": "受注",
    "revenue": "収益",
    "View Leads": "リード一覧",
    "Manage your lead pipeline": "リードパイプラインの管理",
    "View Opportunities": "商談一覧",
    "Track deal progress": "案件の進捗管理",
    "Submit Referral": "紹介を送信",
    "Register a new lead referral": "新規リード紹介の登録",
    "Recent Activity": "最近のアクティビティ",
    "No recent activity": "最近のアクティビティはありません",

    // Leads table
    "Search leads...": "リードを検索...",
    "All Statuses": "すべてのステータス",
    "leads": "件のリード",
    "of": "/",
    "Name": "名前",
    "Email": "メール",
    "Company": "会社名",
    "Status": "ステータス",
    "Created Date": "作成日",
    "No leads found": "リードが見つかりません",
    "Loading leads...": "リードを読み込み中...",
    "Failed to load leads": "リードの読み込みに失敗しました",

    // Opportunities table
    "Search opportunities...": "商談を検索...",
    "All Stages": "すべてのステージ",
    "opportunities": "件の商談",
    "Opportunity Name": "商談名",
    "Account Name": "アカウント名",
    "Stage": "ステージ",
    "Close Date": "クローズ日",
    "TCV": "TCV",
    "No opportunities found": "商談が見つかりません",
    "Loading opportunities...": "商談を読み込み中...",
    "Failed to load opportunities": "商談の読み込みに失敗しました",

    // Referral form
    "Company Information": "会社情報",
    "Tell us about the company you're referring.": "紹介する会社について教えてください。",
    "Contact Details": "連絡先情報",
    "Who should we reach out to at this company?": "この会社の連絡先は誰ですか？",
    "Address": "住所",
    "Optional. Where is this company located?": "任意。この会社の所在地は？",
    "Opportunity Details": "商談詳細",
    "Help us understand the prospect's needs and timeline.": "見込み客のニーズを教えてください。",
    "Website": "ウェブサイト",
    "Salutation": "敬称",
    "First Name": "名",
    "Last Name": "姓",
    "Department(s)": "部署",
    "Street": "番地",
    "City": "市区町村",
    "State / Province": "都道府県",
    "Zip / Postal Code": "郵便番号",
    "Country": "国",
    "Number of Users": "ユーザー数",
    "Current Tech Stack / Solutions": "現在のツール／ソリューション",
    "Use Case": "ユースケース",
    "Competitors Considered or Incumbent": "検討中の競合または既存ツール",
    "Additional Information": "追加情報",
    "Continue": "次へ",
    "Back": "戻る",
    "Submit Referral": "紹介を送信",
    "Submitting...": "送信中...",
    "Referral Submitted": "紹介が送信されました",
    "Thank you for your partnership with Pendo! We will review and strive to respond within 2 business days.":
      "Pendoとのパートナーシップにご協力いただきありがとうございます！2営業日以内に確認・ご連絡いたします。",
    "Submit Another": "別の紹介を送信",
    "Back to Home": "ホームに戻る",

    // Detail pages
    "Back to Leads": "リード一覧に戻る",
    "Back to Opportunities": "商談一覧に戻る",

    // Greetings
    "Good morning": "おはようございます",
    "Good afternoon": "こんにちは",
    "Good evening": "こんばんは",

    // Login
    "Sign in": "ログイン",
    "Enter your credentials to continue": "認証情報を入力してください",
    "You have been signed out.": "ログアウトしました。",
    "Password": "パスワード",

    // Impersonation
    "Currently impersonating": "なりすまし中",
    "Go Back": "戻る",
    "Impersonate": "なりすまし",

    // Pagination
    "Page": "ページ",
  },
};

export function t(key: string, portalType: PartnerType | null): string {
  if (portalType === "japan" && translations.japan[key]) {
    return translations.japan[key];
  }
  return key;
}
