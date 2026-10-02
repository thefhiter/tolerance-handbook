using System;
using System.Diagnostics;
using System.Drawing;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;

namespace ToleranceHandbook
{
    /// <summary>The app window: a WebView2 that serves the embedded web app from https://app.tolerance/.</summary>
    internal sealed class MainForm : Form
    {
        private const string Origin = "https://app.tolerance/";
        private static readonly bool French = CultureInfo.CurrentUICulture.TwoLetterISOLanguageName == "fr";

        // Debug mode (used by the automated tests): separate profile, DevTools and a remote-debugging port.
        private static readonly bool Debug = Environment.GetEnvironmentVariable("TOLERANCE_HANDBOOK_DEBUG") == "1";

        private readonly string _dataDir;
        private readonly WebView2 _web;
        private bool _fullScreen;
        private FormWindowState _stateBeforeFullScreen;
        private Rectangle _boundsBeforeFullScreen;

        public MainForm()
        {
            _dataDir = Debug
                ? Path.Combine(Path.GetTempPath(), "ToleranceHandbook-debug")
                : Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "ToleranceHandbook");
            Directory.CreateDirectory(_dataDir);

            Text = French ? "Manuel des tolérances" : "Tolerance Handbook";
            Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath);
            StartPosition = FormStartPosition.Manual;
            MinimumSize = new Size(420, 480);
            AutoScaleMode = AutoScaleMode.Dpi;
            var dark = WindowsUsesDarkTheme();
            BackColor = dark ? Color.FromArgb(0x0B, 0x12, 0x20) : Color.FromArgb(0xF8, 0xFA, 0xFC);
            RestoreWindowBounds();

            _web = new WebView2 { Dock = DockStyle.Fill, DefaultBackgroundColor = BackColor };
            Controls.Add(_web);

            HandleCreated += (s, e) => SetDarkTitleBar(dark);
            Load += async (s, e) => await InitializeAsync();
            FormClosing += (s, e) => SaveWindowBounds();
        }

        private async System.Threading.Tasks.Task InitializeAsync()
        {
            try
            {
                CoreWebView2Environment.SetLoaderDllFolderPath(Embedded.ExtractLoader(_dataDir));
                try { CoreWebView2Environment.GetAvailableBrowserVersionString(); }
                catch (WebView2RuntimeNotFoundException) { RuntimeMissing(); return; }

                var options = new CoreWebView2EnvironmentOptions(Debug
                    ? "--remote-debugging-port=" + (Environment.GetEnvironmentVariable("TOLERANCE_HANDBOOK_DEBUG_PORT") ?? "9222")
                    : null);
                var env = await CoreWebView2Environment.CreateAsync(null, Path.Combine(_dataDir, "WebView2"), options);
                await _web.EnsureCoreWebView2Async(env);
                var core = _web.CoreWebView2;

                core.Settings.AreDevToolsEnabled = Debug;
                core.Settings.IsStatusBarEnabled = false;
                core.Settings.IsZoomControlEnabled = true;

                core.AddWebResourceRequestedFilter(Origin + "*", CoreWebView2WebResourceContext.All);
                core.WebResourceRequested += (s, e) => e.Response = Serve(env, e.Request.Uri);
                core.NavigationStarting += (s, e) =>
                {
                    if (e.Uri.StartsWith(Origin, StringComparison.OrdinalIgnoreCase)) return;
                    e.Cancel = true;
                    OpenExternal(e.Uri);
                };
                core.NewWindowRequested += (s, e) => { e.Handled = true; OpenExternal(e.Uri); };
                core.DocumentTitleChanged += (s, e) => Text = core.DocumentTitle;
                core.WebMessageReceived += OnWebMessage;
                // F11 toggles full screen (the page has focus, so the key is caught in the page).
                await core.AddScriptToExecuteOnDocumentCreatedAsync(
                    "addEventListener('keydown', function (e) { if (e.key === 'F11') { e.preventDefault(); chrome.webview.postMessage({ type: 'fullscreen' }); } });");

                _web.Source = new Uri(Origin + "index.html");
            }
            catch (Exception ex)
            {
                MessageBox.Show(this,
                    (French ? "Impossible de démarrer l’affichage.\n\n" : "The app view could not start.\n\n") + ex.Message,
                    Text, MessageBoxButtons.OK, MessageBoxIcon.Error);
                Close();
            }
        }

        private static CoreWebView2WebResourceResponse Serve(CoreWebView2Environment env, string uri)
        {
            var path = new Uri(uri).AbsolutePath.TrimStart('/');
            if (path.Length == 0) path = "index.html";
            var bytes = Embedded.ReadBytes("web/" + Uri.UnescapeDataString(path));
            if (bytes == null)
                return env.CreateWebResourceResponse(null, 404, "Not Found", "Content-Type: text/plain");
            return env.CreateWebResourceResponse(new MemoryStream(bytes), 200, "OK",
                "Content-Type: " + Embedded.ContentType(path) + "\nCache-Control: no-cache");
        }

        private void OnWebMessage(object sender, CoreWebView2WebMessageReceivedEventArgs e)
        {
            var json = e.WebMessageAsJson ?? "";
            if (json.Contains("\"type\":\"theme\"")) SetDarkTitleBar(json.Contains("\"dark\":true"));
            else if (json.Contains("\"type\":\"fullscreen\"")) ToggleFullScreen();
        }

        private void ToggleFullScreen()
        {
            if (!_fullScreen)
            {
                _stateBeforeFullScreen = WindowState;
                _boundsBeforeFullScreen = Bounds;
                FormBorderStyle = FormBorderStyle.None;
                WindowState = FormWindowState.Normal;
                Bounds = Screen.FromControl(this).Bounds;
            }
            else
            {
                FormBorderStyle = FormBorderStyle.Sizable;
                Bounds = _boundsBeforeFullScreen;
                WindowState = _stateBeforeFullScreen;
            }
            _fullScreen = !_fullScreen;
        }

        private void RuntimeMissing()
        {
            var msg = French
                ? "Cette application a besoin du « Microsoft Edge WebView2 Runtime » (inclus dans Windows 11).\n\n" +
                  "Oui : ouvrir le manuel dans votre navigateur à la place\nNon : télécharger WebView2 (gratuit, Microsoft)"
                : "This app needs the Microsoft Edge WebView2 Runtime (included with Windows 11).\n\n" +
                  "Yes: open the handbook in your web browser instead\nNo: download WebView2 (free, from Microsoft)";
            var r = MessageBox.Show(this, msg, Text, MessageBoxButtons.YesNoCancel, MessageBoxIcon.Information);
            if (r == DialogResult.Yes) OpenExternal(Embedded.ExtractWeb(_dataDir));
            else if (r == DialogResult.No) OpenExternal("https://go.microsoft.com/fwlink/p/?LinkId=2124703");
            Close();
        }

        private static void OpenExternal(string target)
        {
            if (!(target.StartsWith("http://") || target.StartsWith("https://") || target.StartsWith("mailto:") || File.Exists(target))) return;
            try { Process.Start(new ProcessStartInfo(target) { UseShellExecute = true }); } catch { /* nothing else to try */ }
        }

        /* ---------- window position memory ---------- */
        private string BoundsFile => Path.Combine(_dataDir, "window.txt");

        private void RestoreWindowBounds()
        {
            var area = Screen.PrimaryScreen.WorkingArea;
            var def = new Rectangle(area.X + area.Width / 10, area.Y + area.Height / 12, Math.Min(1366, area.Width * 4 / 5), Math.Min(900, area.Height * 5 / 6));
            Bounds = def;
            try
            {
                var p = File.ReadAllText(BoundsFile).Split(',').Select(int.Parse).ToArray();
                var r = new Rectangle(p[0], p[1], p[2], p[3]);
                // Only restore if the title bar is on a connected screen.
                if (Screen.AllScreens.Any(s => s.WorkingArea.IntersectsWith(new Rectangle(r.X, r.Y, r.Width, 40)))) Bounds = r;
                if (p[4] == 1) WindowState = FormWindowState.Maximized;
            }
            catch { /* first run or unreadable file: keep the default */ }
        }

        private void SaveWindowBounds()
        {
            try
            {
                var r = _fullScreen ? _boundsBeforeFullScreen : (WindowState == FormWindowState.Normal ? Bounds : RestoreBounds);
                var max = (_fullScreen ? _stateBeforeFullScreen : WindowState) == FormWindowState.Maximized ? 1 : 0;
                File.WriteAllText(BoundsFile, string.Join(",", r.X, r.Y, r.Width, r.Height, max));
            }
            catch { /* not critical */ }
        }

        /* ---------- dark title bar ---------- */
        [DllImport("dwmapi.dll")]
        private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attr, ref int value, int size);

        private void SetDarkTitleBar(bool dark)
        {
            if (!IsHandleCreated) return;
            int v = dark ? 1 : 0;
            // 20 = DWMWA_USE_IMMERSIVE_DARK_MODE (Windows 10 20H1+), 19 on earlier Windows 10 builds.
            if (DwmSetWindowAttribute(Handle, 20, ref v, sizeof(int)) != 0) DwmSetWindowAttribute(Handle, 19, ref v, sizeof(int));
        }

        private static bool WindowsUsesDarkTheme()
        {
            try
            {
                using (var k = Microsoft.Win32.Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize"))
                    return k?.GetValue("AppsUseLightTheme") is int i && i == 0;
            }
            catch { return false; }
        }
    }
}
