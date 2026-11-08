/* Stubuika command-line and keyboard-first terminal interface.
 * Copyright (c) 2026 Stubuika contributors. SPDX-License-Identifier: MPL-2.0 */
/* Select the platform's full POSIX/BSD interfaces before any system header.
 * Darwin gates st_*timespec, mkdtemp(), and mkstemps() behind its own feature
 * level; _POSIX_C_SOURCE alone hides those declarations on recent SDKs. */
#if defined(__APPLE__)
#ifndef _DARWIN_C_SOURCE
#define _DARWIN_C_SOURCE 1
#endif
#else
#ifndef _POSIX_C_SOURCE
#define _POSIX_C_SOURCE 200809L
#endif
#endif
#include <ctype.h>
#include <dirent.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#ifndef _WIN32
#include <strings.h>
#else
#include <direct.h>
#define strcasecmp _stricmp
#endif
#include <sys/stat.h>
#include "lunaria_os.h"
#ifdef _WIN32
#include <conio.h>
#include <io.h>
#define isatty _isatty
#define fileno _fileno
#else
#include <sys/ioctl.h>
#include <sys/select.h>
#include <termios.h>
#include <unistd.h>
#endif

#define MAX_ENTRIES 512
#define ENTRY_NAME_CAP 260
#define PATH_CAP 4096

static int is_terminal(void) { return isatty(fileno(stdin)) && isatty(fileno(stdout)); }
static const char *env_or(const char *name, const char *fallback) {
   const char *v = getenv(name); return v && *v ? v : fallback;
}
static int supported_package(const char *name) {
   const char *dot = strrchr(name, '.');
   if (!dot) return 0;
   return !strcasecmp(dot, ".apk") || !strcasecmp(dot, ".apkm") ||
          !strcasecmp(dot, ".xapk") || !strcasecmp(dot, ".apks") ||
          !strcasecmp(dot, ".aab");
}
static void print_help(void) {
   puts("Stubuika — Android apps and games on your desktop\n"
        "\nUsage:\n"
        "  stubuika [runtime options] <package.apk|package.apkm|package.xapk|package.apks|package.aab>\n"
        "  stubuika                         Open the desktop launcher\n"
        "  stubuika launch <package>        Launch a package\n"
        "  stubuika tui                     Open the terminal dashboard\n"
        "  stubuika apps                    Show recently launched packages\n"
        "  stubuika logs <FILE>             Print a saved application/runtime log\n"
        "  stubuika diagnostics [--json]    Report host/runtime capabilities\n"
        "  stubuika --help                  Show this help\n"
        "  stubuika --version               Show build version\n"
        "\nThe existing runtime options (including --data-root and --config) remain available.\n"
        "Use 'stubuika <package>' in scripts; the TUI is never forced on redirected I/O.");
}
static void json_string(const char *text) {
   putchar('"');
   for (const unsigned char *p = (const unsigned char *)(text ? text : ""); *p; ++p) {
      if (*p == '"' || *p == '\\') { putchar('\\'); putchar(*p); }
      else if (*p < 0x20) printf("\\u%04x", *p);
      else putchar(*p);
   }
   putchar('"');
}
static int directory_exists(const char *path) {
   struct stat st; return path && stat(path, &st) == 0 && S_ISDIR(st.st_mode);
}
static void executable_directory(char *out, size_t cap) {
   char executable[PATH_CAP];
   out[0] = 0;
   if (luna_os_executable_path(executable, sizeof executable)) return;
   char *slash = strrchr(executable, '/');
#ifdef _WIN32
   char *backslash = strrchr(executable, '\\');
   if (!slash || (backslash && backslash > slash)) slash = backslash;
#endif
   if (slash) { *slash = 0; snprintf(out, cap, "%s", executable); }
}
static int runtime_directory_exists(const char *exe_dir) {
   char candidate[PATH_CAP];
   if (snprintf(candidate, sizeof candidate, "%s/runtime", exe_dir) < (int)sizeof candidate &&
       directory_exists(candidate)) return 1;
   if (snprintf(candidate, sizeof candidate, "%s/../Resources/runtime", exe_dir) < (int)sizeof candidate &&
       directory_exists(candidate)) return 1;
   return directory_exists("runtime");
}
static int guest_syslibs_exist(const char *exe_dir) {
   const char *override = getenv("LUNARIA_SYSLIB_DIR");
   if (override && *override) return directory_exists(override);
   char candidate[PATH_CAP];
   if (snprintf(candidate, sizeof candidate, "%s/syslib-arm64", exe_dir) < (int)sizeof candidate &&
       directory_exists(candidate)) return 1;
   return directory_exists("syslib-arm64");
}
static void diagnostics(int json) {
   const char *os = "Unknown";
   const char *arch = "unknown";
#if defined(__x86_64__) || defined(_M_X64)
   arch = "x86_64";
#elif defined(__aarch64__) || defined(_M_ARM64)
   arch = "aarch64";
#elif defined(__i386__) || defined(_M_IX86)
   arch = "x86";
#elif defined(__arm__)
   arch = "arm";
#endif
#if defined(__linux__)
   os = "Linux";
#elif defined(__APPLE__)
   os = "macOS";
#elif defined(_WIN32)
   os = "Windows";
#endif
   struct stat st;
   int dri = stat("/dev/dri", &st) == 0 && S_ISDIR(st.st_mode);
   const char *display = env_or("WAYLAND_DISPLAY", env_or("DISPLAY", ""));
   int gui = *display != '\0';
#if defined(_WIN32) || defined(__APPLE__)
   gui = 1;
#endif
   char exe_dir[PATH_CAP]; executable_directory(exe_dir, sizeof exe_dir);
   int has_runtime = runtime_directory_exists(exe_dir);
   int has_syslib = guest_syslibs_exist(exe_dir);
   const char *issues[3]; int issue_count = 0;
#if defined(__linux__)
   if (!gui && !(getenv("LUNARIA_PBUFFER") && *getenv("LUNARIA_PBUFFER") != '0'))
      issues[issue_count++] = "No X11/Wayland session detected; desktop windows may not open";
#endif
   if (!has_runtime) issues[issue_count++] = "Runtime libraries were not found beside the executable";
   if (!has_syslib) issues[issue_count++] = "ARM64 guest system libraries are not installed";
   if (json) {
      printf("{\"application\":\"Stubuika\",\"version\":\"development\",\"host\":"); json_string(os);
      printf(",\"architecture\":"); json_string(arch);
      printf(",\"graphics\":{\"display\":%s,\"display_server\":", gui ? "true" : "false"); json_string(display);
      printf(",\"drm_device_directory\":%s},\"runtime\":{\"runtime_directory\":%s,\"guest_syslibs\":%s},\"environment\":{\"device_profile\":",
             dri ? "true" : "false", has_runtime ? "true" : "false", has_syslib ? "true" : "false");
      json_string(env_or("LUNARIA_DEVICE", "pixel6")); printf(",\"data_root\":");
      json_string(env_or("LUNARIA_DATA_ROOT", ".")); printf("},\"issues\":[");
      for (int i = 0; i < issue_count; ++i) { if (i) putchar(','); json_string(issues[i]); }
      puts("]}");
      return;
   }
   puts("Stubuika system diagnostics\n──────────────────────────");
   printf("Host                 %s (%s)\n", os, arch);
   printf("Display session      %s%s%s\n", gui ? "available (" : "not detected",
          gui ? display : "", gui ? ")" : "");
#ifdef __linux__
   printf("DRM device directory %s\n", dri ? "available" : "not detected");
   puts("EGL/GLES              resolved during launch (Mesa, vendor drivers, and software renderers supported)");
#else
   puts("Graphics API          initialized by the platform runtime at launch");
#endif
   printf("Runtime libraries    %s\n", has_runtime ? "runtime libraries found beside the executable" : "not detected beside the executable");
   printf("ARM64 guest syslibs  %s\n", has_syslib ? "available" : "not detected (some guest math calls may be slower)");
   printf("Device profile       %s\n", env_or("LUNARIA_DEVICE", "pixel6"));
   printf("Data root            %s\n", env_or("LUNARIA_DATA_ROOT", "current directory"));
   if (issue_count) {
      puts("\nCompatibility notes");
      for (int i = 0; i < issue_count; ++i) printf("  ! %s\n", issues[i]);
   }
   puts("\nEGL/GLES driver details are reported during launch. Preserve the full stderr log.\n"
        "Graphics initialization errors and Android application integrity errors are distinct failure classes.");
}

static void recent_path(char *path, size_t cap) {
   const char *home = env_or("HOME", ".");
#ifdef _WIN32
   home = env_or("APPDATA", home);
   snprintf(path, cap, "%s\\Stubuika\\recent.txt", home);
#else
   snprintf(path, cap, "%s/.local/share/stubuika/recent.txt", home);
#endif
}
static void ensure_recent_directory(char *path) {
   for (char *p = path + 1; *p; ++p) {
      if (*p == '/' || *p == '\\') {
         char saved = *p; *p = 0;
#ifdef _WIN32
         (void)_mkdir(path);
#else
         (void)mkdir(path, 0700);
#endif
         *p = saved;
      }
   }
}
static void recent_add(const char *package) {
   if (!package || !*package) return;
   char path[PATH_CAP], dir[PATH_CAP];
   recent_path(path, sizeof path);
   snprintf(dir, sizeof dir, "%s", path);
   char *slash = strrchr(dir, '/');
#ifdef _WIN32
   char *backslash = strrchr(dir, '\\'); if (!slash || (backslash && backslash > slash)) slash = backslash;
#endif
   if (slash) { *slash = 0; ensure_recent_directory(dir); }
   FILE *f = fopen(path, "a");
   if (f) { fprintf(f, "%s\n", package); fclose(f); }
}
static int recent_show(char entries[][PATH_CAP], int cap) {
   char path[PATH_CAP]; recent_path(path, sizeof path);
   FILE *f = fopen(path, "r");
   int count = 0; char line[PATH_CAP];
   if (!f) return 0;
   while (fgets(line, sizeof line, f)) {
      line[strcspn(line, "\r\n")] = 0;
      if (*line && count < cap) snprintf(entries[count++], PATH_CAP, "%s", line);
   }
   fclose(f);
   return count;
}

#ifdef _WIN32
static int key_read(void) {
   int c = _getch();
   if (c == 0 || c == 224) { int e = _getch(); return e == 72 ? 'k' : e == 80 ? 'j' : 0; }
   return c == 13 ? '\n' : c;
}
static void raw_begin(void) {}
static void raw_end(void) {}
static void term_size(int *w, int *h) { *w = 80; *h = 24; }
#else
static struct termios saved_termios;
static int raw_active;
static void raw_begin(void) {
   if (!tcgetattr(STDIN_FILENO, &saved_termios)) {
      struct termios raw = saved_termios;
      raw.c_lflag &= (tcflag_t)~(ICANON | ECHO);
      raw.c_iflag &= (tcflag_t)~(IXON | ICRNL);
      raw.c_cc[VMIN] = 1; raw.c_cc[VTIME] = 0;
      if (!tcsetattr(STDIN_FILENO, TCSAFLUSH, &raw)) raw_active = 1;
   }
}
static void raw_end(void) { if (raw_active) tcsetattr(STDIN_FILENO, TCSAFLUSH, &saved_termios); raw_active = 0; }
static int key_read(void) {
   unsigned char c;
   if (read(STDIN_FILENO, &c, 1) != 1) return 'q';
   if (c == 27) {
      fd_set input; FD_ZERO(&input); FD_SET(STDIN_FILENO, &input);
      struct timeval timeout = {0, 45000};
      if (select(STDIN_FILENO + 1, &input, NULL, NULL, &timeout) <= 0) return 27;
      unsigned char seq[2];
      if (read(STDIN_FILENO, &seq[0], 1) != 1) return 27;
      if (seq[0] != '[' || read(STDIN_FILENO, &seq[1], 1) != 1) return 27;
      return seq[1] == 'A' ? 'k' : seq[1] == 'B' ? 'j' : seq[1] == 'C' ? 'l' : seq[1] == 'D' ? 'h' : 0;
   }
   return c == '\r' ? '\n' : c;
}
static void term_size(int *w, int *h) {
   struct winsize ws;
   if (!ioctl(STDOUT_FILENO, TIOCGWINSZ, &ws) && ws.ws_col && ws.ws_row) { *w = ws.ws_col; *h = ws.ws_row; }
   else { *w = 80; *h = 24; }
}
#endif
static void draw_frame(int selected, const char *notice) {
   static const char *const items[] = {"Dashboard", "Launch an app", "Recent apps", "View a log", "System diagnostics", "Settings", "Quit"};
   int w, h; term_size(&w, &h);
   if (w < 50) w = 50;
   if (h < 16) h = 16;
   printf("\033[2J\033[H\033[1;36m  STUBUIKA\033[0m  \033[2mAndroid apps, at home on your desktop\033[0m\n");
   printf("\033[2m  %.*s\033[0m\n\n", w - 4, "────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────");
   printf("  \033[1;33mA little more room to play.\033[0m\n  Load Android packages directly — no full virtual device required.\n\n");
   for (int i = 0; i < 7; ++i)
      printf("  %s %s%s\033[0m\n", i == selected ? "\033[1;32m›" : " ", i == selected ? "\033[1m" : "", items[i]);
   printf("\n  \033[2m↑/↓ or j/k move   Enter open   q quit\033[0m\n");
   if (notice && *notice) printf("\n  \033[1;33m%s\033[0m\n", notice);
   for (int i = 0; i < h - 15; ++i) putchar('\n');
   printf("\033[2m  Help: https://github.com/flessan/stubuika · Terminal layout %d×%d\033[0m\n", w, h);
   fflush(stdout);
}
static void show_log_tail(const char *path) {
   FILE *f = fopen(path, "rb");
   if (!f) { printf("Could not open %s: %s\n", path, strerror(errno)); return; }
   enum { TAIL_LINES = 22, LINE_SIZE = 1024 };
   char lines[TAIL_LINES][LINE_SIZE]; int count = 0;
   char line[LINE_SIZE];
   while (fgets(line, sizeof line, f)) {
      snprintf(lines[count % TAIL_LINES], LINE_SIZE, "%s", line);
      count++;
   }
   if (ferror(f)) printf("Error reading log: %s\n", strerror(errno));
   fclose(f);
   int first = count > TAIL_LINES ? count % TAIL_LINES : 0;
   int shown = count < TAIL_LINES ? count : TAIL_LINES;
   if (!shown) puts("(log is empty)");
   for (int i = 0; i < shown; ++i)
      fputs(lines[(first + i) % TAIL_LINES], stdout);
   if (count > TAIL_LINES) printf("\n… showing the last %d lines of %d total\n", TAIL_LINES, count);
}
static void tui_log_viewer(void) {
   char path[PATH_CAP];
   raw_end();
   printf("\033[2J\033[H\033[1;36m  VIEW AN APPLICATION LOG\033[0m\n\n"
          "Enter a log file saved from Stubuika's stdout/stderr. For example:\n"
          "  stubuika ./app.apk > stubuika.log 2>&1\n\nLog path: ");
   fflush(stdout);
   if (!fgets(path, sizeof path, stdin)) { path[0] = 0; clearerr(stdin); }
   path[strcspn(path, "\r\n")] = 0;
   if (*path) { puts("\n"); show_log_tail(path); }
   else puts("\nNo log path entered.");
   puts("\n\nPress Enter to return."); (void)fgets(path, sizeof path, stdin);
   raw_begin();
}
static void draw_diag(void) {
   printf("\033[2J\033[H\033[1;36m  SYSTEM DIAGNOSTICS\033[0m\n\n"); diagnostics(0);
   puts("\n  Press any key to return"); fflush(stdout); (void)key_read();
}
static int package_picker(char *chosen, size_t cap) {
   char cwd[PATH_CAP];
#ifdef _WIN32
   if (!_getcwd(cwd, sizeof cwd)) snprintf(cwd, sizeof cwd, ".");
#else
   if (!getcwd(cwd, sizeof cwd)) snprintf(cwd, sizeof cwd, ".");
#endif
   for (;;) {
      DIR *dir = opendir(cwd); if (!dir) return -1;
      char names[MAX_ENTRIES][ENTRY_NAME_CAP]; int dirs[MAX_ENTRIES], n = 0;
      snprintf(names[n], ENTRY_NAME_CAP, "../"); dirs[n++] = 1;
      struct dirent *ent;
      while ((ent = readdir(dir)) && n < MAX_ENTRIES) {
         if (ent->d_name[0] == '.') continue;
         char full[PATH_CAP];
         int full_len = snprintf(full, sizeof full, "%s/%s", cwd, ent->d_name);
         if (full_len < 0 || full_len >= (int)sizeof full) continue;
         struct stat st; if (stat(full, &st)) continue;
         if (S_ISDIR(st.st_mode) || supported_package(ent->d_name)) {
            snprintf(names[n], ENTRY_NAME_CAP, "%s%s", ent->d_name, S_ISDIR(st.st_mode) ? "/" : "");
            dirs[n++] = S_ISDIR(st.st_mode);
         }
      }
      closedir(dir);
      int sel = 0;
      for (;;) {
         printf("\033[2J\033[H\033[1;36m  CHOOSE A PACKAGE\033[0m\n\n  %s\n\n", cwd);
         int w, h; term_size(&w, &h); (void)w;
         int visible = h - 9; if (visible < 4) visible = 4; if (visible > n) visible = n;
         int start = sel >= visible ? sel - visible + 1 : 0;
         for (int i = start; i < start + visible; ++i)
            printf("  %s %s%s\033[0m\n", i == sel ? "\033[1;32m›" : " ", i == sel ? "\033[1m" : "", names[i]);
         puts("\n  ↑/↓ move   Enter open/select   Backspace parent   Esc cancel"); fflush(stdout);
         int k = key_read();
         if (k == 'q' || k == 27) return 1;
         if (k == 'j' && sel < n - 1) ++sel;
         else if (k == 'k' && sel > 0) --sel;
         else if (k == 127 || k == 8) {
            char *slash = strrchr(cwd, '/'); if (slash && slash != cwd) *slash = 0; else snprintf(cwd, sizeof cwd, "/");
            break;
         } else if (k == '\n' && n) {
            char full[PATH_CAP];
            int full_len = snprintf(full, sizeof full, "%s/%s", cwd, names[sel]);
            if (full_len < 0 || full_len >= (int)sizeof full) return -1;
            if (dirs[sel]) { if (sel == 0) { char *slash = strrchr(cwd, '/'); if (slash && slash != cwd) *slash = 0; else snprintf(cwd, sizeof cwd, "/"); }
               else snprintf(cwd, sizeof cwd, "%s", full);
               break;
            }
            if (snprintf(chosen, cap, "%s", full) >= (int)cap) return -1;
            return 0;
         }
      }
   }
}
static int recent_picker(char *chosen, size_t cap) {
   char (*rows)[PATH_CAP] = calloc(128, PATH_CAP);
   if (!rows) return -1;
   int n = recent_show(rows, 128);
   if (!n) { free(rows); return 1; }
   int selected = 0;
   for (;;) {
      printf("\033[2J\033[H\033[1;36m  RECENT PACKAGES\033[0m\n\n");
      int w, h; term_size(&w, &h); (void)w;
      int visible = h - 8; if (visible < 3) visible = 3; if (visible > n) visible = n;
      int start = selected >= visible ? selected - visible + 1 : 0;
      for (int i = start; i < start + visible; ++i) {
         const char *path = rows[n - 1 - i];
         printf("  %s %s%s\033[0m\n", i == selected ? "\033[1;32m›" : " ",
                i == selected ? "\033[1m" : "", path);
      }
      puts("\n  ↑/↓ move   Enter launch   Esc return"); fflush(stdout);
      int k = key_read();
      if (k == 27 || k == 'q') { free(rows); return 1; }
      if (k == 'j' && selected < n - 1) ++selected;
      else if (k == 'k' && selected > 0) --selected;
      else if (k == '\n') {
         if (snprintf(chosen, cap, "%s", rows[n - 1 - selected]) >= (int)cap) { free(rows); return -1; }
         free(rows); return 0;
      }
   }
}
static void set_setting(const char *label, const char *key, const char *fallback) {
   char value[PATH_CAP];
   raw_end();
   printf("\033[2J\033[H\033[1;36m  %s\033[0m\n\nCurrent: %s\nNew value (blank to keep): ",
          label, env_or(key, fallback)); fflush(stdout);
   if (!fgets(value, sizeof value, stdin)) { raw_begin(); return; }
   value[strcspn(value, "\r\n")] = 0;
   if (*value) {
#ifdef _WIN32
      _putenv_s(key, value);
#else
      setenv(key, value, 1);
#endif
      printf("\n  Set %s for this launch session.\n", key);
   }
   puts("  Press Enter to return.");
   if (!fgets(value, sizeof value, stdin)) clearerr(stdin);
   raw_begin();
}
static void settings_screen(void) {
   for (;;) {
      printf("\033[2J\033[H\033[1;36m  SETTINGS\033[0m\n\n"
             "  Device profile  %s\n  Window width    %s\n  Window height   %s\n  Data root       %s\n\n"
             "  d  Change device profile (pixel6, pixel7, galaxys21, stubuika)\n"
             "  w  Change window width    h  Change window height\n"
             "  r  Change data root       q  Return to dashboard\n",
             env_or("LUNARIA_DEVICE", "pixel6"), env_or("LUNARIA_WIDTH", "1024"),
             env_or("LUNARIA_HEIGHT", "768"), env_or("LUNARIA_DATA_ROOT", "current directory"));
      fflush(stdout); int k = key_read();
      if (k == 'q' || k == 27) return;
      if (k == 'd') set_setting("DEVICE PROFILE", "LUNARIA_DEVICE", "pixel6");
      else if (k == 'w') set_setting("WINDOW WIDTH", "LUNARIA_WIDTH", "1024");
      else if (k == 'h') set_setting("WINDOW HEIGHT", "LUNARIA_HEIGHT", "768");
      else if (k == 'r') set_setting("DATA ROOT", "LUNARIA_DATA_ROOT", "current directory");
   }
}
static int tui(char *chosen, size_t cap) {
   if (!is_terminal()) { fputs("stubuika: tui requires an interactive terminal (stdin and stdout must be terminals)\n", stderr); return 2; }
   static const int count = 7;
   int selected = 0; const char *notice = "Welcome — use the arrow keys or j/k to explore.";
   raw_begin();
   for (;;) {
      draw_frame(selected, notice); notice = "";
      int k = key_read();
      if (k == 'q') { raw_end(); printf("\033[0m\n"); return 0; }
      if (k == 'j' && selected < count - 1) ++selected;
      else if (k == 'k' && selected > 0) --selected;
      else if (k == '\n') {
         if (selected == 0) notice = "Select Launch an app to browse APK, APKM, XAPK, APKS, and AAB files.";
         else if (selected == 1) {
            int result = package_picker(chosen, cap);
            if (!result) { raw_end(); printf("\033[0m\n"); return 1; }
            notice = result < 0 ? "Could not read this directory or selected path is too long." : "Package selection cancelled.";
         } else if (selected == 2) {
            int result = recent_picker(chosen, cap);
            if (!result) { raw_end(); printf("\033[0m\n"); return 1; }
            notice = result < 0 ? "Recent package path is too long." : "No recent packages yet, or selection cancelled.";
         } else if (selected == 3) { tui_log_viewer(); notice = "Log view closed. Keep the full log when reporting a failure."; }
         else if (selected == 4) { draw_diag(); notice = "Diagnostics checked. See the host/runtime status above."; }
         else if (selected == 5) { settings_screen(); notice = "Session settings updated. Persistent defaults remain in stubuika.conf."; }
         else { raw_end(); printf("\033[0m\n"); return 0; }
      }
   }
}

/* Return -1 to continue through the existing APK/runtime pipeline, 0 for a
 * completed command, or a positive process exit code for a CLI error. */
int luna_cli_dispatch(int *argc, const char ***argv) {
   if (!argc || !argv || *argc < 2) return -1;
   const char *arg = (*argv)[1];
   if (!strcmp(arg, "--help") || !strcmp(arg, "-h") || !strcmp(arg, "help")) { print_help(); return 0; }
   if (!strcmp(arg, "--version") || !strcmp(arg, "version")) { puts("Stubuika development build"); return 0; }
   if (!strcmp(arg, "diagnostics") || !strcmp(arg, "doctor")) {
      int json = *argc > 2 && !strcmp((*argv)[2], "--json");
      if (*argc > (json ? 3 : 2)) { fputs("stubuika: diagnostics accepts only --json\n", stderr); return 2; }
      diagnostics(json); return 0;
   }
   if (!strcmp(arg, "logs")) {
      if (*argc != 3) { fputs("usage: stubuika logs <saved-log-file>\n", stderr); return 2; }
      FILE *f = fopen((*argv)[2], "rb");
      if (!f) { fprintf(stderr, "stubuika: cannot open log '%s': %s\n", (*argv)[2], strerror(errno)); return 1; }
      unsigned char buffer[8192]; size_t n; int failed = 0;
      while ((n = fread(buffer, 1, sizeof buffer, f)) != 0)
         if (fwrite(buffer, 1, n, stdout) != n) { failed = 1; break; }
      if (ferror(f)) failed = 1;
      fclose(f);
      if (failed) { fputs("stubuika: error while reading or writing log\n", stderr); return 1; }
      return 0;
   }
   if (!strcmp(arg, "apps")) {
      char (*entries)[PATH_CAP] = calloc(128, PATH_CAP);
      if (!entries) { fputs("stubuika: cannot allocate recent-app list\n", stderr); return 1; }
      int n = recent_show(entries, 128);
      if (!n) puts("No recently launched packages.");
      else for (int i = n - 1; i >= 0; --i) puts(entries[i]);
      free(entries); return 0;
   }
   if (!strcmp(arg, "tui")) {
      static char selected[PATH_CAP]; int result = tui(selected, sizeof selected);
      if (result != 1) return result == 0 ? 0 : result;
      static const char *next[3]; next[0] = (*argv)[0]; next[1] = selected; next[2] = NULL;
      *argv = next; *argc = 2; recent_add(selected); return -1;
   }
   if (!strcmp(arg, "launch")) {
      if (*argc != 3 || !supported_package((*argv)[2])) { fputs("usage: stubuika launch <package.apk|package.apkm|package.xapk|package.apks|package.aab>\n", stderr); return 2; }
      static const char *next[3]; next[0] = (*argv)[0]; next[1] = (*argv)[2]; next[2] = NULL;
      *argv = next; *argc = 2; recent_add((*argv)[1]); return -1;
   }
   if (supported_package(arg)) recent_add(arg);
   return -1;
}
