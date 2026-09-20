package com.lecturewhisper;

import android.Manifest;
import android.animation.ObjectAnimator;
import android.animation.ValueAnimator;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.SurfaceTexture;
import android.hardware.Camera;
import android.media.MediaPlayer;
import android.net.Uri;
import android.net.wifi.WifiManager;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.os.StatFs;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.Settings;
import android.util.Log;
import android.view.GestureDetector;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.TextureView;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.view.animation.AccelerateDecelerateInterpolator;
import android.view.animation.DecelerateInterpolator;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageButton;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.google.zxing.BarcodeFormat;
import com.google.zxing.BinaryBitmap;
import com.google.zxing.DecodeHintType;
import com.google.zxing.MultiFormatReader;
import com.google.zxing.PlanarYUVLuminanceSource;
import com.google.zxing.Result;
import com.google.zxing.common.HybridBinarizer;

import com.lecturewhisper.model.RecordingSession;
import com.lecturewhisper.model.TimetableSlot;
import com.lecturewhisper.network.ConnectionManager;
import com.lecturewhisper.network.LaptopSyncClient;
import com.lecturewhisper.network.PairingPayload;
import com.lecturewhisper.recorder.RecorderService;
import com.lecturewhisper.store.RecordingStore;
import com.lecturewhisper.store.TimetableStore;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collections;
import java.util.EnumMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

public class MainActivity extends Activity {

    private static final String TAG = "LectureWhisperMain";
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int PICK_IMAGE_REQUEST_CODE = 102;
    private static final String PREFS_NAME = "lw_prefs";
    private static final String KEY_THEME = "app_theme";

    // Stores & Managers
    private TimetableStore timetableStore;
    private RecordingStore recordingStore;
    private ConnectionManager connectionManager;
    private SharedPreferences prefs;

    // UI — Top App Bar & Morphing Status Chip
    private TextView textCurrentPageTitle;
    private TextView textCurrentPageSubtitle;
    private LinearLayout chipConnectionStatus;
    private View viewConnectionDot;
    private TextView textConnectionBadge;

    // 5-Tab Navigation Views
    private View viewTabToday;
    private View viewTabSchedule;
    private View viewTabRecord;
    private View viewTabLibrary;
    private View viewTabSettings;

    // 5 Bottom Navigation Bar Tabs
    private View tabBtnToday;
    private View tabBtnSchedule;
    private View tabBtnRecord;
    private View tabBtnLibrary;
    private View tabBtnSettings;
    private ImageView iconTabToday;
    private ImageView iconTabSchedule;
    private ImageView iconTabRecord;
    private ImageView iconTabLibrary;
    private ImageView iconTabSettings;
    private TextView textTabToday;
    private TextView textTabSchedule;
    private TextView textTabLibrary;
    private TextView textTabSettings;
    private int currentTab = 0;

    // Tab 0: Today Views
    private LinearLayout bannerTimetableSlot;
    private TextView textBannerType;
    private TextView textBannerSubject;
    private TextView textBannerDetails;
    private TextView textRecordingStatus;
    private TextView textRecordingTimer;
    private Button btnHeroRecord;
    private TextView textChunkInfo;
    private TextView textSyncSummary;
    private Button btnSyncNow;
    private LinearLayout containerTodayClasses;
    private TextView textTodayEmptyState;

    // Tab 1: Schedule Views
    private Button btnUploadTimetableOcr;
    private Button btnAddSlot;
    private LinearLayout layoutOcrProgress;
    private TextView textOcrProgressStatus;
    private LinearLayout containerTimetableSlots;
    private final Button[] dayButtons = new Button[7];
    private int selectedDay = 0;

    // Tab 2: Studio Record Views
    private TextView textStudioTimer;
    private EditText editRecordingSubject;
    private Button btnStudioStop;
    private Button btnLockGuard;
    private boolean isScreenLocked = false;
    private View[] waveBars = new View[7];

    // Tab 3: Library Views
    private TextView textRecordingsStats;
    private Button btnSyncAllRecordings;
    private LinearLayout containerRecordingsList;
    private MediaPlayer previewPlayer;

    // Tab 4: Settings & Diagnostics Views
    private TextView textSettingsMacName;
    private TextView textSettingsServerId;
    private Button btnSettingsPairQr;
    private Button btnSettingsForgetMac;
    private TextView textStorageAvailable;
    private TextView textStorageAppUsage;
    private Button btnCleanSyncedChunks;
    private Button btnThemeSystem;
    private Button btnThemeLight;
    private Button btnThemeDark;
    private TextView textConnectionDiagnostic;

    // Layer 2: QR Scanner / Pairing Overlay Sheet
    private View overlayQrScanner;
    private TextureView cameraTextureView;
    private View viewQrScanLine;
    private ImageButton btnQrTorch;
    private TextView textQrScannerStatus;
    private ScrollView scrollPairingSheet;
    private LinearLayout layoutPairingSheet;
    private EditText editFallbackCode;
    private Button btnSubmitCode;
    private TextView textToggleAdvancedHost;
    private LinearLayout layoutAdvancedHost;
    private EditText editServerHost;
    private EditText editServerPort;
    private Button btnManualConnect;

    // Camera & QR Scanner State
    private Camera mCamera;
    private boolean isScanning = false;
    private boolean isTorchOn = false;
    private ObjectAnimator scanLineAnimator;
    private final ExecutorService cameraExecutor = Executors.newSingleThreadExecutor();

    // Swipe Gesture Navigation
    private GestureDetector gestureDetector;
    private boolean isTransitioningTab = false;

    // Recording Runtime State
    private boolean isRecording = false;
    private long recordingStartTime = 0;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private final Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRecording) {
                long elapsed = System.currentTimeMillis() - recordingStartTime;
                int seconds = (int) (elapsed / 1000) % 60;
                int minutes = (int) ((elapsed / (1000 * 60)) % 60);
                int hours = (int) (elapsed / (1000 * 60 * 60));
                String formatted = String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds);
                if (textRecordingTimer != null) textRecordingTimer.setText(formatted);
                if (textStudioTimer != null) textStudioTimer.setText(formatted);
                mainHandler.postDelayed(this, 1000);
            }
        }
    };

    @Override
    protected void attachBaseContext(Context newBase) {
        try {
            SharedPreferences sp = newBase.getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
            String theme = sp.getString(KEY_THEME, "system");
            if ("dark".equalsIgnoreCase(theme) || "light".equalsIgnoreCase(theme)) {
                Configuration config = new Configuration(newBase.getResources().getConfiguration());
                int nightFlag = "dark".equalsIgnoreCase(theme) ? Configuration.UI_MODE_NIGHT_YES : Configuration.UI_MODE_NIGHT_NO;
                config.uiMode = (config.uiMode & ~Configuration.UI_MODE_NIGHT_MASK) | nightFlag;
                super.attachBaseContext(newBase.createConfigurationContext(config));
                return;
            }
        } catch (Throwable t) {
            Log.w(TAG, "Failed setting configuration in attachBaseContext", t);
        }
        super.attachBaseContext(newBase);
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
        String savedTheme = prefs.getString(KEY_THEME, "system");

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            getWindow().setStatusBarColor(getColor(R.color.background));
            getWindow().setNavigationBarColor(getColor(R.color.tab_bar_bg));
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        }

        setContentView(R.layout.activity_main);

        timetableStore = new TimetableStore(this);
        recordingStore = new RecordingStore(this);
        connectionManager = new ConnectionManager(this);

        // Determine current day of week (Mon=0 .. Sun=6)
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        selectedDay = (dayOfWeek + 5) % 7;

        bindViews();
        setupWindowInsets();
        setupSwipeGestureDetector();
        setupListeners();
        setupDaySelector();
        updateThemeButtons(savedTheme);
        setupConnectionManagerListener();
        setupWaveformListener();

        updateActiveSlotBanner();
        updateTimetableSlotsList();
        updateRecordingsList();
        updateSettingsView();

        requestAppPermissions();
        selectTab(0);

        handleDeepLink(getIntent());
        handleAdbIntent(getIntent());
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (connectionManager != null) {
            connectionManager.onAppForeground();
        }
        updateSettingsView();
        updateActiveSlotBanner();
    }

    @Override
    protected void onPause() {
        super.onPause();
        stopCameraPreview();
        if (connectionManager != null) {
            connectionManager.onAppBackground();
        }
        if (previewPlayer != null && previewPlayer.isPlaying()) {
            previewPlayer.stop();
            previewPlayer.release();
            previewPlayer = null;
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        stopCameraPreview();
        try {
            cameraExecutor.shutdown();
        } catch (Exception ignored) {}
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleDeepLink(intent);
        handleAdbIntent(intent);
    }

    private void handleDeepLink(Intent intent) {
        if (intent == null || intent.getData() == null) return;
        Uri uri = intent.getData();
        if ("lecturewhisper".equalsIgnoreCase(uri.getScheme()) && "pair".equalsIgnoreCase(uri.getHost())) {
            PairingPayload payload = PairingPayload.parse(uri.toString());
            if (payload != null) {
                promptPairingConfirmation(payload);
            }
        }
    }

    private void handleAdbIntent(Intent intent) {
        if (intent == null) return;
        String action = intent.getStringExtra("action");
        if (action != null) {
            Log.i(TAG, "Received ADB intent action: " + action);
            if ("start".equalsIgnoreCase(action)) {
                String subject = intent.getStringExtra("subject");
                if (subject != null && !subject.isEmpty() && editRecordingSubject != null) {
                    editRecordingSubject.setText(subject);
                }
                if (!isRecording) {
                    startRecordingSession();
                }
            } else if ("stop".equalsIgnoreCase(action)) {
                if (isRecording) {
                    stopRecordingSession();
                }
            }
        }
    }

    private void setupWindowInsets() {
        View rootLayout = findViewById(R.id.root_layout);
        final View topAppBar = findViewById(R.id.top_app_bar);
        final View bottomNavBar = findViewById(R.id.bottom_navigation_bar);

        if (rootLayout == null) return;

        rootLayout.setOnApplyWindowInsetsListener((v, insets) -> {
            int statusBarTop = 0;
            int navBarBottom = 0;
            int imeBottom = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets sb = insets.getInsets(
                        WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout()
                );
                android.graphics.Insets nb = insets.getInsets(
                        WindowInsets.Type.navigationBars()
                );
                android.graphics.Insets ime = insets.getInsets(
                        WindowInsets.Type.ime()
                );
                statusBarTop = sb.top;
                navBarBottom = nb.bottom;
                imeBottom = ime.bottom;
            } else {
                statusBarTop = insets.getSystemWindowInsetTop();
                navBarBottom = insets.getSystemWindowInsetBottom();
            }

            int safeTopPadding = Math.max(statusBarTop, dpToPx(38));
            if (topAppBar != null) {
                topAppBar.setPadding(dpToPx(16), safeTopPadding, dpToPx(16), dpToPx(6));
            }

            // High-clearance navigation bar padding to prevent interference with gesture pill / 3-button nav
            int safeBottomPadding = Math.max(navBarBottom, dpToPx(24)) + dpToPx(8);
            if (bottomNavBar != null) {
                bottomNavBar.setPadding(
                        bottomNavBar.getPaddingLeft(),
                        dpToPx(8),
                        bottomNavBar.getPaddingRight(),
                        safeBottomPadding
                );
            }

            // Dynamically elevate pairing bottom sheet and scroll input box above keyboard
            if (layoutPairingSheet != null) {
                int sheetBottomPadding = (imeBottom > 0)
                        ? (imeBottom + dpToPx(16))
                        : (Math.max(navBarBottom, dpToPx(24)) + dpToPx(16));
                layoutPairingSheet.setPadding(
                        layoutPairingSheet.getPaddingLeft(),
                        layoutPairingSheet.getPaddingTop(),
                        layoutPairingSheet.getPaddingRight(),
                        sheetBottomPadding
                );
                if (imeBottom > 0 && scrollPairingSheet != null) {
                    scrollPairingSheet.post(() -> {
                        scrollPairingSheet.smoothScrollTo(0, layoutPairingSheet.getBottom());
                    });
                }
            }

            return insets;
        });

        rootLayout.requestApplyInsets();
    }

    private void setupSwipeGestureDetector() {
        gestureDetector = new GestureDetector(this, new GestureDetector.SimpleOnGestureListener() {
            @Override
            public boolean onFling(MotionEvent e1, MotionEvent e2, float velocityX, float velocityY) {
                if (e1 == null || e2 == null) return false;
                if (overlayQrScanner != null && overlayQrScanner.getVisibility() == View.VISIBLE) return false;
                if (isRecording && isScreenLocked) return false;

                float diffX = e2.getX() - e1.getX();
                float diffY = e2.getY() - e1.getY();

                // Calibrated sensitivity: predominantly horizontal fling with min distance and velocity
                if (Math.abs(diffX) > Math.abs(diffY) * 1.35f
                        && Math.abs(diffX) > dpToPx(45)
                        && Math.abs(velocityX) > dpToPx(100)) {
                    if (diffX > 0) {
                        // Swipe right -> advance to next section
                        int next = (currentTab + 1) % 5;
                        selectTabWithAnimation(next, true);
                        return true;
                    } else {
                        // Swipe left -> return to previous section
                        int prev = (currentTab - 1 + 5) % 5;
                        selectTabWithAnimation(prev, false);
                        return true;
                    }
                }
                return false;
            }
        });
    }

    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (overlayQrScanner != null && overlayQrScanner.getVisibility() == View.VISIBLE) {
            return super.dispatchTouchEvent(ev);
        }
        if (gestureDetector != null && gestureDetector.onTouchEvent(ev)) {
            return true;
        }
        return super.dispatchTouchEvent(ev);
    }

    private void bindViews() {
        textCurrentPageTitle = findViewById(R.id.text_current_page_title);
        textCurrentPageSubtitle = findViewById(R.id.text_current_page_subtitle);
        chipConnectionStatus = findViewById(R.id.chip_connection_status);
        viewConnectionDot = findViewById(R.id.view_connection_dot);
        textConnectionBadge = findViewById(R.id.text_connection_badge);

        viewTabToday = findViewById(R.id.view_tab_today);
        viewTabSchedule = findViewById(R.id.view_tab_schedule);
        viewTabRecord = findViewById(R.id.view_tab_record);
        viewTabLibrary = findViewById(R.id.view_tab_library);
        viewTabSettings = findViewById(R.id.view_tab_settings);

        tabBtnToday = findViewById(R.id.tab_btn_today);
        tabBtnSchedule = findViewById(R.id.tab_btn_schedule);
        tabBtnRecord = findViewById(R.id.tab_btn_record);
        tabBtnLibrary = findViewById(R.id.tab_btn_library);
        tabBtnSettings = findViewById(R.id.tab_btn_settings);

        iconTabToday = findViewById(R.id.icon_tab_today);
        iconTabSchedule = findViewById(R.id.icon_tab_schedule);
        iconTabRecord = findViewById(R.id.icon_tab_record);
        iconTabLibrary = findViewById(R.id.icon_tab_library);
        iconTabSettings = findViewById(R.id.icon_tab_settings);

        textTabToday = findViewById(R.id.text_tab_today);
        textTabSchedule = findViewById(R.id.text_tab_schedule);
        textTabLibrary = findViewById(R.id.text_tab_library);
        textTabSettings = findViewById(R.id.text_tab_settings);

        // Tab 0 Views
        bannerTimetableSlot = findViewById(R.id.banner_timetable_slot);
        textBannerType = findViewById(R.id.text_banner_type);
        textBannerSubject = findViewById(R.id.text_banner_subject);
        textBannerDetails = findViewById(R.id.text_banner_details);
        textRecordingStatus = findViewById(R.id.text_recording_status);
        textRecordingTimer = findViewById(R.id.text_recording_timer);
        btnHeroRecord = findViewById(R.id.btn_hero_record);
        textChunkInfo = findViewById(R.id.text_chunk_info);
        textSyncSummary = findViewById(R.id.text_sync_summary);
        btnSyncNow = findViewById(R.id.btn_sync_now);
        containerTodayClasses = findViewById(R.id.container_today_classes);
        textTodayEmptyState = findViewById(R.id.text_today_empty_state);

        // Tab 1 Views
        btnUploadTimetableOcr = findViewById(R.id.btn_upload_timetable_ocr);
        btnAddSlot = findViewById(R.id.btn_add_slot);
        layoutOcrProgress = findViewById(R.id.layout_ocr_progress);
        textOcrProgressStatus = findViewById(R.id.text_ocr_progress_status);
        containerTimetableSlots = findViewById(R.id.container_timetable_slots);
        dayButtons[0] = findViewById(R.id.btn_day_mon);
        dayButtons[1] = findViewById(R.id.btn_day_tue);
        dayButtons[2] = findViewById(R.id.btn_day_wed);
        dayButtons[3] = findViewById(R.id.btn_day_thu);
        dayButtons[4] = findViewById(R.id.btn_day_fri);
        dayButtons[5] = findViewById(R.id.btn_day_sat);
        dayButtons[6] = findViewById(R.id.btn_day_sun);

        // Tab 2 Views
        textStudioTimer = findViewById(R.id.text_studio_timer);
        editRecordingSubject = findViewById(R.id.edit_recording_subject);
        btnStudioStop = findViewById(R.id.btn_studio_stop);
        btnLockGuard = findViewById(R.id.btn_lock_guard);
        waveBars[0] = findViewById(R.id.wave_bar_1);
        waveBars[1] = findViewById(R.id.wave_bar_2);
        waveBars[2] = findViewById(R.id.wave_bar_3);
        waveBars[3] = findViewById(R.id.wave_bar_4);
        waveBars[4] = findViewById(R.id.wave_bar_5);
        waveBars[5] = findViewById(R.id.wave_bar_6);
        waveBars[6] = findViewById(R.id.wave_bar_7);

        // Tab 3 Views
        textRecordingsStats = findViewById(R.id.text_recordings_stats);
        btnSyncAllRecordings = findViewById(R.id.btn_sync_all_recordings);
        containerRecordingsList = findViewById(R.id.container_recordings_list);

        // Tab 4 Views
        textSettingsMacName = findViewById(R.id.text_settings_mac_name);
        textSettingsServerId = findViewById(R.id.text_settings_server_id);
        btnSettingsPairQr = findViewById(R.id.btn_settings_pair_qr);
        btnSettingsForgetMac = findViewById(R.id.btn_settings_forget_mac);
        textStorageAvailable = findViewById(R.id.text_storage_available);
        textStorageAppUsage = findViewById(R.id.text_storage_app_usage);
        btnCleanSyncedChunks = findViewById(R.id.btn_clean_synced_chunks);
        btnThemeSystem = findViewById(R.id.btn_theme_system);
        btnThemeLight = findViewById(R.id.btn_theme_light);
        btnThemeDark = findViewById(R.id.btn_theme_dark);
        textConnectionDiagnostic = findViewById(R.id.text_connection_diagnostic);

        // Overlay Views
        overlayQrScanner = findViewById(R.id.overlay_qr_scanner);
        cameraTextureView = findViewById(R.id.camera_texture_view);
        viewQrScanLine = findViewById(R.id.view_qr_scan_line);
        btnQrTorch = findViewById(R.id.btn_qr_torch);
        textQrScannerStatus = findViewById(R.id.text_qr_scanner_status);
        scrollPairingSheet = findViewById(R.id.scroll_pairing_sheet);
        layoutPairingSheet = findViewById(R.id.layout_pairing_sheet);
        editFallbackCode = findViewById(R.id.edit_fallback_code);
        btnSubmitCode = findViewById(R.id.btn_submit_code);
        textToggleAdvancedHost = findViewById(R.id.text_toggle_advanced_host);
        layoutAdvancedHost = findViewById(R.id.layout_advanced_host);
        editServerHost = findViewById(R.id.edit_server_host);
        editServerPort = findViewById(R.id.edit_server_port);
        btnManualConnect = findViewById(R.id.btn_manual_connect);
    }

    private void setupListeners() {
        // Tab Navigation with animated slide/fade
        tabBtnToday.setOnClickListener(v -> selectTabWithAnimation(0, 0 > currentTab));
        tabBtnSchedule.setOnClickListener(v -> selectTabWithAnimation(1, 1 > currentTab));
        tabBtnRecord.setOnClickListener(v -> {
            if (!isRecording) {
                startRecordingSession();
            }
            selectTabWithAnimation(2, 2 > currentTab);
        });
        tabBtnLibrary.setOnClickListener(v -> selectTabWithAnimation(3, 3 > currentTab));
        tabBtnSettings.setOnClickListener(v -> selectTabWithAnimation(4, 4 > currentTab));

        chipConnectionStatus.setOnClickListener(v -> showQrScannerOverlay());

        // Keyboard elevation listener: auto scroll PIN code into full view above keyboard
        if (editFallbackCode != null) {
            editFallbackCode.setOnFocusChangeListener((v, hasFocus) -> {
                if (hasFocus && scrollPairingSheet != null && layoutPairingSheet != null) {
                    scrollPairingSheet.postDelayed(() -> {
                        scrollPairingSheet.smoothScrollTo(0, layoutPairingSheet.getBottom());
                    }, 250);
                }
            });
        }

        if (btnQrTorch != null) {
            btnQrTorch.setOnClickListener(v -> toggleCameraTorch());
        }

        // Tab 0 Actions
        btnHeroRecord.setOnClickListener(v -> {
            if (!hasPermissions()) {
                requestAppPermissions();
                return;
            }
            if (!isRecording) {
                startRecordingSession();
                selectTab(2);
            } else {
                stopRecordingSession();
            }
        });

        btnSyncNow.setOnClickListener(v -> syncAllUnsyncedAudio());

        // Tab 1 Actions
        btnUploadTimetableOcr.setOnClickListener(v -> pickTimetableImage());
        btnAddSlot.setOnClickListener(v -> showAddSlotDialog());

        // Tab 2 Actions
        btnStudioStop.setOnClickListener(v -> {
            if (isScreenLocked) {
                Toast.makeText(this, "Screen is locked. Tap 🔒 to unlock first.", Toast.LENGTH_SHORT).show();
                return;
            }
            stopRecordingSession();
            selectTab(0);
        });

        btnLockGuard.setOnClickListener(v -> {
            isScreenLocked = !isScreenLocked;
            btnLockGuard.setText(isScreenLocked ? "🔓" : "🔒");
            Toast.makeText(this, isScreenLocked ? "Screen Locked (Accidental taps guarded)" : "Screen Unlocked", Toast.LENGTH_SHORT).show();
        });

        // Tab 3 Actions
        btnSyncAllRecordings.setOnClickListener(v -> syncAllUnsyncedAudio());

        // Tab 4 Actions
        btnSettingsPairQr.setOnClickListener(v -> showQrScannerOverlay());
        btnSettingsForgetMac.setOnClickListener(v -> {
            new AlertDialog.Builder(this)
                    .setTitle("Forget Paired Mac")
                    .setMessage("This will disconnect from your current Mac and require scanning a new QR code.")
                    .setPositiveButton("Forget", (d, w) -> {
                        connectionManager.forgetPairing();
                        updateSettingsView();
                        Toast.makeText(this, "Paired Mac forgotten", Toast.LENGTH_SHORT).show();
                    })
                    .setNegativeButton("Cancel", null)
                    .show();
        });

        btnCleanSyncedChunks.setOnClickListener(v -> {
            int pruned = recordingStore.pruneSyncedChunks();
            Toast.makeText(this, "Cleaned up " + pruned + " synced audio files", Toast.LENGTH_SHORT).show();
            updateSettingsView();
            updateRecordingsList();
        });

        btnThemeSystem.setOnClickListener(v -> setAppTheme("system"));
        btnThemeLight.setOnClickListener(v -> setAppTheme("light"));
        btnThemeDark.setOnClickListener(v -> setAppTheme("dark"));

        // QR Sheet Actions
        findViewById(R.id.btn_close_qr_scanner).setOnClickListener(v -> hideQrScannerOverlay());
        btnSubmitCode.setOnClickListener(v -> {
            String code = editFallbackCode.getText().toString().trim();
            if (code.isEmpty()) {
                Toast.makeText(this, "Please enter the 6-digit code or paste QR URL", Toast.LENGTH_SHORT).show();
                return;
            }
            processPairingInput(code);
        });

        textToggleAdvancedHost.setOnClickListener(v -> {
            if (layoutAdvancedHost.getVisibility() == View.VISIBLE) {
                layoutAdvancedHost.setVisibility(View.GONE);
                textToggleAdvancedHost.setText("Advanced Host Settings ▼");
            } else {
                layoutAdvancedHost.setVisibility(View.VISIBLE);
                textToggleAdvancedHost.setText("Advanced Host Settings ▲");
            }
        });

        btnManualConnect.setOnClickListener(v -> {
            String host = editServerHost.getText().toString().trim();
            String portStr = editServerPort.getText().toString().trim();
            int port = portStr.isEmpty() ? 8420 : Integer.parseInt(portStr);
            if (!host.isEmpty()) {
                connectionManager.savePairingData(
                        "manual_dev_token",
                        "Manual Host",
                        host,
                        null,
                        List.of(host),
                        port
                );
                hideQrScannerOverlay();
                connectionManager.refreshConnection();
                Toast.makeText(this, "Saved manual host: " + host + ":" + port, Toast.LENGTH_SHORT).show();
            }
        });
    }

    private View getTabView(int index) {
        switch (index) {
            case 0: return viewTabToday;
            case 1: return viewTabSchedule;
            case 2: return viewTabRecord;
            case 3: return viewTabLibrary;
            case 4: return viewTabSettings;
            default: return null;
        }
    }

    private void updatePageHeader(int tabIndex) {
        switch (tabIndex) {
            case 0:
                textCurrentPageTitle.setText("Today");
                textCurrentPageSubtitle.setText("Pixel 8a");
                updateActiveSlotBanner();
                break;
            case 1:
                textCurrentPageTitle.setText("Schedule");
                textCurrentPageSubtitle.setText("Weekly Timetable");
                updateTimetableSlotsList();
                break;
            case 2:
                textCurrentPageTitle.setText("Record Studio");
                textCurrentPageSubtitle.setText(isRecording ? "Active Session" : "Standby");
                break;
            case 3:
                textCurrentPageTitle.setText("Library");
                textCurrentPageSubtitle.setText("Audio Recordings");
                updateRecordingsList();
                break;
            case 4:
                textCurrentPageTitle.setText("Settings");
                textCurrentPageSubtitle.setText("Mac Sync & Preferences");
                updateSettingsView();
                break;
        }
    }

    private void selectTab(int tabIndex) {
        currentTab = tabIndex;
        for (int i = 0; i < 5; i++) {
            View tv = getTabView(i);
            if (tv != null) {
                tv.setVisibility(i == tabIndex ? View.VISIBLE : View.GONE);
                tv.setTranslationX(0f);
                tv.setAlpha(1.0f);
            }
        }

        updateTabAppearance(tabBtnToday, iconTabToday, textTabToday, tabIndex == 0);
        updateTabAppearance(tabBtnSchedule, iconTabSchedule, textTabSchedule, tabIndex == 1);
        updateTabAppearance(tabBtnLibrary, iconTabLibrary, textTabLibrary, tabIndex == 3);
        updateTabAppearance(tabBtnSettings, iconTabSettings, textTabSettings, tabIndex == 4);

        updatePageHeader(tabIndex);
    }

    private void selectTabWithAnimation(final int targetTab, final boolean forward) {
        if (targetTab == currentTab || isTransitioningTab) return;
        isTransitioningTab = true;

        final View currentView = getTabView(currentTab);
        final View nextView = getTabView(targetTab);

        final int width = currentView != null && currentView.getWidth() > 0
                ? currentView.getWidth()
                : getResources().getDisplayMetrics().widthPixels;
        final float startOffset = forward ? width : -width;
        final float endOffset = forward ? -width : width;

        if (nextView != null) {
            nextView.setVisibility(View.VISIBLE);
            nextView.setTranslationX(startOffset);
            nextView.setAlpha(0.2f);

            nextView.animate()
                    .translationX(0f)
                    .alpha(1.0f)
                    .setDuration(240)
                    .setInterpolator(new DecelerateInterpolator())
                    .start();
        }

        if (currentView != null) {
            currentView.animate()
                    .translationX(endOffset)
                    .alpha(0.0f)
                    .setDuration(240)
                    .setInterpolator(new DecelerateInterpolator())
                    .withEndAction(() -> {
                        currentView.setVisibility(View.GONE);
                        currentView.setTranslationX(0f);
                        currentView.setAlpha(1.0f);
                        isTransitioningTab = false;
                    })
                    .start();
        } else {
            isTransitioningTab = false;
        }

        currentTab = targetTab;
        updateTabAppearance(tabBtnToday, iconTabToday, textTabToday, targetTab == 0);
        updateTabAppearance(tabBtnSchedule, iconTabSchedule, textTabSchedule, targetTab == 1);
        updateTabAppearance(tabBtnLibrary, iconTabLibrary, textTabLibrary, targetTab == 3);
        updateTabAppearance(tabBtnSettings, iconTabSettings, textTabSettings, targetTab == 4);

        updatePageHeader(targetTab);
    }

    private void updateTabAppearance(View tabBtn, ImageView icon, TextView text, boolean isActive) {
        int colorActive = getColor(R.color.tab_icon_active);
        int colorInactive = getColor(R.color.tab_icon_inactive);

        if (icon != null) {
            icon.setImageTintList(ColorStateList.valueOf(isActive ? colorActive : colorInactive));
        }
        if (text != null) {
            text.setTextColor(isActive ? colorActive : colorInactive);
            text.setTypeface(null, isActive ? android.graphics.Typeface.BOLD : android.graphics.Typeface.NORMAL);
        }
    }

    private void setupConnectionManagerListener() {
        connectionManager.setStateListener((state, message, pingMs) -> {
            switch (state) {
                case CONNECTED:
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_connected);
                    viewConnectionDot.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.status_connected_text)));
                    textConnectionBadge.setTextColor(getColor(R.color.status_connected_text));
                    textConnectionBadge.setText(pingMs > 0 ? "Connected (" + pingMs + "ms)" : "Connected");
                    break;
                case SEARCHING:
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_disconnected);
                    viewConnectionDot.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.warning)));
                    textConnectionBadge.setTextColor(getColor(R.color.status_searching_text));
                    textConnectionBadge.setText("Searching...");
                    break;
                case SYNCING:
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_connected);
                    viewConnectionDot.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.primary)));
                    textConnectionBadge.setTextColor(getColor(R.color.primary));
                    textConnectionBadge.setText("Syncing...");
                    break;
                case UNREACHABLE:
                case NOT_PAIRED:
                default:
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_disconnected);
                    viewConnectionDot.setBackgroundTintList(ColorStateList.valueOf(getColor(R.color.text_muted)));
                    textConnectionBadge.setTextColor(getColor(R.color.text_secondary));
                    textConnectionBadge.setText(state == ConnectionManager.State.NOT_PAIRED ? "Pair Mac" : "Offline");
                    break;
            }
            if (textConnectionDiagnostic != null) {
                textConnectionDiagnostic.setText(message);
            }
        });
    }

    private void setupWaveformListener() {
        RecorderService.amplitudeListener = amp -> runOnUiThread(() -> {
            if (!isRecording) return;
            // Map amp (0..32767) to bar heights (8dp .. 54dp)
            float norm = Math.min(1.0f, amp / 24000.0f);
            int baseDp = 10;
            int maxDp = 52;
            int centerHeight = (int) (baseDp + (maxDp - baseDp) * norm);

            int h0 = Math.max(dpToPx(8), (int) (centerHeight * 0.35));
            int h1 = Math.max(dpToPx(12), (int) (centerHeight * 0.60));
            int h2 = Math.max(dpToPx(16), (int) (centerHeight * 0.85));
            int h3 = Math.max(dpToPx(20), centerHeight);
            int h4 = h2;
            int h5 = h1;
            int h6 = h0;

            setBarHeight(waveBars[0], h0);
            setBarHeight(waveBars[1], h1);
            setBarHeight(waveBars[2], h2);
            setBarHeight(waveBars[3], h3);
            setBarHeight(waveBars[4], h4);
            setBarHeight(waveBars[5], h5);
            setBarHeight(waveBars[6], h6);
        });
    }

    private void setBarHeight(View bar, int px) {
        if (bar != null) {
            ViewGroup.LayoutParams lp = bar.getLayoutParams();
            if (lp != null) {
                lp.height = px;
                bar.setLayoutParams(lp);
            }
        }
    }

    private void showQrScannerOverlay() {
        overlayQrScanner.setVisibility(View.VISIBLE);
        if (editFallbackCode != null) editFallbackCode.setText("");
        if (editServerHost != null) editServerHost.setText(connectionManager.getActiveHost() != null ? connectionManager.getActiveHost() : "127.0.0.1");
        if (editServerPort != null) editServerPort.setText(String.valueOf(connectionManager.getActivePort()));
        initCameraViewfinder();
    }

    private void hideQrScannerOverlay() {
        stopCameraPreview();
        overlayQrScanner.setVisibility(View.GONE);
    }

    private void initCameraViewfinder() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[]{Manifest.permission.CAMERA}, PERMISSION_REQUEST_CODE);
            return;
        }

        if (cameraTextureView == null) return;

        if (cameraTextureView.isAvailable()) {
            startCameraPreview(cameraTextureView.getSurfaceTexture());
        } else {
            cameraTextureView.setSurfaceTextureListener(new TextureView.SurfaceTextureListener() {
                @Override
                public void onSurfaceTextureAvailable(SurfaceTexture surface, int width, int height) {
                    startCameraPreview(surface);
                }

                @Override
                public void onSurfaceTextureSizeChanged(SurfaceTexture surface, int width, int height) {}

                @Override
                public boolean onSurfaceTextureDestroyed(SurfaceTexture surface) {
                    stopCameraPreview();
                    return true;
                }

                @Override
                public void onSurfaceTextureUpdated(SurfaceTexture surface) {}
            });
        }
    }

    private void startCameraPreview(SurfaceTexture surface) {
        try {
            stopCameraPreview();
            mCamera = Camera.open(0);
            if (mCamera == null) {
                if (textQrScannerStatus != null) {
                    textQrScannerStatus.setText("Camera not available. Enter 6-digit code below.");
                }
                return;
            }

            mCamera.setDisplayOrientation(90);
            Camera.Parameters params = mCamera.getParameters();

            List<String> focusModes = params.getSupportedFocusModes();
            if (focusModes != null && focusModes.contains(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE)) {
                params.setFocusMode(Camera.Parameters.FOCUS_MODE_CONTINUOUS_PICTURE);
            }

            List<Camera.Size> sizes = params.getSupportedPreviewSizes();
            if (sizes != null && !sizes.isEmpty()) {
                Camera.Size best = sizes.get(0);
                for (Camera.Size s : sizes) {
                    if (Math.abs(s.width - 1280) + Math.abs(s.height - 720) < Math.abs(best.width - 1280) + Math.abs(best.height - 720)) {
                        best = s;
                    }
                }
                params.setPreviewSize(best.width, best.height);
            }

            mCamera.setParameters(params);
            mCamera.setPreviewTexture(surface);

            isScanning = true;
            final MultiFormatReader qrReader = new MultiFormatReader();
            Map<DecodeHintType, Object> hints = new EnumMap<>(DecodeHintType.class);
            hints.put(DecodeHintType.POSSIBLE_FORMATS, Collections.singletonList(BarcodeFormat.QR_CODE));
            hints.put(DecodeHintType.TRY_HARDER, Boolean.TRUE);
            qrReader.setHints(hints);

            final AtomicBoolean isProcessingFrame = new AtomicBoolean(false);

            mCamera.setPreviewCallback((data, camera) -> {
                if (!isScanning || isProcessingFrame.get()) return;
                isProcessingFrame.set(true);

                cameraExecutor.execute(() -> {
                    try {
                        if (!isScanning) return;
                        Camera.Size size = camera.getParameters().getPreviewSize();
                        int width = size.width;
                        int height = size.height;

                        PlanarYUVLuminanceSource source = new PlanarYUVLuminanceSource(
                                data, width, height, 0, 0, width, height, false
                        );
                        BinaryBitmap bitmap = new BinaryBitmap(new HybridBinarizer(source));

                        Result result = null;
                        try {
                            result = qrReader.decodeWithState(bitmap);
                        } catch (Exception notFound) {
                            qrReader.reset();
                        }

                        if (result != null && result.getText() != null && !result.getText().isEmpty()) {
                            final String qrText = result.getText();
                            Log.i(TAG, "Scanned QR code content: " + qrText);
                            isScanning = false;
                            runOnUiThread(() -> onQrCodeScanned(qrText));
                        }
                    } catch (Exception e) {
                        Log.v(TAG, "Frame decode error: " + e.getMessage());
                    } finally {
                        qrReader.reset();
                        isProcessingFrame.set(false);
                    }
                });
            });

            mCamera.startPreview();
            startScanAnimation();
            if (textQrScannerStatus != null) {
                textQrScannerStatus.setText("Point camera at QR code on Mac to connect automatically");
            }
        } catch (Exception e) {
            Log.e(TAG, "Error starting camera preview", e);
            if (textQrScannerStatus != null) {
                textQrScannerStatus.setText("Camera error. You can enter the 6-digit code below.");
            }
        }
    }

    private void stopCameraPreview() {
        isScanning = false;
        stopScanAnimation();
        if (mCamera != null) {
            try {
                mCamera.setPreviewCallback(null);
                mCamera.stopPreview();
                mCamera.release();
            } catch (Exception ignored) {}
            mCamera = null;
        }
    }

    private void startScanAnimation() {
        if (viewQrScanLine == null) return;
        stopScanAnimation();
        viewQrScanLine.setVisibility(View.VISIBLE);
        scanLineAnimator = ObjectAnimator.ofFloat(viewQrScanLine, "translationY", 0f, dpToPx(190));
        scanLineAnimator.setDuration(1600);
        scanLineAnimator.setRepeatMode(ValueAnimator.REVERSE);
        scanLineAnimator.setRepeatCount(ValueAnimator.INFINITE);
        scanLineAnimator.setInterpolator(new AccelerateDecelerateInterpolator());
        scanLineAnimator.start();
    }

    private void stopScanAnimation() {
        if (scanLineAnimator != null) {
            scanLineAnimator.cancel();
            scanLineAnimator = null;
        }
        if (viewQrScanLine != null) {
            viewQrScanLine.setTranslationY(0f);
        }
    }

    private void toggleCameraTorch() {
        if (mCamera == null) return;
        try {
            Camera.Parameters params = mCamera.getParameters();
            List<String> flashModes = params.getSupportedFlashModes();
            if (flashModes != null && flashModes.contains(Camera.Parameters.FLASH_MODE_TORCH)) {
                isTorchOn = !isTorchOn;
                params.setFlashMode(isTorchOn ? Camera.Parameters.FLASH_MODE_TORCH : Camera.Parameters.FLASH_MODE_OFF);
                mCamera.setParameters(params);
                if (btnQrTorch != null) {
                    btnQrTorch.setImageTintList(ColorStateList.valueOf(getColor(isTorchOn ? R.color.primary : R.color.text_secondary)));
                }
            }
        } catch (Exception e) {
            Log.w(TAG, "Torch toggle error", e);
        }
    }

    private void onQrCodeScanned(String qrText) {
        // Haptic feedback
        try {
            Vibrator v = (Vibrator) getSystemService(Context.VIBRATOR_SERVICE);
            if (v != null) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    v.vibrate(VibrationEffect.createOneShot(100, VibrationEffect.DEFAULT_AMPLITUDE));
                } else {
                    v.vibrate(100);
                }
            }
        } catch (Exception ignored) {}

        if (textQrScannerStatus != null) {
            textQrScannerStatus.setText("QR detected! Connecting to Mac...");
        }

        PairingPayload payload = PairingPayload.parse(qrText);
        if (payload != null) {
            completePairingWithPayload(payload);
        } else {
            Toast.makeText(this, "Unrecognized QR code. Point at Lecture Whisper QR.", Toast.LENGTH_SHORT).show();
            isScanning = true;
        }
    }

    private void promptPairingConfirmation(PairingPayload payload) {
        new AlertDialog.Builder(this)
                .setTitle("Pair with " + payload.macName + "?")
                .setMessage("Mac Host: " + (payload.addressCandidates.isEmpty() ? "127.0.0.1" : payload.addressCandidates.get(0)) + "\n"
                        + "Port: " + payload.port + "\n"
                        + (payload.certFingerprint != null ? "Certificate Fingerprint:\n" + payload.certFingerprint.substring(0, Math.min(24, payload.certFingerprint.length())) + "..." : ""))
                .setPositiveButton("Pair Now", (d, w) -> {
                    completePairingWithPayload(payload);
                })
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void processPairingInput(String input) {
        PairingPayload payload = PairingPayload.parse(input);
        if (payload == null) {
            Toast.makeText(this, "Could not parse code or QR. Please check format.", Toast.LENGTH_SHORT).show();
            return;
        }
        completePairingWithPayload(payload);
    }

    private void completePairingWithPayload(PairingPayload payload) {
        runOnUiThread(() -> Toast.makeText(this, "Pairing with " + payload.macName + "...", Toast.LENGTH_SHORT).show());

        new Thread(() -> {
            // Build candidates in priority order
            List<String> candidatesToTry = new ArrayList<>();

            // 1. Hosts from QR payload
            for (String h : payload.addressCandidates) {
                if (h != null && !h.trim().isEmpty() && !candidatesToTry.contains(h.trim())) {
                    candidatesToTry.add(h.trim());
                }
            }

            // 2. Manual host field if user typed one
            if (editServerHost != null) {
                String manualHost = editServerHost.getText().toString().trim();
                if (!manualHost.isEmpty() && !candidatesToTry.contains(manualHost)) {
                    candidatesToTry.add(manualHost);
                }
            }

            // 3. Active host in connectionManager
            String active = connectionManager.getActiveHost();
            if (active != null && !candidatesToTry.contains(active)) {
                candidatesToTry.add(active);
            }

            // 4. MRU cached hosts
            for (String h : connectionManager.getMruCandidates()) {
                if (h != null && !candidatesToTry.contains(h)) {
                    candidatesToTry.add(h);
                }
            }

            // 5. Default Wi-Fi gateway IP
            try {
                WifiManager wm = (WifiManager) getApplicationContext().getSystemService(Context.WIFI_SERVICE);
                if (wm != null && wm.getDhcpInfo() != null) {
                    int gw = wm.getDhcpInfo().gateway;
                    if (gw != 0) {
                        String gwIp = String.format(Locale.US, "%d.%d.%d.%d",
                                (gw & 0xff), (gw >> 8 & 0xff), (gw >> 16 & 0xff), (gw >> 24 & 0xff));
                        if (!candidatesToTry.contains(gwIp)) {
                            candidatesToTry.add(gwIp);
                        }
                    }
                }
            } catch (Exception ignored) {}

            // 6. Loopback fallback (for adb reverse)
            if (!candidatesToTry.contains("127.0.0.1")) {
                candidatesToTry.add("127.0.0.1");
            }

            LaptopSyncClient.PairResult res = null;
            String connectedHost = null;

            for (String candidate : candidatesToTry) {
                Log.i(TAG, "Attempting pairing with: " + candidate + ":" + payload.port);
                res = LaptopSyncClient.completePairing(
                        candidate,
                        payload.port,
                        payload.oneTimeToken,
                        Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID),
                        Build.MODEL
                );
                if (res != null && res.ok) {
                    connectedHost = candidate;
                    break;
                }
            }

            final LaptopSyncClient.PairResult finalRes = res;
            final String finalHost = connectedHost;

            runOnUiThread(() -> {
                if (finalRes != null && finalRes.ok) {
                    List<String> mergedCandidates = new ArrayList<>();
                    if (finalHost != null) mergedCandidates.add(finalHost);
                    if (finalRes.candidates != null) {
                        for (String c : finalRes.candidates) {
                            if (!mergedCandidates.contains(c)) mergedCandidates.add(c);
                        }
                    }
                    connectionManager.savePairingData(
                            finalRes.deviceToken,
                            finalRes.serverId,
                            finalRes.macName,
                            payload.certFingerprint,
                            mergedCandidates,
                            payload.port
                    );
                    hideQrScannerOverlay();
                    Toast.makeText(this, "Paired successfully with " + finalRes.macName + " (" + finalHost + ")!", Toast.LENGTH_LONG).show();
                    updateSettingsView();
                    syncAllUnsyncedAudio();
                } else {
                    String err = (finalRes != null && finalRes.error != null) ? finalRes.error : "Failed to connect to host";
                    Toast.makeText(this, "Pairing failed: " + err, Toast.LENGTH_LONG).show();
                    isScanning = true;
                }
            });
        }).start();
    }

    private void startRecordingSession() {
        isRecording = true;
        recordingStartTime = System.currentTimeMillis();

        String subject = "Lecture";
        if (editRecordingSubject != null && !editRecordingSubject.getText().toString().trim().isEmpty()) {
            subject = editRecordingSubject.getText().toString().trim();
        }

        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_START);
        intent.putExtra(RecorderService.EXTRA_SUBJECT, subject);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }

        btnHeroRecord.setText("Stop recording");
        btnHeroRecord.setBackgroundResource(R.drawable.bg_btn_recording);
        textRecordingStatus.setText("Recording in progress...");
        mainHandler.post(timerRunnable);
    }

    private void stopRecordingSession() {
        isRecording = false;
        mainHandler.removeCallbacks(timerRunnable);

        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_STOP);
        startService(intent);

        btnHeroRecord.setText("Record now");
        btnHeroRecord.setBackgroundResource(R.drawable.bg_btn_primary);
        textRecordingStatus.setText("Ready to record");

        Toast.makeText(this, "Recording saved! Syncing with Mac...", Toast.LENGTH_SHORT).show();
        updateRecordingsList();
        syncAllUnsyncedAudio();
    }

    private void syncAllUnsyncedAudio() {
        if (!connectionManager.isPaired()) {
            Toast.makeText(this, "Please pair with your Mac to sync recordings", Toast.LENGTH_SHORT).show();
            showQrScannerOverlay();
            return;
        }

        connectionManager.setSyncingState(true);
        new Thread(() -> {
            List<RecordingSession> unfinalized = recordingStore.getAllSessions();
            String host = connectionManager.getActiveHost() != null ? connectionManager.getActiveHost() : "127.0.0.1";
            int port = connectionManager.getActivePort();
            String devId = Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);

            for (RecordingSession s : unfinalized) {
                if (!s.isSynced() && s.getChunkCount() > 0) {
                    File dir = new File(s.getDirectoryPath());
                    File[] files = dir.listFiles((d, n) -> n.endsWith(".m4a"));
                    if (files != null) {
                        for (File f : files) {
                            try {
                                LaptopSyncClient.uploadAudioChunk(host, port, f, s.getSubject(), s.getTimetableSlotId(), devId, 0);
                            } catch (Exception ignored) {}
                        }
                    }
                    s.setSynced(true);
                    s.saveMetadata();
                }
            }

            runOnUiThread(() -> {
                connectionManager.setSyncingState(false);
                updateRecordingsList();
                Toast.makeText(this, "Synchronization complete", Toast.LENGTH_SHORT).show();
            });
        }).start();
    }

    private void setupDaySelector() {
        for (int i = 0; i < 7; i++) {
            final int dayIndex = i;
            if (dayButtons[i] != null) {
                dayButtons[i].setOnClickListener(v -> {
                    selectedDay = dayIndex;
                    updateDaySelectorHighlight();
                    updateTimetableSlotsList();
                });
            }
        }
        updateDaySelectorHighlight();
    }

    private void updateDaySelectorHighlight() {
        for (int i = 0; i < 7; i++) {
            if (dayButtons[i] != null) {
                if (i == selectedDay) {
                    dayButtons[i].setBackgroundResource(R.drawable.bg_btn_primary);
                    dayButtons[i].setTextColor(getColor(R.color.on_primary));
                } else {
                    dayButtons[i].setBackgroundResource(R.drawable.bg_input_field);
                    dayButtons[i].setTextColor(getColor(R.color.text_primary));
                }
            }
        }
    }

    private void updateActiveSlotBanner() {
        TimetableStore.ActiveSlotInfo activeInfo = timetableStore.getCurrentOrNextSlot();
        if (activeInfo.type == TimetableStore.ActiveSlotInfo.TYPE_CURRENT && activeInfo.slot != null) {
            TimetableSlot active = activeInfo.slot;
            bannerTimetableSlot.setVisibility(View.VISIBLE);
            bannerTimetableSlot.setBackgroundResource(R.drawable.bg_banner_active_class);
            textBannerType.setText("Current class in progress");
            textBannerType.setTextColor(getColor(R.color.status_connected_text));
            textBannerSubject.setText(active.getSubject());
            textBannerDetails.setText(active.getTimeRangeFormatted() + (!active.getRoom().isEmpty() ? " • " + active.getRoom() : "") + (!active.getLecturer().isEmpty() ? " • " + active.getLecturer() : ""));
            if (editRecordingSubject != null && !isRecording) {
                editRecordingSubject.setText(active.getSubject());
            }
        } else if (activeInfo.type == TimetableStore.ActiveSlotInfo.TYPE_UPCOMING && activeInfo.slot != null) {
            TimetableSlot next = activeInfo.slot;
            bannerTimetableSlot.setVisibility(View.VISIBLE);
            bannerTimetableSlot.setBackgroundResource(R.drawable.bg_banner_upcoming_class);
            textBannerType.setText("Upcoming class in " + activeInfo.minutesUntil + "m");
            textBannerType.setTextColor(getColor(R.color.warning));
            textBannerSubject.setText(next.getSubject());
            textBannerDetails.setText("Starts at " + next.getStartTime() + (!next.getRoom().isEmpty() ? " • " + next.getRoom() : ""));
        } else {
            bannerTimetableSlot.setVisibility(View.GONE);
        }
    }

    private void updateTimetableSlotsList() {
        containerTimetableSlots.removeAllViews();
        List<TimetableSlot> slots = timetableStore.getSlotsForDay(selectedDay);

        if (slots.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No classes scheduled for this day");
            empty.setTextColor(getColor(R.color.text_muted));
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(0, dpToPx(24), 0, 0);
            containerTimetableSlots.addView(empty);
            return;
        }

        for (TimetableSlot slot : slots) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackgroundResource(R.drawable.bg_card);
            card.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lp.bottomMargin = dpToPx(8);
            card.setLayoutParams(lp);

            TextView title = new TextView(this);
            title.setText(slot.getSubject());
            title.setTextSize(15);
            title.setTypeface(null, android.graphics.Typeface.BOLD);
            title.setTextColor(getColor(R.color.text_primary));
            card.addView(title);

            TextView time = new TextView(this);
            time.setText(slot.getTimeRangeFormatted() + (!slot.getRoom().isEmpty() ? " • " + slot.getRoom() : ""));
            time.setTextSize(12);
            time.setTextColor(getColor(R.color.text_secondary));
            card.addView(time);

            containerTimetableSlots.addView(card);
        }
    }

    private void updateRecordingsList() {
        containerRecordingsList.removeAllViews();
        List<RecordingSession> sessions = recordingStore.getAllSessions();

        long totalBytes = 0;
        int totalChunks = 0;
        int syncedCount = 0;

        for (RecordingSession s : sessions) {
            totalBytes += s.getTotalBytes();
            totalChunks += s.getChunkCount();
            if (s.isSynced()) syncedCount++;
        }

        long mb = totalBytes / (1024 * 1024);
        textRecordingsStats.setText(sessions.size() + " sessions • " + mb + " MB (" + syncedCount + " synced)");
        if (textSyncSummary != null) {
            textSyncSummary.setText(syncedCount + "/" + sessions.size() + " sessions backed up to Mac");
        }

        if (sessions.isEmpty()) {
            TextView empty = new TextView(this);
            empty.setText("No audio recordings yet\nTap Record on the center tab to begin.");
            empty.setTextColor(getColor(R.color.text_muted));
            empty.setGravity(Gravity.CENTER);
            empty.setPadding(0, dpToPx(32), 0, 0);
            containerRecordingsList.addView(empty);
            return;
        }

        for (RecordingSession session : sessions) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackgroundResource(R.drawable.bg_card);
            card.setPadding(dpToPx(14), dpToPx(12), dpToPx(14), dpToPx(12));

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
            );
            lp.bottomMargin = dpToPx(8);
            card.setLayoutParams(lp);

            TextView sub = new TextView(this);
            sub.setText(session.getSubject());
            sub.setTextSize(15);
            sub.setTypeface(null, android.graphics.Typeface.BOLD);
            sub.setTextColor(getColor(R.color.text_primary));
            card.addView(sub);

            TextView info = new TextView(this);
            info.setText(session.getChunkCount() + " chunks • " + session.getFormattedSize() + " • " + (session.isSynced() ? "✓ Synced" : "▲ Local Only"));
            info.setTextSize(12);
            info.setTextColor(session.isSynced() ? getColor(R.color.status_connected_text) : getColor(R.color.warning));
            card.addView(info);

            containerRecordingsList.addView(card);
        }
    }

    private void updateSettingsView() {
        if (textSettingsMacName != null) {
            textSettingsMacName.setText(connectionManager.getPairedMacName());
        }
        if (textSettingsServerId != null) {
            String sid = connectionManager.getPairedServerId();
            textSettingsServerId.setText(sid != null ? "Server ID: " + sid : "Not paired with any Mac");
        }

        // Storage metrics
        RecordingStore.StorageInfo storageInfo = recordingStore.getStorageInfo();
        if (textStorageAvailable != null) {
            textStorageAvailable.setText("Free Device Space: " + storageInfo.getFormattedAvailable());
        }
        if (textStorageAppUsage != null) {
            textStorageAppUsage.setText("Lecture Whisper Audio Cache: " + storageInfo.getFormattedAppUsage());
        }
    }

    private void showAddSlotDialog() {
        AlertDialog.Builder b = new AlertDialog.Builder(this);
        b.setTitle("Add Class to Schedule");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dpToPx(20), dpToPx(10), dpToPx(20), dpToPx(10));

        final EditText editSub = new EditText(this);
        editSub.setHint("Subject (e.g. Physics 101)");
        layout.addView(editSub);

        final EditText editStart = new EditText(this);
        editStart.setHint("Start Time (e.g. 10:00)");
        layout.addView(editStart);

        final EditText editEnd = new EditText(this);
        editEnd.setHint("End Time (e.g. 11:30)");
        layout.addView(editEnd);

        final EditText editRoom = new EditText(this);
        editRoom.setHint("Room / Hall (Optional)");
        layout.addView(editRoom);

        b.setView(layout);
        b.setPositiveButton("Add", (d, w) -> {
            String s = editSub.getText().toString().trim();
            String st = editStart.getText().toString().trim();
            String et = editEnd.getText().toString().trim();
            String rm = editRoom.getText().toString().trim();

            if (!s.isEmpty() && !st.isEmpty() && !et.isEmpty()) {
                TimetableSlot slot = new TimetableSlot(
                        "slot_" + System.currentTimeMillis(),
                        selectedDay,
                        st,
                        et,
                        s,
                        rm.isEmpty() ? null : rm,
                        null,
                        "default_group"
                );
                timetableStore.addSlot(slot);
                updateTimetableSlotsList();
                updateActiveSlotBanner();
            }
        });
        b.setNegativeButton("Cancel", null);
        b.show();
    }

    private void pickTimetableImage() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(intent, PICK_IMAGE_REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE_REQUEST_CODE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            handleTimetableImageUpload(data.getData());
        }
    }

    private void handleTimetableImageUpload(Uri imageUri) {
        layoutOcrProgress.setVisibility(View.VISIBLE);
        textOcrProgressStatus.setText("Extracting timetable grid via Mac OCR...");

        new Thread(() -> {
            try {
                InputStream is = getContentResolver().openInputStream(imageUri);
                File tempFile = new File(getCacheDir(), "timetable_upload.png");
                FileOutputStream fos = new FileOutputStream(tempFile);
                byte[] buf = new byte[8192];
                int len;
                while ((len = is.read(buf)) != -1) {
                    fos.write(buf, 0, len);
                }
                fos.close();
                is.close();

                String host = connectionManager.getActiveHost() != null ? connectionManager.getActiveHost() : "127.0.0.1";
                int port = connectionManager.getActivePort();
                List<TimetableSlot> slots = LaptopSyncClient.uploadTimetablePhoto(host, port, tempFile);

                for (TimetableSlot s : slots) {
                    timetableStore.addSlot(s);
                }

                runOnUiThread(() -> {
                    layoutOcrProgress.setVisibility(View.GONE);
                    Toast.makeText(this, "Extracted " + slots.size() + " classes from timetable photo!", Toast.LENGTH_LONG).show();
                    updateTimetableSlotsList();
                    updateActiveSlotBanner();
                });
            } catch (Exception e) {
                runOnUiThread(() -> {
                    layoutOcrProgress.setVisibility(View.GONE);
                    Toast.makeText(this, "OCR Upload Error: " + e.getMessage(), Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void setAppTheme(String theme) {
        prefs.edit().putString(KEY_THEME, theme).apply();
        recreate();
    }

    private void updateThemeButtons(String current) {
        int activeBg = R.drawable.bg_btn_primary;
        int idleBg = R.drawable.bg_input_field;
        int activeText = getColor(R.color.on_primary);
        int idleText = getColor(R.color.text_primary);

        btnThemeSystem.setBackgroundResource("system".equals(current) ? activeBg : idleBg);
        btnThemeSystem.setTextColor("system".equals(current) ? activeText : idleText);

        btnThemeLight.setBackgroundResource("light".equals(current) ? activeBg : idleBg);
        btnThemeLight.setTextColor("light".equals(current) ? activeText : idleText);

        btnThemeDark.setBackgroundResource("dark".equals(current) ? activeBg : idleBg);
        btnThemeDark.setTextColor("dark".equals(current) ? activeText : idleText);
    }

    private boolean hasPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            return checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            String[] perms;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                perms = new String[]{
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.POST_NOTIFICATIONS,
                        Manifest.permission.CAMERA
                };
            } else {
                perms = new String[]{
                        Manifest.permission.RECORD_AUDIO,
                        Manifest.permission.CAMERA
                };
            }
            requestPermissions(perms, PERMISSION_REQUEST_CODE);
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSION_REQUEST_CODE) {
            boolean camGranted = false;
            for (int i = 0; i < permissions.length; i++) {
                if (Manifest.permission.CAMERA.equals(permissions[i]) && grantResults[i] == PackageManager.PERMISSION_GRANTED) {
                    camGranted = true;
                    break;
                }
            }
            if (camGranted && overlayQrScanner != null && overlayQrScanner.getVisibility() == View.VISIBLE) {
                initCameraViewfinder();
            }
        }
    }

    private int dpToPx(int dp) {
        return (int) (dp * getResources().getDisplayMetrics().density);
    }
}
