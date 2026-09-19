package com.lecturewhisper;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.content.res.Configuration;
import android.graphics.Color;
import android.media.MediaPlayer;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowInsets;
import android.widget.Button;
import android.widget.EditText;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;
import android.widget.Toast;

import com.lecturewhisper.model.RecordingSession;
import com.lecturewhisper.model.TimetableSlot;
import com.lecturewhisper.network.LaptopSyncClient;
import com.lecturewhisper.recorder.RecorderService;
import com.lecturewhisper.store.RecordingStore;
import com.lecturewhisper.store.TimetableStore;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.util.Calendar;
import java.util.List;
import java.util.Locale;

public class MainActivity extends Activity {

    private static final String TAG = "LectureWhisperMain";
    private static final int PERMISSION_REQUEST_CODE = 101;
    private static final int PICK_IMAGE_REQUEST_CODE = 102;
    private static final String PREFS_NAME = "lw_prefs";
    private static final String KEY_HOST = "server_host";
    private static final String KEY_PORT = "server_port";
    private static final String KEY_THEME = "app_theme";

    // Stores
    private TimetableStore timetableStore;
    private RecordingStore recordingStore;
    private SharedPreferences prefs;

    // UI — Shell & Drawer
    private View drawerScrim;
    private LinearLayout sidebarDrawer;
    private LinearLayout chipConnectionStatus;
    private View viewConnectionDot;
    private TextView textConnectionBadge;

    // Drawer Views
    private TextView textStorageAvailable;
    private TextView textStorageAppUsage;
    private TextView textStorageSyncedStatus;
    private Button btnDrawerPruneCache;
    private Button btnDrawerBatteryOpt;
    private Button btnThemeSystem;
    private Button btnThemeLight;
    private Button btnThemeDark;

    // Tabs
    private View viewTabRecorder;
    private View viewTabTimetable;
    private View viewTabRecordings;
    private View viewTabConnection;

    private Button navBtnRecorder;
    private Button navBtnTimetable;
    private Button navBtnRecordings;
    private Button navBtnConnection;

    // Tab 1: Recorder Views
    private LinearLayout bannerTimetableSlot;
    private TextView textBannerType;
    private TextView textBannerSubject;
    private TextView textBannerDetails;
    private TextView textRecordingStatus;
    private TextView textRecordingTimer;
    private Button btnHeroRecord;
    private TextView textChunkInfo;
    private EditText editRecordingSubject;
    private TextView textSyncSummary;
    private Button btnSyncNow;

    // Tab 2: Timetable Views
    private Button btnUploadTimetableOcr;
    private Button btnAddSlot;
    private LinearLayout layoutOcrProgress;
    private TextView textOcrProgressStatus;
    private LinearLayout containerTimetableSlots;
    private Button[] dayButtons = new Button[7];
    private int selectedDay = 0;

    // Tab 3: Recordings Views
    private TextView textRecordingsStats;
    private Button btnSyncAllRecordings;
    private LinearLayout containerRecordingsList;

    // Tab 4: Connection Views
    private EditText editServerHost;
    private EditText editServerPort;
    private Button btnPresetUsb;
    private Button btnPresetWifi;
    private Button btnTestConnection;
    private TextView textConnectionDiagnostic;

    // State
    private boolean isRecording = false;
    private long recordingStartTime = 0;
    private boolean isDrawerOpen = false;
    private boolean isConnectedToLaptop = false;
    private final Handler mainHandler = new Handler(Looper.getMainLooper());
    private MediaPlayer previewPlayer;

    private final Runnable timerRunnable = new Runnable() {
        @Override
        public void run() {
            if (isRecording) {
                long elapsed = System.currentTimeMillis() - recordingStartTime;
                int seconds = (int) (elapsed / 1000) % 60;
                int minutes = (int) ((elapsed / (1000 * 60)) % 60);
                int hours = (int) (elapsed / (1000 * 60 * 60));
                textRecordingTimer.setText(String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds));
                mainHandler.postDelayed(this, 1000);
            }
        }
    };

    private final Runnable pingRunnable = new Runnable() {
        @Override
        public void run() {
            probeLaptopConnection(false);
            mainHandler.postDelayed(this, 12000); // Probe every 12 seconds
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
            getWindow().setStatusBarColor(getColor(R.color.surface));
            getWindow().setNavigationBarColor(getColor(R.color.tab_bar_bg));
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            getWindow().setDecorFitsSystemWindows(false);
        }

        setContentView(R.layout.activity_main);

        timetableStore = new TimetableStore(this);
        recordingStore = new RecordingStore(this);

        // Determine initial selected day (today)
        Calendar cal = Calendar.getInstance();
        int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
        selectedDay = (dayOfWeek + 5) % 7; // Mon=0, ..., Sun=6

        bindViews();
        setupWindowInsets();
        setupListeners();
        setupDaySelector();
        updateThemeButtons(savedTheme);
        checkPreviousCrashLog();

        // Restore host settings (default to 127.0.0.1:8420 for zero-config USB reverse tethering)
        String savedHost = prefs.getString(KEY_HOST, "127.0.0.1");
        int savedPort = prefs.getInt(KEY_PORT, 8420);
        editServerHost.setText(savedHost);
        editServerPort.setText(String.valueOf(savedPort));

        updateActiveSlotBanner();
        updateTimetableSlotsList();
        updateRecordingsList();
        updateStorageDrawer();

        requestAppPermissions();
        mainHandler.post(pingRunnable);
    }

    private void setupWindowInsets() {
        View rootLayout = findViewById(R.id.root_layout);
        final View topAppBar = findViewById(R.id.top_app_bar);
        final View bottomNavBar = findViewById(R.id.bottom_nav_bar);
        final View sidebarDrawer = findViewById(R.id.sidebar_drawer);

        updateSystemBarsAppearance();

        if (rootLayout == null) return;

        rootLayout.setOnApplyWindowInsetsListener((v, insets) -> {
            int statusBarTop = 0;
            int navBarBottom = 0;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.graphics.Insets sb = insets.getInsets(
                    WindowInsets.Type.statusBars() | WindowInsets.Type.displayCutout()
                );
                android.graphics.Insets nb = insets.getInsets(
                    WindowInsets.Type.navigationBars()
                );
                statusBarTop = sb.top;
                navBarBottom = nb.bottom;
            } else {
                statusBarTop = insets.getSystemWindowInsetTop();
                navBarBottom = insets.getSystemWindowInsetBottom();
            }

            // Ensure ample padding for mobile status bar and camera punch-hole
            int safeTopPadding = Math.max(statusBarTop, dpToPx(38));
            if (topAppBar != null) {
                topAppBar.setPadding(
                    dpToPx(14),
                    safeTopPadding + dpToPx(6),
                    dpToPx(14),
                    dpToPx(12)
                );
            }

            if (sidebarDrawer != null) {
                sidebarDrawer.setPadding(
                    dpToPx(20),
                    safeTopPadding + dpToPx(16),
                    dpToPx(20),
                    dpToPx(20)
                );
            }

            // Ensure ample padding for mobile gesture navigation handle
            int safeBottomPadding = Math.max(navBarBottom, dpToPx(10));
            if (bottomNavBar != null) {
                bottomNavBar.setPadding(
                    bottomNavBar.getPaddingLeft(),
                    dpToPx(6),
                    bottomNavBar.getPaddingRight(),
                    safeBottomPadding + dpToPx(6)
                );
            }

            return insets;
        });

        rootLayout.requestApplyInsets();
    }

    private void bindViews() {
        drawerScrim = findViewById(R.id.drawer_scrim);
        sidebarDrawer = findViewById(R.id.sidebar_drawer);
        chipConnectionStatus = findViewById(R.id.chip_connection_status);
        viewConnectionDot = findViewById(R.id.view_connection_dot);
        textConnectionBadge = findViewById(R.id.text_connection_badge);

        textStorageAvailable = findViewById(R.id.text_storage_available);
        textStorageAppUsage = findViewById(R.id.text_storage_app_usage);
        textStorageSyncedStatus = findViewById(R.id.text_storage_synced_status);
        btnDrawerPruneCache = findViewById(R.id.btn_drawer_prune_cache);
        btnDrawerBatteryOpt = findViewById(R.id.btn_drawer_battery_opt);
        btnThemeSystem = findViewById(R.id.btn_theme_system);
        btnThemeLight = findViewById(R.id.btn_theme_light);
        btnThemeDark = findViewById(R.id.btn_theme_dark);

        viewTabRecorder = findViewById(R.id.view_tab_recorder);
        viewTabTimetable = findViewById(R.id.view_tab_timetable);
        viewTabRecordings = findViewById(R.id.view_tab_recordings);
        viewTabConnection = findViewById(R.id.view_tab_connection);

        navBtnRecorder = findViewById(R.id.nav_btn_recorder);
        navBtnTimetable = findViewById(R.id.nav_btn_timetable);
        navBtnRecordings = findViewById(R.id.nav_btn_recordings);
        navBtnConnection = findViewById(R.id.nav_btn_connection);

        bannerTimetableSlot = findViewById(R.id.banner_timetable_slot);
        textBannerType = findViewById(R.id.text_banner_type);
        textBannerSubject = findViewById(R.id.text_banner_subject);
        textBannerDetails = findViewById(R.id.text_banner_details);
        textRecordingStatus = findViewById(R.id.text_recording_status);
        textRecordingTimer = findViewById(R.id.text_recording_timer);
        btnHeroRecord = findViewById(R.id.btn_hero_record);
        textChunkInfo = findViewById(R.id.text_chunk_info);
        editRecordingSubject = findViewById(R.id.edit_recording_subject);
        textSyncSummary = findViewById(R.id.text_sync_summary);
        btnSyncNow = findViewById(R.id.btn_sync_now);

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

        textRecordingsStats = findViewById(R.id.text_recordings_stats);
        btnSyncAllRecordings = findViewById(R.id.btn_sync_all_recordings);
        containerRecordingsList = findViewById(R.id.container_recordings_list);

        editServerHost = findViewById(R.id.edit_server_host);
        editServerPort = findViewById(R.id.edit_server_port);
        btnPresetUsb = findViewById(R.id.btn_preset_usb);
        btnPresetWifi = findViewById(R.id.btn_preset_wifi);
        btnTestConnection = findViewById(R.id.btn_test_connection);
        textConnectionDiagnostic = findViewById(R.id.text_connection_diagnostic);
    }

    private void setupListeners() {
        // Drawer toggle
        findViewById(R.id.btn_open_drawer).setOnClickListener(v -> openDrawer());
        findViewById(R.id.btn_close_drawer).setOnClickListener(v -> closeDrawer());
        drawerScrim.setOnClickListener(v -> closeDrawer());

        if (btnThemeSystem != null) btnThemeSystem.setOnClickListener(v -> setAppTheme("system"));
        if (btnThemeLight != null) btnThemeLight.setOnClickListener(v -> setAppTheme("light"));
        if (btnThemeDark != null) btnThemeDark.setOnClickListener(v -> setAppTheme("dark"));

        // Nav tabs
        navBtnRecorder.setOnClickListener(v -> selectTab(0));
        navBtnTimetable.setOnClickListener(v -> selectTab(1));
        navBtnRecordings.setOnClickListener(v -> selectTab(2));
        navBtnConnection.setOnClickListener(v -> selectTab(3));
        chipConnectionStatus.setOnClickListener(v -> selectTab(3));

        // Quick host presets
        if (btnPresetUsb != null) {
            btnPresetUsb.setOnClickListener(v -> {
                editServerHost.setText("127.0.0.1");
                editServerPort.setText("8420");
                saveHostConfig();
                probeLaptopConnection(true);
            });
        }
        if (btnPresetWifi != null) {
            btnPresetWifi.setOnClickListener(v -> {
                editServerHost.setText("172.17.180.61");
                editServerPort.setText("8420");
                saveHostConfig();
                probeLaptopConnection(true);
            });
        }

        // Recorder actions
        btnHeroRecord.setOnClickListener(v -> {
            if (!hasPermissions()) {
                requestAppPermissions();
                return;
            }
            if (!isRecording) {
                startRecordingSession();
            } else {
                stopRecordingSession();
            }
        });

        btnSyncNow.setOnClickListener(v -> syncAllUnsyncedAudio());
        btnSyncAllRecordings.setOnClickListener(v -> syncAllUnsyncedAudio());

        // Timetable actions
        btnUploadTimetableOcr.setOnClickListener(v -> pickTimetableImage());
        btnAddSlot.setOnClickListener(v -> showAddSlotDialog());

        // Connection testing
        btnTestConnection.setOnClickListener(v -> {
            saveHostConfig();
            probeLaptopConnection(true);
        });

        // Drawer cache pruning
        btnDrawerPruneCache.setOnClickListener(v -> {
            int pruned = recordingStore.pruneSyncedChunks();
            Toast.makeText(this, "Cleaned up " + pruned + " synced audio chunks", Toast.LENGTH_SHORT).show();
            updateStorageDrawer();
            updateRecordingsList();
        });

        // Battery optimization intent
        btnDrawerBatteryOpt.setOnClickListener(v -> {
            try {
                Intent intent = new Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
                startActivity(intent);
            } catch (Exception e) {
                Toast.makeText(this, "Please allow unrestricted background battery in System Settings", Toast.LENGTH_LONG).show();
            }
        });
    }

    private void selectTab(int tabIndex) {
        viewTabRecorder.setVisibility(tabIndex == 0 ? View.VISIBLE : View.GONE);
        viewTabTimetable.setVisibility(tabIndex == 1 ? View.VISIBLE : View.GONE);
        viewTabRecordings.setVisibility(tabIndex == 2 ? View.VISIBLE : View.GONE);
        viewTabConnection.setVisibility(tabIndex == 3 ? View.VISIBLE : View.GONE);

        int activeColor = 0xFF818CF8;
        int inactiveColor = 0xFF64748B;
        ColorStateList activeTint = ColorStateList.valueOf(activeColor);
        ColorStateList inactiveTint = ColorStateList.valueOf(inactiveColor);

        navBtnRecorder.setTextColor(tabIndex == 0 ? activeColor : inactiveColor);
        navBtnRecorder.setCompoundDrawableTintList(tabIndex == 0 ? activeTint : inactiveTint);

        navBtnTimetable.setTextColor(tabIndex == 1 ? activeColor : inactiveColor);
        navBtnTimetable.setCompoundDrawableTintList(tabIndex == 1 ? activeTint : inactiveTint);

        navBtnRecordings.setTextColor(tabIndex == 2 ? activeColor : inactiveColor);
        navBtnRecordings.setCompoundDrawableTintList(tabIndex == 2 ? activeTint : inactiveTint);

        navBtnConnection.setTextColor(tabIndex == 3 ? activeColor : inactiveColor);
        navBtnConnection.setCompoundDrawableTintList(tabIndex == 3 ? activeTint : inactiveTint);

        if (tabIndex == 1) updateTimetableSlotsList();
        if (tabIndex == 2) updateRecordingsList();
    }

    private void openDrawer() {
        isDrawerOpen = true;
        updateStorageDrawer();
        drawerScrim.setVisibility(View.VISIBLE);
        drawerScrim.setAlpha(0f);
        drawerScrim.animate().alpha(1f).setDuration(250).start();
        sidebarDrawer.animate().translationX(0).setDuration(250).start();
    }

    private void closeDrawer() {
        isDrawerOpen = false;
        drawerScrim.animate().alpha(0f).setDuration(200).withEndAction(() -> drawerScrim.setVisibility(View.GONE)).start();
        sidebarDrawer.animate().translationX(-sidebarDrawer.getWidth() - 50).setDuration(200).start();
    }

    private void setupDaySelector() {
        for (int i = 0; i < 7; i++) {
            final int dayIndex = i;
            dayButtons[i].setOnClickListener(v -> {
                selectedDay = dayIndex;
                highlightSelectedDayButton();
                updateTimetableSlotsList();
            });
        }
        highlightSelectedDayButton();
    }

    private void highlightSelectedDayButton() {
        for (int i = 0; i < 7; i++) {
            if (i == selectedDay) {
                dayButtons[i].setBackgroundResource(R.drawable.bg_btn_primary);
                dayButtons[i].setTextColor(0xFFF8FAFC);
            } else {
                dayButtons[i].setBackgroundResource(R.drawable.bg_input_field);
                dayButtons[i].setTextColor(0xFF64748B);
            }
        }
    }

    private void updateActiveSlotBanner() {
        TimetableStore.ActiveSlotInfo info = timetableStore.getCurrentOrNextSlot();
        if (info.type == TimetableStore.ActiveSlotInfo.TYPE_CURRENT) {
            bannerTimetableSlot.setBackgroundResource(R.drawable.bg_banner_active_class);
            textBannerType.setText("🟢 CURRENT CLASS IN PROGRESS");
            textBannerType.setTextColor(0xFF34D399);
            textBannerSubject.setText(info.slot.getSubject());
            textBannerDetails.setText(info.slot.getTimeRangeFormatted() + " • " + info.slot.getRoom() + " • " + info.slot.getLecturer());
            if (!isRecording) {
                editRecordingSubject.setText(info.slot.getSubject());
            }
        } else if (info.type == TimetableStore.ActiveSlotInfo.TYPE_UPCOMING) {
            bannerTimetableSlot.setBackgroundResource(R.drawable.bg_banner_upcoming_class);
            textBannerType.setText("🟠 UPCOMING CLASS IN " + info.minutesUntil + " MINS");
            textBannerType.setTextColor(0xFFF59E0B);
            textBannerSubject.setText(info.slot.getSubject());
            textBannerDetails.setText(info.slot.getTimeRangeFormatted() + " • " + info.slot.getRoom() + " • " + info.slot.getLecturer());
            if (!isRecording) {
                editRecordingSubject.setText(info.slot.getSubject());
            }
        } else {
            bannerTimetableSlot.setBackgroundResource(R.drawable.bg_card);
            textBannerType.setText("⚪ NO SCHEDULED CLASS RIGHT NOW");
            textBannerType.setTextColor(0xFF94A3B8);
            textBannerSubject.setText("Free Study / Manual Lecture");
            textBannerDetails.setText("Type custom lecture subject below or select from timetable");
        }
    }

    private void updateTimetableSlotsList() {
        containerTimetableSlots.removeAllViews();
        List<TimetableSlot> slots = timetableStore.getSlotsForDay(selectedDay);

        if (slots.isEmpty()) {
            TextView emptyText = new TextView(this);
            emptyText.setText("No classes scheduled for this day.\nTap 'Upload Photo' to scan your schedule or '+ Add Class'.");
            emptyText.setTextColor(0xFF64748B);
            emptyText.setTextSize(13);
            emptyText.setPadding(16, 32, 16, 32);
            emptyText.setGravity(Gravity.CENTER);
            containerTimetableSlots.addView(emptyText);
            return;
        }

        for (TimetableSlot s : slots) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackgroundResource(R.drawable.bg_card);
            card.setPadding(24, 24, 24, 24);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 20);
            card.setLayoutParams(lp);

            TextView timeTv = new TextView(this);
            timeTv.setText(s.getTimeRangeFormatted());
            timeTv.setTextColor(0xFF06B6D4);
            timeTv.setTextSize(12);
            timeTv.setTypeface(null, android.graphics.Typeface.BOLD);
            card.addView(timeTv);

            TextView subjTv = new TextView(this);
            subjTv.setText(s.getSubject());
            subjTv.setTextColor(0xFFF8FAFC);
            subjTv.setTextSize(16);
            subjTv.setTypeface(null, android.graphics.Typeface.BOLD);
            subjTv.setPadding(0, 4, 0, 4);
            card.addView(subjTv);

            if (!s.getRoom().isEmpty() || !s.getLecturer().isEmpty()) {
                TextView detTv = new TextView(this);
                String det = (s.getRoom().isEmpty() ? "" : s.getRoom() + " ") +
                             (s.getLecturer().isEmpty() ? "" : "• " + s.getLecturer());
                detTv.setText(det);
                detTv.setTextColor(0xFF94A3B8);
                detTv.setTextSize(12);
                card.addView(detTv);
            }

            LinearLayout actions = new LinearLayout(this);
            actions.setOrientation(LinearLayout.HORIZONTAL);
            actions.setPadding(0, 16, 0, 0);

            Button recBtn = new Button(this);
            recBtn.setText("🎙️ Record Now");
            recBtn.setTextColor(0xFFF8FAFC);
            recBtn.setTextSize(11);
            recBtn.setBackgroundResource(R.drawable.bg_btn_primary);
            recBtn.setPadding(24, 0, 24, 0);
            recBtn.setLayoutParams(new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(36)));
            recBtn.setOnClickListener(v -> {
                editRecordingSubject.setText(s.getSubject());
                selectTab(0);
                if (!isRecording) startRecordingSession();
            });
            actions.addView(recBtn);

            Button delBtn = new Button(this);
            delBtn.setText("Delete");
            delBtn.setTextColor(0xFFF43F5E);
            delBtn.setTextSize(11);
            delBtn.setBackgroundResource(R.drawable.bg_input_field);
            LinearLayout.LayoutParams delLp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(36));
            delLp.setMarginStart(dpToPx(8));
            delBtn.setLayoutParams(delLp);
            delBtn.setOnClickListener(v -> {
                timetableStore.deleteSlot(s.getId());
                updateTimetableSlotsList();
                updateActiveSlotBanner();
                syncTimetableWithLaptop();
            });
            actions.addView(delBtn);

            card.addView(actions);
            containerTimetableSlots.addView(card);
        }
    }

    private void updateRecordingsList() {
        containerRecordingsList.removeAllViews();
        List<RecordingSession> sessions = recordingStore.getAllSessions();
        RecordingStore.StorageInfo storage = recordingStore.getStorageInfo();

        textRecordingsStats.setText(String.format(Locale.US, "%d sessions recorded • %s audio cached",
                sessions.size(), storage.getFormattedAppUsage()));

        if (sessions.isEmpty()) {
            TextView emptyText = new TextView(this);
            emptyText.setText("No recorded lectures on device yet.\nTap the Record tab to start capturing lectures.");
            emptyText.setTextColor(0xFF64748B);
            emptyText.setTextSize(13);
            emptyText.setPadding(16, 32, 16, 32);
            emptyText.setGravity(Gravity.CENTER);
            containerRecordingsList.addView(emptyText);
            return;
        }

        for (RecordingSession session : sessions) {
            LinearLayout card = new LinearLayout(this);
            card.setOrientation(LinearLayout.VERTICAL);
            card.setBackgroundResource(R.drawable.bg_card);
            card.setPadding(24, 24, 24, 24);

            LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT);
            lp.setMargins(0, 0, 0, 20);
            card.setLayoutParams(lp);

            LinearLayout header = new LinearLayout(this);
            header.setOrientation(LinearLayout.HORIZONTAL);
            header.setGravity(Gravity.CENTER_VERTICAL);

            TextView subjTv = new TextView(this);
            subjTv.setText(session.getSubject());
            subjTv.setTextColor(0xFFF8FAFC);
            subjTv.setTextSize(15);
            subjTv.setTypeface(null, android.graphics.Typeface.BOLD);
            subjTv.setLayoutParams(new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1));
            header.addView(subjTv);

            TextView badge = new TextView(this);
            if (session.isSynced()) {
                badge.setText("✓ Synced");
                badge.setBackgroundResource(R.drawable.bg_pill_connected);
                badge.setTextColor(0xFF34D399);
            } else {
                badge.setText("▲ Local Only");
                badge.setBackgroundResource(R.drawable.bg_pill_disconnected);
                badge.setTextColor(0xFFFBBF24);
            }
            badge.setTextSize(10);
            badge.setTypeface(null, android.graphics.Typeface.BOLD);
            badge.setPadding(dpToPx(8), dpToPx(3), dpToPx(8), dpToPx(3));
            header.addView(badge);
            card.addView(header);

            TextView dateTv = new TextView(this);
            dateTv.setText(session.getFormattedDate() + " • " + session.getChunkCount() + " Chunks (" + session.getFormattedSize() + ")");
            dateTv.setTextColor(0xFF94A3B8);
            dateTv.setTextSize(12);
            dateTv.setPadding(0, 6, 0, 10);
            card.addView(dateTv);

            LinearLayout actionRow = new LinearLayout(this);
            actionRow.setOrientation(LinearLayout.HORIZONTAL);

            Button syncBtn = new Button(this);
            syncBtn.setText(session.isSynced() ? "Re-sync" : "Sync to MacBook");
            syncBtn.setTextColor(0xFFF8FAFC);
            syncBtn.setTextSize(11);
            syncBtn.setBackgroundResource(R.drawable.bg_btn_primary);
            syncBtn.setLayoutParams(new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(36)));
            syncBtn.setOnClickListener(v -> syncSessionAudio(session));
            actionRow.addView(syncBtn);

            Button playBtn = new Button(this);
            playBtn.setText("▶ Play Preview");
            playBtn.setTextColor(0xFFF8FAFC);
            playBtn.setTextSize(11);
            playBtn.setBackgroundResource(R.drawable.bg_input_field);
            LinearLayout.LayoutParams playLp = new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, dpToPx(36));
            playLp.setMarginStart(dpToPx(8));
            playBtn.setLayoutParams(playLp);
            playBtn.setOnClickListener(v -> playSessionPreview(session));
            actionRow.addView(playBtn);

            card.addView(actionRow);
            containerRecordingsList.addView(card);
        }
    }

    private void updateStorageDrawer() {
        RecordingStore.StorageInfo storage = recordingStore.getStorageInfo();
        textStorageAvailable.setText("Device Free Space: " + storage.getFormattedAvailable() + " / " + storage.getFormattedTotal());
        textStorageAppUsage.setText("Lecture Whisper Audio Cache: " + storage.getFormattedAppUsage());
        textStorageSyncedStatus.setText("Synced to MacBook: " + storage.syncedCount + " • Local Pending: " + storage.unsyncedCount);
    }

    private void startRecordingSession() {
        String subject = editRecordingSubject.getText().toString().trim();
        if (subject.isEmpty()) subject = "Lecture Session";

        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_START);
        intent.putExtra(RecorderService.EXTRA_SUBJECT, subject);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }

        isRecording = true;
        recordingStartTime = System.currentTimeMillis();
        mainHandler.post(timerRunnable);

        textRecordingStatus.setText("Recording in progress (16 kHz Mono AAC Beamforming)");
        btnHeroRecord.setText("STOP");
        btnHeroRecord.setBackgroundResource(R.drawable.bg_hero_record_active);
        textChunkInfo.setText("Rotating chunks every 10 mins • Auto-upload active");
        Toast.makeText(this, "Lecture recording started: " + subject, Toast.LENGTH_SHORT).show();
    }

    private void stopRecordingSession() {
        Intent intent = new Intent(this, RecorderService.class);
        intent.setAction(RecorderService.ACTION_STOP);
        startService(intent);

        isRecording = false;
        mainHandler.removeCallbacks(timerRunnable);

        textRecordingStatus.setText(R.string.status_ready);
        textRecordingTimer.setText("00:00:00");
        btnHeroRecord.setText("REC");
        btnHeroRecord.setBackgroundResource(R.drawable.bg_hero_record_idle);
        textChunkInfo.setText("10-Minute Rotating AAC Chunks • tus v1.0.0 auto-sync");

        Toast.makeText(this, "Recording stopped. Saved to local storage.", Toast.LENGTH_SHORT).show();

        updateRecordingsList();
        updateStorageDrawer();

        if (isConnectedToLaptop) {
            syncAllUnsyncedAudio();
        }
    }

    private void probeLaptopConnection(boolean userInitiated) {
        String host = editServerHost.getText().toString().trim();
        int port;
        try {
            port = Integer.parseInt(editServerPort.getText().toString().trim());
        } catch (Exception e) {
            port = 8420;
        }

        final int finalPort = port;
        final String finalHost = host;

        new Thread(() -> {
            LaptopSyncClient.PingResult res = LaptopSyncClient.ping(finalHost, finalPort);
            mainHandler.post(() -> {
                isConnectedToLaptop = res.ok;
                if (res.ok) {
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_connected);
                    viewConnectionDot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFF34D399));
                    textConnectionBadge.setText("Connected (" + res.latencyMs + "ms)");
                    textConnectionBadge.setTextColor(0xFF34D399);
                    textConnectionDiagnostic.setText("Status: " + res.message);
                    textConnectionDiagnostic.setTextColor(0xFF34D399);

                    // Auto-sync timetable if previously unsynced
                    syncTimetableWithLaptop();
                } else {
                    chipConnectionStatus.setBackgroundResource(R.drawable.bg_pill_disconnected);
                    viewConnectionDot.setBackgroundTintList(android.content.res.ColorStateList.valueOf(0xFFFBBF24));
                    textConnectionBadge.setText("Offline (Tap)");
                    textConnectionBadge.setTextColor(0xFFFBBF24);
                    textConnectionDiagnostic.setText("Status: Unreachable. " + res.message);
                    textConnectionDiagnostic.setTextColor(0xFFFBBF24);
                }

                if (userInitiated) {
                    Toast.makeText(MainActivity.this, res.message, Toast.LENGTH_SHORT).show();
                }
            });
        }).start();
    }

    private void saveHostConfig() {
        String host = editServerHost.getText().toString().trim();
        int port = 8420;
        try {
            port = Integer.parseInt(editServerPort.getText().toString().trim());
        } catch (Exception ignored) {}

        prefs.edit().putString(KEY_HOST, host).putInt(KEY_PORT, port).apply();
    }

    private void pickTimetableImage() {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType("image/*");
        startActivityForResult(Intent.createChooser(intent, "Select Timetable Schedule Photo"), PICK_IMAGE_REQUEST_CODE);
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == PICK_IMAGE_REQUEST_CODE && resultCode == RESULT_OK && data != null && data.getData() != null) {
            handleTimetablePhotoUpload(data.getData());
        }
    }

    private void handleTimetablePhotoUpload(Uri imageUri) {
        layoutOcrProgress.setVisibility(View.VISIBLE);
        textOcrProgressStatus.setText("Extracting timetable schedule photo via host OCR...");

        String host = editServerHost.getText().toString().trim();
        int port = 8420;
        try { port = Integer.parseInt(editServerPort.getText().toString().trim()); } catch (Exception ignored) {}
        final String finalHost = host;
        final int finalPort = port;

        new Thread(() -> {
            try {
                // Copy URI stream to temp file
                File tempFile = new File(getCacheDir(), "uploaded_timetable_" + System.currentTimeMillis() + ".png");
                try (InputStream is = getContentResolver().openInputStream(imageUri);
                     FileOutputStream fos = new FileOutputStream(tempFile)) {
                    byte[] buffer = new byte[8192];
                    int len;
                    while ((len = is.read(buffer)) != -1) {
                        fos.write(buffer, 0, len);
                    }
                }

                List<TimetableSlot> extracted = LaptopSyncClient.uploadTimetablePhoto(finalHost, finalPort, tempFile);
                mainHandler.post(() -> {
                    layoutOcrProgress.setVisibility(View.GONE);
                    if (extracted != null && !extracted.isEmpty()) {
                        timetableStore.setSlots(extracted);
                        updateTimetableSlotsList();
                        updateActiveSlotBanner();
                        Toast.makeText(MainActivity.this, "Successfully extracted " + extracted.size() + " classes!", Toast.LENGTH_LONG).show();
                    } else {
                        Toast.makeText(MainActivity.this, "No classes detected in photo. Check lighting or add manually.", Toast.LENGTH_LONG).show();
                    }
                });
            } catch (Exception e) {
                mainHandler.post(() -> {
                    layoutOcrProgress.setVisibility(View.GONE);
                    Toast.makeText(MainActivity.this, "OCR Upload Failed: Ensure MacBook server is running (" + e.getMessage() + ")", Toast.LENGTH_LONG).show();
                });
            }
        }).start();
    }

    private void showAddSlotDialog() {
        AlertDialog.Builder builder = new AlertDialog.Builder(this);
        builder.setTitle("Add Class to Timetable");

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(dpToPx(20), dpToPx(12), dpToPx(20), dpToPx(8));

        final EditText subjEt = createStyledDialogEditText("Subject (e.g. CS 101: Data Structures)", "");
        layout.addView(subjEt);

        final EditText startEt = createStyledDialogEditText("Start Time (HH:MM, e.g. 09:00)", "09:00");
        layout.addView(startEt);

        final EditText endEt = createStyledDialogEditText("End Time (HH:MM, e.g. 10:30)", "10:30");
        layout.addView(endEt);

        final EditText roomEt = createStyledDialogEditText("Room / Hall (optional)", "");
        layout.addView(roomEt);

        final EditText profEt = createStyledDialogEditText("Lecturer (optional)", "");
        layout.addView(profEt);

        builder.setView(layout);
        builder.setPositiveButton("Add", (dialog, which) -> {
            String subject = subjEt.getText().toString().trim();
            String start = startEt.getText().toString().trim();
            String end = endEt.getText().toString().trim();
            String room = roomEt.getText().toString().trim();
            String prof = profEt.getText().toString().trim();

            if (!subject.isEmpty()) {
                TimetableSlot newSlot = new TimetableSlot(null, selectedDay, start, end, subject, room, prof, "default");
                timetableStore.addSlot(newSlot);
                updateTimetableSlotsList();
                updateActiveSlotBanner();
                syncTimetableWithLaptop();
                Toast.makeText(this, "Class added to schedule", Toast.LENGTH_SHORT).show();
            }
        });
        builder.setNegativeButton("Cancel", null);
        builder.show();
    }

    private EditText createStyledDialogEditText(String hint, String defaultText) {
        EditText et = new EditText(this);
        et.setHint(hint);
        if (!defaultText.isEmpty()) et.setText(defaultText);
        et.setTextColor(0xFFF8FAFC);
        et.setHintTextColor(0xFF64748B);
        et.setTextSize(13);
        et.setBackgroundResource(R.drawable.bg_input_field);
        et.setPadding(dpToPx(12), dpToPx(10), dpToPx(12), dpToPx(10));
        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT
        );
        lp.setMargins(0, dpToPx(4), 0, dpToPx(6));
        et.setLayoutParams(lp);
        return et;
    }

    private void syncTimetableWithLaptop() {
        String host = editServerHost.getText().toString().trim();
        int port = 8420;
        try { port = Integer.parseInt(editServerPort.getText().toString().trim()); } catch (Exception ignored) {}
        final String finalHost = host;
        final int finalPort = port;

        List<TimetableSlot> slots = timetableStore.getSlots();
        new Thread(() -> {
            try {
                LaptopSyncClient.syncTimetable(finalHost, finalPort, slots);
            } catch (Exception ignored) {}
        }).start();
    }

    private void syncAllUnsyncedAudio() {
        List<RecordingSession> sessions = recordingStore.getAllSessions();
        int pending = 0;
        for (RecordingSession s : sessions) {
            if (!s.isSynced()) {
                pending++;
                syncSessionAudio(s);
            }
        }
        if (pending == 0) {
            Toast.makeText(this, "All audio sessions are already synced!", Toast.LENGTH_SHORT).show();
        } else {
            Toast.makeText(this, "Syncing " + pending + " sessions to MacBook Pro...", Toast.LENGTH_SHORT).show();
        }
    }

    private void syncSessionAudio(RecordingSession session) {
        String host = editServerHost.getText().toString().trim();
        int port = 8420;
        try { port = Integer.parseInt(editServerPort.getText().toString().trim()); } catch (Exception ignored) {}
        final String finalHost = host;
        final int finalPort = port;

        new Thread(() -> {
            File dir = new File(session.getDirectoryPath());
            File[] audioFiles = dir.listFiles((d, name) -> name.endsWith(".m4a") || name.endsWith(".wav"));
            if (audioFiles == null || audioFiles.length == 0) return;

            boolean allChunksSuccess = true;
            for (int i = 0; i < audioFiles.length; i++) {
                File chunk = audioFiles[i];
                try {
                    boolean ok = LaptopSyncClient.uploadAudioChunk(
                            finalHost, finalPort, chunk, session.getSubject(),
                            session.getTimetableSlotId(), "pixel-8a", i
                    );
                    if (!ok) allChunksSuccess = false;
                } catch (Exception e) {
                    allChunksSuccess = false;
                    Log.e(TAG, "Failed uploading chunk: " + chunk.getName(), e);
                }
            }

            if (allChunksSuccess) {
                session.setSynced(true);
                session.saveMetadata();
                mainHandler.post(() -> {
                    Toast.makeText(MainActivity.this, "✓ Synced: " + session.getSubject(), Toast.LENGTH_SHORT).show();
                    updateRecordingsList();
                    updateStorageDrawer();
                });
            }
        }).start();
    }

    private void playSessionPreview(RecordingSession session) {
        if (previewPlayer != null) {
            previewPlayer.release();
            previewPlayer = null;
        }

        File dir = new File(session.getDirectoryPath());
        File[] audioFiles = dir.listFiles((d, name) -> name.endsWith(".m4a") || name.endsWith(".wav"));
        if (audioFiles == null || audioFiles.length == 0) {
            Toast.makeText(this, "Audio file has been pruned to save storage", Toast.LENGTH_SHORT).show();
            return;
        }

        try {
            previewPlayer = new MediaPlayer();
            previewPlayer.setDataSource(audioFiles[0].getAbsolutePath());
            previewPlayer.prepare();
            previewPlayer.start();
            Toast.makeText(this, "Playing preview: " + audioFiles[0].getName(), Toast.LENGTH_SHORT).show();
        } catch (Exception e) {
            Toast.makeText(this, "Playback error: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }

    private boolean hasPermissions() {
        boolean mic = checkSelfPermission(Manifest.permission.RECORD_AUDIO) == PackageManager.PERMISSION_GRANTED;
        boolean postNotif = true;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            postNotif = checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED;
        }
        return mic && postNotif;
    }

    private void requestAppPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            requestPermissions(new String[]{
                    Manifest.permission.RECORD_AUDIO,
                    Manifest.permission.POST_NOTIFICATIONS
            }, PERMISSION_REQUEST_CODE);
        } else {
            requestPermissions(new String[]{
                    Manifest.permission.RECORD_AUDIO
            }, PERMISSION_REQUEST_CODE);
        }
    }

    private int dpToPx(int dp) {
        float density = getResources().getDisplayMetrics().density;
        return Math.round(dp * density);
    }

    private void updateSystemBarsAppearance() {
        try {
            int nightMode = getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK;
            boolean isNight = (nightMode == Configuration.UI_MODE_NIGHT_YES);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                android.view.WindowInsetsController controller = getWindow().getInsetsController();
                if (controller != null) {
                    int flags = android.view.WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS |
                                android.view.WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                    controller.setSystemBarsAppearance(isNight ? 0 : flags, flags);
                }
            } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                View decor = getWindow().getDecorView();
                int flags = decor.getSystemUiVisibility();
                if (isNight) {
                    flags &= ~View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                } else {
                    flags |= View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR;
                }
                decor.setSystemUiVisibility(flags);
            }
        } catch (Throwable t) {
            Log.w(TAG, "Failed to update system bars appearance", t);
        }
    }

    private void checkPreviousCrashLog() {
        try {
            File crashFile = new File(getFilesDir(), "last_crash.txt");
            if (crashFile.exists()) {
                byte[] bytes = java.nio.file.Files.readAllBytes(crashFile.toPath());
                String details = new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
                crashFile.delete();
                new AlertDialog.Builder(this)
                        .setTitle("Previous Crash Diagnostic")
                        .setMessage(details.length() > 800 ? details.substring(0, 800) + "\n..." : details)
                        .setPositiveButton("OK", null)
                        .show();
            }
        } catch (Throwable ignored) {}
    }

    private void setAppTheme(String mode) {
        prefs.edit().putString(KEY_THEME, mode).apply();
        updateThemeButtons(mode);
        recreate();
    }

    private void updateThemeButtons(String mode) {
        if (btnThemeSystem == null || btnThemeLight == null || btnThemeDark == null) return;
        boolean isSystem = "system".equalsIgnoreCase(mode);
        boolean isLight = "light".equalsIgnoreCase(mode);
        boolean isDark = "dark".equalsIgnoreCase(mode);

        btnThemeSystem.setBackgroundResource(isSystem ? R.drawable.bg_btn_primary : R.drawable.bg_input_field);
        btnThemeSystem.setTextColor(getColor(isSystem ? R.color.tab_text_active : R.color.text_primary));

        btnThemeLight.setBackgroundResource(isLight ? R.drawable.bg_btn_primary : R.drawable.bg_input_field);
        btnThemeLight.setTextColor(getColor(isLight ? R.color.tab_text_active : R.color.text_primary));

        btnThemeDark.setBackgroundResource(isDark ? R.drawable.bg_btn_primary : R.drawable.bg_input_field);
        btnThemeDark.setTextColor(getColor(isDark ? R.color.tab_text_active : R.color.text_primary));
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        mainHandler.removeCallbacks(timerRunnable);
        mainHandler.removeCallbacks(pingRunnable);
        if (previewPlayer != null) {
            previewPlayer.release();
            previewPlayer = null;
        }
    }
}
