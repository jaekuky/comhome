import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border bg-card py-8">
      <div className="mobile-container space-y-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">ComHome</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            서울/경기 직장인을 위한 직주근접 주거지 추천 서비스
          </p>
        </div>
        <div className="flex gap-4 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">서비스 소개</Link>
          <Link to="/" className="hover:text-primary transition-colors">이용약관</Link>
          <Link to="/" className="hover:text-primary transition-colors">개인정보처리방침</Link>
        </div>
        <div className="text-xs text-muted-foreground">
          문의: contact@comhome.kr
        </div>
        <div className="text-xs text-muted-foreground/60">
          © 2026 ComHome. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
