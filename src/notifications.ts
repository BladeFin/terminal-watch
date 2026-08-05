import { execFile } from "child_process";

export function desktopNotify(title: string, message: string) {
  if (process.platform === "win32") {
    windowsNotify(title, message);
  }
}

function windowsNotify(title: string, message: string) {
  // Use a known registered AppUserModelID (PowerShell's default AUMID)
  const appId =
    "{1AC14E77-02E7-4E5D-B744-2EB1AE5198B7}\\WindowsPowerShell\\v1.0\\powershell.exe";

  const script = `
$ProgressPreference = 'SilentlyContinue'

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null

$xml = @"
<toast>
  <visual>
    <binding template="ToastGeneric">
      <text>${title.replace(/"/g, '""')}</text>
      <text>${message.replace(/"/g, '""')}</text>
    </binding>
  </visual>
  <audio src="ms-winsoundevent:Notification.Default"/>
</toast>
"@

$doc = New-Object Windows.Data.Xml.Dom.XmlDocument
$doc.LoadXml($xml)
$toast = [Windows.UI.Notifications.ToastNotification]::new($doc)
$notifier = [Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier("${appId}")
$notifier.Show($toast)
`;

  // Encode to UTF-16LE Base64 to prevent CLI parsing/newline errors
  const encodedScript = Buffer.from(script, "utf16le").toString("base64");

  execFile(
    "powershell.exe",
    [
      "-NoProfile",
      "-ExecutionPolicy",
      "Bypass",
      "-EncodedCommand",
      encodedScript,
    ],
    (error, stdout, stderr) => {
      if (error || stderr) {
        console.error("Notification Error:", error || stderr);
      }
    },
  );
}
