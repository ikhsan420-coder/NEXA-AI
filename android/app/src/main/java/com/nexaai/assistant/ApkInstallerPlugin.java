package com.nexaai.assistant;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * Minimal in-app updater bridge. It cannot install silently (Android forbids that for normal apps):
 * it hands an APK that the app downloaded into its own cache to the system installer, where the user confirms.
 * Android itself refuses the APK unless it is signed with the same key as the installed app.
 */
@CapacitorPlugin(name = "ApkInstaller")
public class ApkInstallerPlugin extends Plugin {

    /** Whether the user has allowed this app to install packages ("Install unknown apps"). */
    @PluginMethod
    public void canInstall(PluginCall call) {
        boolean allowed =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.O || getContext().getPackageManager().canRequestPackageInstalls();
        JSObject res = new JSObject();
        res.put("allowed", allowed);
        call.resolve(res);
    }

    /** Opens the system screen where the user can allow NEXA AI to install updates. */
    @PluginMethod
    public void openInstallSettings(PluginCall call) {
        try {
            Intent intent = new Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:" + getContext().getPackageName())
            );
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Cannot open install settings");
        }
    }

    /** Opens the system installer for an APK previously downloaded into this app's cache directory. */
    @PluginMethod
    public void install(PluginCall call) {
        String path = call.getString("path");
        if (path == null || path.isEmpty()) {
            call.reject("path is required");
            return;
        }
        if (path.startsWith("file://")) {
            path = path.substring(7);
        }
        try {
            File cacheDir = getContext().getCacheDir().getCanonicalFile();
            File apk = new File(path).getCanonicalFile();
            // Only ever install a file inside our own cache directory.
            if (!apk.getPath().startsWith(cacheDir.getPath() + File.separator)) {
                call.reject("Invalid file location");
                return;
            }
            if (!apk.isFile() || !apk.getName().endsWith(".apk")) {
                call.reject("APK file not found");
                return;
            }
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
            Intent intent = new Intent(Intent.ACTION_VIEW);
            intent.setDataAndType(uri, "application/vnd.android.package-archive");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve();
        } catch (Exception e) {
            call.reject("Install failed: " + e.getMessage());
        }
    }
}
