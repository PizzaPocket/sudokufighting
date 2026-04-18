import { useGameStore } from '../store/gameStore';

interface Props { active: boolean; }

export default function PrivacyScreen({ active }: Props) {
  const setScreen = useGameStore(s => s.setScreen);
  if (!active) return null;

  return (
    <div id="screen-privacy">
      <div className="privacy-content">
        <h1 className="privacy-h1">Privacy Policy</h1>
        <p className="privacy-updated">Last updated: April 17, 2026</p>

        <p className="privacy-p">
          Sudoku Fighting ("we", "us", or "our") is a competitive puzzle game. This policy
          explains what information we collect, how we use it, and your rights regarding it.
        </p>

        <h2 className="privacy-h2">Information We Collect</h2>
        <p className="privacy-p">We collect only what is necessary to run the game:</p>
        <ul className="privacy-ul">
          <li><strong>Account information</strong> — your email address and password (if you register with email), or your name and email from Google or Apple if you sign in via OAuth.</li>
          <li><strong>Username</strong> — a display name you choose (or an auto-generated one assigned at signup).</li>
          <li><strong>Match history</strong> — game results, scores, characters used, and match duration, linked to your account.</li>
          <li><strong>Progression data</strong> — which characters you've unlocked and campaign completions.</li>
        </ul>
        <p className="privacy-p">We do not collect location data, contacts, device identifiers, or any information beyond what is listed above.</p>

        <h2 className="privacy-h2">How We Use Your Information</h2>
        <ul className="privacy-ul">
          <li>To operate your account and authenticate you across sessions.</li>
          <li>To display your stats and match history in your account screen.</li>
          <li>To power the public leaderboard (your username and win/score totals only).</li>
          <li>To save your game progression across devices.</li>
        </ul>
        <p className="privacy-p">We do not sell your data, use it for advertising, or share it with third parties except as described below.</p>

        <h2 className="privacy-h2">Third-Party Services</h2>
        <ul className="privacy-ul">
          <li><strong>Supabase</strong> — handles authentication and stores all account and game data. Data is stored on servers in the United States.</li>
          <li><strong>Google OAuth</strong> — if you choose "Continue with Google", Google authenticates you and shares your name and email with us.</li>
          <li><strong>Apple Sign-In</strong> — if you choose "Continue with Apple" on iOS, Apple authenticates you and may share a private relay email.</li>
        </ul>

        <h2 className="privacy-h2">Data Retention</h2>
        <p className="privacy-p">
          Your data is retained for as long as your account is active. If you delete your account,
          your personal data and match history are permanently deleted within 30 days.
          Aggregate leaderboard data (username + score) may be retained in anonymised form.
        </p>

        <h2 className="privacy-h2">Children's Privacy</h2>
        <p className="privacy-p">
          Sudoku Fighting does not knowingly collect personal information from children under 13.
          If you believe a child has provided us with personal information, please contact us and
          we will delete it promptly.
        </p>

        <h2 className="privacy-h2">Your Rights</h2>
        <p className="privacy-p">You have the right to:</p>
        <ul className="privacy-ul">
          <li>Access the personal data we hold about you.</li>
          <li>Correct inaccurate data (via the account screen in the app).</li>
          <li>Request deletion of your account and all associated data.</li>
          <li>Withdraw consent at any time by deleting your account.</li>
        </ul>

        <h2 className="privacy-h2">Security</h2>
        <p className="privacy-p">
          Passwords are hashed and never stored in plain text. All data is transmitted over HTTPS.
          We use Supabase Row Level Security to ensure users can only access their own data.
        </p>

        <h2 className="privacy-h2">Changes to This Policy</h2>
        <p className="privacy-p">
          If we make material changes to this policy, we will update the date at the top of this page.
          Continued use of the game after changes constitutes acceptance of the updated policy.
        </p>

        <div className="privacy-contact">
          <h2 className="privacy-h2" style={{ marginTop: 0 }}>Contact</h2>
          <p className="privacy-p" style={{ marginBottom: 0 }}>
            Questions or data requests:{' '}
            <a href="mailto:support@sudokufighting.com" className="privacy-link">
              support@sudokufighting.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
