using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Reflection;
using System.Runtime.InteropServices;

namespace ToleranceHandbook
{
    /// <summary>Access to the files embedded in the exe (web app, WebView2 libraries, native loaders).</summary>
    internal static class Embedded
    {
        private static readonly Assembly Self = typeof(Embedded).Assembly;

        /// <summary>Embedded resource names use '/' but MSBuild's RecursiveDir gives '\'; normalise once.</summary>
        private static readonly Dictionary<string, string> Names =
            Self.GetManifestResourceNames().ToDictionary(n => n.Replace('\\', '/'), n => n, StringComparer.OrdinalIgnoreCase);

        public static byte[] ReadBytes(string path)
        {
            if (!Names.TryGetValue(path, out var real)) return null;
            using (var s = Self.GetManifestResourceStream(real))
            using (var m = new MemoryStream())
            {
                s.CopyTo(m);
                return m.ToArray();
            }
        }

        public static IEnumerable<string> WebFiles() =>
            Names.Keys.Where(k => k.StartsWith("web/", StringComparison.OrdinalIgnoreCase));

        /// <summary>Writes the WebView2 native loader for this process architecture and returns its folder.</summary>
        public static string ExtractLoader(string dataDir)
        {
            string arch;
            switch (RuntimeInformation.ProcessArchitecture)
            {
                case Architecture.X86: arch = "x86"; break;
                case Architecture.Arm64: arch = "arm64"; break;
                default: arch = "x64"; break;
            }
            var bytes = ReadBytes("native/" + arch + "/WebView2Loader.dll");
            var dir = Path.Combine(dataDir, "runtime", Self.GetName().Version.ToString(), arch);
            var file = Path.Combine(dir, "WebView2Loader.dll");
            if (!File.Exists(file) || new FileInfo(file).Length != bytes.Length)
            {
                Directory.CreateDirectory(dir);
                File.WriteAllBytes(file, bytes);
            }
            return dir;
        }

        /// <summary>Writes the web app to disk (used only for the open-in-browser fallback).</summary>
        public static string ExtractWeb(string dataDir)
        {
            var root = Path.Combine(dataDir, "web");
            foreach (var key in WebFiles())
            {
                var target = Path.Combine(root, key.Substring(4).Replace('/', Path.DirectorySeparatorChar));
                Directory.CreateDirectory(Path.GetDirectoryName(target));
                File.WriteAllBytes(target, ReadBytes(key));
            }
            return Path.Combine(root, "index.html");
        }

        public static string ContentType(string path)
        {
            switch (Path.GetExtension(path).ToLowerInvariant())
            {
                case ".html": return "text/html; charset=utf-8";
                case ".css": return "text/css; charset=utf-8";
                case ".js": return "text/javascript; charset=utf-8";
                case ".json": return "application/json";
                case ".svg": return "image/svg+xml";
                case ".png": return "image/png";
                default: return "application/octet-stream";
            }
        }
    }
}
