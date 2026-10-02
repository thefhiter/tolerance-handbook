using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using System.Windows.Forms;

namespace ToleranceHandbook
{
    internal static class Program
    {
        [STAThread]
        private static void Main()
        {
            // The WebView2 libraries live inside this exe; resolve them before any type that uses them is touched.
            AppDomain.CurrentDomain.AssemblyResolve += ResolveEmbeddedAssembly;
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Run();
        }

        [MethodImpl(MethodImplOptions.NoInlining)]
        private static void Run() => Application.Run(new MainForm());

        private static Assembly ResolveEmbeddedAssembly(object sender, ResolveEventArgs args)
        {
            var name = new AssemblyName(args.Name).Name;
            var bytes = Embedded.ReadBytes("lib/" + name + ".dll");
            return bytes == null ? null : Assembly.Load(bytes);
        }
    }
}
