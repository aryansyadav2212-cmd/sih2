< !DOCTYPE html >

    <html class="light" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>Project Intelligence - PAIMANA AI</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                "colors": {
                "primary-fixed-dim": "#c6c6cc",
            "surface-container-highest": "#e1e3e4",
            "surface-dim": "#d9dadb",
            "tertiary": "#000000",
            "on-error-container": "#93000a",
            "on-primary-container": "#838389",
            "surface-variant": "#e1e3e4",
            "primary-container": "#1a1c20",
            "inverse-primary": "#c6c6cc",
            "surface-container-lowest": "#ffffff",
            "on-primary-fixed-variant": "#45474b",
            "on-primary": "#ffffff",
            "inverse-on-surface": "#f0f1f2",
            "error-container": "#ffdad6",
            "surface": "#f8f9fa",
            "on-tertiary-fixed-variant": "#41474e",
            "inverse-surface": "#2e3132",
            "on-secondary": "#ffffff",
            "outline-variant": "#c6c6cb",
            "error": "#ba1a1a",
            "on-surface": "#191c1d",
            "tertiary-fixed": "#dde3eb",
            "tertiary-container": "#161c22",
            "secondary-fixed-dim": "#bcc7dd",
            "on-secondary-fixed-variant": "#3c475a",
            "tertiary-fixed-dim": "#c1c7cf",
            "primary-fixed": "#e2e2e8",
            "surface-tint": "#5d5e63",
            "secondary-fixed": "#d8e3fa",
            "on-surface-variant": "#45474b",
            "surface-container-low": "#f3f4f5",
            "surface-container": "#edeeef",
            "on-primary-fixed": "#1a1c20",
            "on-secondary-fixed": "#111c2c",
            "background": "#f8f9fa",
            "outline": "#76777b",
            "on-error": "#ffffff",
            "on-secondary-container": "#586377",
            "surface-container-high": "#e7e8e9",
            "surface-bright": "#f8f9fa",
            "on-tertiary-container": "#7e848c",
            "secondary": "#545f72",
            "secondary-container": "#d5e0f7",
            "on-tertiary": "#ffffff",
            "primary": "#000000",
            "on-background": "#191c1d",
            "on-tertiary-fixed": "#161c22"
                    },
            "borderRadius": {
                "DEFAULT": "0rem",
            "lg": "0rem",
            "xl": "0rem",
            "full": "0px"
                    },
            "spacing": {
                "margin-desktop": "64px",
            "gutter": "32px",
            "section-gap": "96px",
            "unit": "4px",
            "margin-mobile": "20px",
            "container-max": "1440px"
                    },
            "fontFamily": {
                "headline-md": ["Hanken Grotesk"],
            "display-lg": ["Hanken Grotesk"],
            "label-caps": ["JetBrains Mono"],
            "headline-lg": ["Hanken Grotesk"],
            "body-md": ["Hanken Grotesk"],
            "headline-lg-mobile": ["Hanken Grotesk"],
            "body-lg": ["Hanken Grotesk"],
            "metadata": ["JetBrains Mono"]
                    },
            "fontSize": {
                "headline-md": ["32px", {"lineHeight": "1.2", "fontWeight": "600" }],
            "display-lg": ["72px", {"lineHeight": "1.1", "letterSpacing": "-0.04em", "fontWeight": "700" }],
            "label-caps": ["12px", {"lineHeight": "16px", "letterSpacing": "0.15em", "fontWeight": "500" }],
            "headline-lg": ["48px", {"lineHeight": "1.2", "letterSpacing": "-0.02em", "fontWeight": "600" }],
            "body-md": ["16px", {"lineHeight": "1.5", "fontWeight": "400" }],
            "headline-lg-mobile": ["32px", {"lineHeight": "1.2", "fontWeight": "600" }],
            "body-lg": ["18px", {"lineHeight": "1.6", "fontWeight": "400" }],
            "metadata": ["11px", {"lineHeight": "14px", "fontWeight": "400" }]
                    }
                },
            }
        }
        </script>
        <style>
            .material-symbols-outlined {
                font - variation - settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
        }
        </style>
    </head>
        <body class="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col">
            <!-- TopNavBar Component -->
            <nav class="fixed top-0 w-full z-50 bg-surface/90 dark:bg-primary/90 border-b border-outline-variant/30 transition-all duration-300 ease-in-out backdrop-blur-md">
                <div class="flex justify-between items-center px-margin-desktop py-4 w-full">
                    <div class="font-display-lg text-body-md font-bold uppercase tracking-widest text-primary dark:text-on-primary">
                        PAIMANA AI
                    </div>
                    <div class="hidden md:flex gap-8 font-headline-md text-body-md tracking-tight">
                        <a class="text-primary dark:text-on-primary border-b border-primary dark:border-on-primary pb-1" href="#">Platform</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary transition-colors" href="#">Intelligence</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary transition-colors" href="#">National Overview</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary transition-colors" href="#">Signals</a>
                    </div>
                    <div class="flex items-center gap-6">
                        <button class="font-label-caps text-label-caps uppercase tracking-widest text-primary hover:bg-surface-container-high/50 dark:hover:bg-primary-container/50 px-4 py-2 border border-primary transition-colors duration-300">
                            Deploy Intelligence
                        </button>
                        <button class="text-primary dark:text-on-primary hover:bg-surface-container-high/50 dark:hover:bg-primary-container/50 p-2 transition-colors duration-300">
                            <span class="material-symbols-outlined" data-icon="menu">menu</span>
                        </button>
                    </div>
                </div>
            </nav>
            <!-- Main Content Canvas -->
            <main class="flex-grow pt-[100px] px-margin-mobile md:px-margin-desktop max-w-container-max mx-auto w-full pb-section-gap">
                <!-- PROJECT HEADER -->
                <section class="mt-section-gap mb-section-gap">
                    <h1 class="font-display-lg text-display-lg text-primary uppercase break-words mb-16">
                        INTEGRATED FREIGHT CORRIDOR PHASE II
                    </h1>
                    <div class="border-t border-outline-variant/30 pt-8">
                        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-gutter gap-y-8">
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Project ID</span>
                                <span class="font-metadata text-metadata text-primary uppercase tracking-widest border border-outline-variant/30 px-3 py-1.5 self-start">PRJ-RLW-0942</span>
                            </div>
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Ministry / Department</span>
                                <span class="font-body-md text-[18px] text-primary">Ministry of Railways</span>
                            </div>
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Sector</span>
                                <span class="font-body-md text-[18px] text-primary">Transport &amp; Logistics</span>
                            </div>
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Location</span>
                                <span class="font-body-md text-[18px] text-primary">Multiple States</span>
                            </div>
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Status</span>
                                <span class="font-body-md text-[18px] text-primary">Under Implementation</span>
                            </div>
                            <!-- Metadata Item -->
                            <div class="flex flex-col gap-3">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Last Updated</span>
                                <span class="font-body-md text-[18px] text-primary">April 2026</span>
                            </div>
                        </div>
                    </div>
                    <div class="border-t border-outline-variant/30 mt-8"></div>
                </section>
                <!-- PROJECT CONDITION -->
                <section class="mb-section-gap">
                    <h2 class="font-headline-md text-headline-md text-primary mb-8 border-b border-outline-variant/30 pb-4">PROJECT CONDITION</h2>
                    <div class="flex flex-col lg:flex-row gap-16 items-start lg:items-center">
                        <!-- Score Block -->
                        <div class="w-full lg:w-1/3 border border-outline-variant/30 p-10 flex flex-col gap-8 bg-surface-container-lowest">
                            <div class="flex justify-between items-center">
                                <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">AI RISK SCORE</span>
                                <span class="font-label-caps text-[13px] tracking-widest text-error bg-error-container px-4 py-2 font-bold uppercase">HIGH RISK</span>
                            </div>
                            <div class="font-display-lg text-[96px] leading-none text-primary flex items-baseline gap-2">
                                78 <span class="font-headline-md text-headline-md text-on-surface-variant">/ 100</span>
                            </div>
                            <div class="w-full h-2 bg-surface-container-high relative">
                                <div class="absolute top-0 left-0 h-full bg-error" style="width: 78%;"></div>
                            </div>
                        </div>
                        <!-- Assessment Text -->
                        <div class="w-full lg:w-2/3">
                            <p class="font-body-lg text-[24px] text-on-surface leading-relaxed max-w-4xl">
                                Project is currently showing a significant probability of schedule and execution risk based on progress deviation, milestone slippage and financial-physical imbalance.
                            </p>
                        </div>
                    </div>
                </section>
                <!-- KEY PROJECT SIGNALS -->
                <section class="mb-section-gap">
                    <h2 class="font-headline-md text-headline-md text-primary mb-8 border-b border-outline-variant/30 pb-4">KEY PROJECT SIGNALS</h2>
                    <div class="border border-outline-variant/30 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant/30 bg-surface-container-lowest">
                        <!-- Signal Item -->
                        <div class="p-10 flex flex-col gap-6">
                            <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Schedule</span>
                            <span class="font-display-lg text-display-lg text-error leading-none">18.4%</span>
                            <span class="font-metadata text-metadata text-on-surface-variant uppercase tracking-widest">Behind Expected</span>
                        </div>
                        <!-- Signal Item -->
                        <div class="p-10 flex flex-col gap-6">
                            <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Physical Progress</span>
                            <span class="font-display-lg text-display-lg text-primary leading-none">42.5%</span>
                            <span class="font-metadata text-metadata text-on-surface-variant uppercase tracking-widest">Current Status</span>
                        </div>
                        <!-- Signal Item -->
                        <div class="p-10 flex flex-col gap-6">
                            <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Financial Progress</span>
                            <span class="font-display-lg text-display-lg text-primary leading-none">68.1%</span>
                            <span class="font-metadata text-metadata text-on-surface-variant uppercase tracking-widest">Current Status</span>
                        </div>
                        <!-- Signal Item -->
                        <div class="p-10 flex flex-col gap-6">
                            <span class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Expected Completion</span>
                            <span class="font-display-lg text-[64px] font-bold text-primary leading-none uppercase tracking-tighter">DEC 2027</span>
                            <span class="font-metadata text-metadata text-on-surface-variant uppercase tracking-widest">Revised Timeline</span>
                        </div>
                    </div>
                </section>
                <!-- PROJECT PROGRESS INTELLIGENCE -->
                <section class="mb-section-gap">
                    <div class="mb-8 border-b border-outline-variant/30 pb-4">
                        <h2 class="font-headline-md text-headline-md text-primary uppercase">PROJECT PROGRESS INTELLIGENCE</h2>
                        <p class="font-metadata text-metadata text-on-surface-variant uppercase mt-2 tracking-widest">Planned execution compared with reported project progress.</p>
                    </div>
                    <!-- Chart Visualization Placeholder -->
                    <div class="w-full h-[500px] border border-outline-variant/30 relative mb-8 flex items-center justify-center bg-surface-container-lowest">
                        <div class="absolute inset-0 p-8 flex flex-col justify-between">
                            <div class="flex-grow border-l border-b border-outline-variant/30 relative">
                                <!-- Grid Lines -->
                                <div class="absolute w-full h-px bg-outline-variant/20 top-[20%]"></div>
                                <div class="absolute w-full h-px bg-outline-variant/20 top-[40%]"></div>
                                <div class="absolute w-full h-px bg-outline-variant/20 top-[60%]"></div>
                                <div class="absolute w-full h-px bg-outline-variant/20 top-[80%]"></div>
                                <!-- Planned Line (Muted Blue-Gray) -->
                                <svg class="absolute inset-0 w-full h-full" preserveaspectratio="none">
                                    <path d="M 0 380 L 1440 40" fill="none" stroke="#545f72" stroke-dasharray="6 6" stroke-width="2"></path>
                                    <!-- Actual Physical (Red Divergence) -->
                                    <path d="M 0 380 L 500 280 L 900 250" fill="none" stroke="#ba1a1a" stroke-width="3"></path>
                                    <!-- Financial (Red Divergence) -->
                                    <path d="M 0 380 L 500 240 L 900 150" fill="none" opacity="0.5" stroke="#ba1a1a" stroke-width="3"></path>
                                </svg>
                            </div>
                            <div class="flex justify-between mt-6 font-metadata text-metadata text-on-surface-variant tracking-widest uppercase">
                                <span>JAN 2024</span>
                                <span>APR 2026</span>
                                <span>DEC 2027</span>
                            </div>
                        </div>
                        <div class="absolute top-6 right-8 flex gap-8 font-label-caps text-label-caps uppercase tracking-widest bg-surface-container-lowest px-4 py-2 border border-outline-variant/30">
                            <div class="flex items-center gap-3"><div class="w-4 h-px bg-secondary border border-secondary border-dashed"></div> Planned</div>
                            <div class="flex items-center gap-3"><div class="w-4 h-[3px] bg-error"></div> Actual Physical</div>
                            <div class="flex items-center gap-3"><div class="w-4 h-[3px] bg-error opacity-50"></div> Financial</div>
                        </div>
                    </div>
                    <!-- Progress Summary Strip -->
                    <div class="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-outline-variant/30 border-t border-b border-outline-variant/30 py-6 bg-surface-container-lowest">
                        <div class="px-6 flex flex-col gap-1">
                            <span class="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Physical Progress</span>
                            <span class="font-headline-md text-[32px] text-primary">42.5% <span class="text-on-surface-variant text-[12px] font-normal tracking-normal">(Expected: 60.9%)</span></span>
                        </div>
                        <div class="px-6 flex flex-col gap-1">
                            <span class="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Financial Progress</span>
                            <span class="font-headline-md text-[32px] text-primary">68.1%</span>
                        </div>
                        <div class="px-6 flex flex-col gap-1">
                            <span class="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Schedule Deviation</span>
                            <span class="font-headline-md text-[32px] text-error">18.4%</span>
                        </div>
                        <div class="px-6 flex flex-col gap-1">
                            <span class="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Estimated Delay</span>
                            <span class="font-headline-md text-[32px] text-error">~7 Months</span>
                        </div>
                    </div>
                </section>
                <!-- PROJECT INTELLIGENCE -->
                <section class="mb-16">
                    <div class="mb-6 border-b border-outline-variant/30 pb-4">
                        <h2 class="font-headline-md text-headline-md text-primary uppercase">PROJECT INTELLIGENCE</h2>
                    </div>
                    <div class="flex flex-col border border-outline-variant/30 bg-surface-container-lowest">
                        <div class="flex flex-col lg:flex-row p-8 gap-8 items-start">
                            <div class="w-full lg:w-1/4 flex flex-col gap-2 border-r border-outline-variant/30 pr-8">
                                <div class="font-display-lg text-[72px] leading-none text-primary">78 <span class="font-headline-md text-[24px] text-on-surface-variant">/ 100</span></div>
                                <div class="font-label-caps text-[12px] tracking-widest text-error bg-error-container px-3 py-1 self-start font-bold uppercase mt-2">HIGH RISK</div>
                            </div>
                            <div class="w-full lg:w-3/4 flex flex-col gap-6">
                                <p class="font-body-md text-[18px] text-primary leading-relaxed max-w-3xl">
                                    Schedule slippage is currently the primary risk driver. Physical progress is significantly behind the expected trajectory while financial expenditure remains comparatively high.
                                </p>
                                <div class="flex flex-col gap-3 pt-4 border-t border-outline-variant/30">
                                    <span class="font-label-caps text-[11px] text-on-surface-variant uppercase tracking-widest">Contributing Factors</span>
                                    <div class="flex flex-wrap gap-x-6 gap-y-2 font-label-caps text-[12px] text-primary uppercase tracking-widest">
                                        <span>• SCHEDULE VARIANCE</span>
                                        <span>• FINANCIAL / PHYSICAL IMBALANCE</span>
                                        <span>• CONTRACTOR PERFORMANCE</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="border-t border-outline-variant/30 p-4 bg-surface flex justify-end">
                            <button class="font-label-caps text-[11px] uppercase tracking-widest text-primary hover:text-secondary flex items-center gap-2 transition-colors duration-300">EXPLORE PROJECT INTELLIGENCE <span class="material-symbols-outlined text-[14px]">arrow_forward</span></button>
                        </div>
                    </div>
                </section>
                <!-- EARLY WARNING SIGNALS -->
                <section class="mb-16">
                    <div class="mb-6 border-b border-outline-variant/30 pb-4 flex justify-between items-end">
                        <h2 class="font-headline-md text-headline-md text-primary uppercase">EARLY WARNING SIGNALS</h2>
                        <a class="font-label-caps text-[11px] uppercase tracking-widest text-primary hover:text-secondary flex items-center gap-1 transition-colors duration-300" href="#">VIEW ALL SIGNALS <span class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
                    </div>
                    <div class="flex flex-col border border-outline-variant/30 bg-surface-container-lowest">
                        <div class="px-6 py-4 border-b border-outline-variant/30 flex items-center gap-6">
                            <div class="w-32 font-metadata text-[11px] text-on-surface-variant uppercase tracking-widest shrink-0">10 MIN AGO</div>
                            <div class="w-24 font-label-caps text-[11px] text-error font-bold tracking-widest shrink-0">CRITICAL</div>
                            <div class="flex-grow font-body-md text-[14px] text-primary">Financial drawdown increased while physical progress remained unchanged.</div>
                        </div>
                        <div class="px-6 py-4 border-b border-outline-variant/30 flex items-center gap-6">
                            <div class="w-32 font-metadata text-[11px] text-on-surface-variant uppercase tracking-widest shrink-0">2 HOURS AGO</div>
                            <div class="w-24 font-label-caps text-[11px] text-error font-bold tracking-widest shrink-0">HIGH</div>
                            <div class="flex-grow font-body-md text-[14px] text-primary">Contractor dispute reported with potential milestone impact.</div>
                        </div>
                        <div class="px-6 py-4 flex items-center gap-6">
                            <div class="w-32 font-metadata text-[11px] text-on-surface-variant uppercase tracking-widest shrink-0">1 DAY AGO</div>
                            <div class="w-24 font-label-caps text-[11px] text-secondary font-bold tracking-widest uppercase shrink-0">MEDIUM</div>
                            <div class="flex-grow font-body-md text-[14px] text-primary">Schedule variance exceeded the expected intervention threshold.</div>
                        </div>
                    </div>
                </section>
                <!-- RECOMMENDED INTERVENTION -->
                <section>
                    <div class="mb-6 border-b border-outline-variant/30 pb-4">
                        <h2 class="font-headline-md text-headline-md text-primary uppercase">RECOMMENDED INTERVENTION</h2>
                    </div>
                    <div class="border border-outline-variant/30 p-8 flex flex-col gap-8 bg-surface-container-lowest">
                        <div class="flex flex-col gap-4">
                            <span class="font-label-caps text-[12px] text-error font-bold tracking-widest">PRIORITY: IMMEDIATE</span>
                            <h3 class="font-headline-md text-[24px] text-primary uppercase">Initiate contractor performance review</h3>
                            <p class="font-body-md text-[18px] text-on-surface-variant leading-relaxed max-w-4xl">
                                Schedule variance has exceeded the intervention threshold for two consecutive reporting periods.
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-4 pt-4 border-t border-outline-variant/30">
                            <button class="font-label-caps text-[11px] uppercase tracking-widest text-primary border border-primary px-6 py-3 hover:bg-surface-container-high/50 transition-colors duration-300 flex items-center gap-2">VIEW EVIDENCE <span class="material-symbols-outlined text-[14px]">arrow_forward</span></button>
                            <button class="font-label-caps text-[11px] uppercase tracking-widest text-primary border border-primary px-6 py-3 hover:bg-surface-container-high/50 transition-colors duration-300 flex items-center gap-2">CREATE INTERVENTION <span class="material-symbols-outlined text-[14px]">arrow_forward</span></button>
                        </div>
                    </div>
                </section>
            </main>
            <!-- Footer Component -->
            <footer class="w-full bg-surface dark:bg-primary border-t border-outline-variant mt-auto">
                <div class="flex flex-col md:flex-row justify-between items-center px-margin-desktop py-12 gap-8">
                    <div class="font-display-lg text-label-caps font-metadata text-metadata uppercase tracking-widest text-primary dark:text-on-primary">
                        © 2024 PAIMANA AI. SOVEREIGN INFRASTRUCTURE INTELLIGENCE.
                    </div>
                    <div class="flex flex-wrap justify-center gap-8 font-metadata text-metadata uppercase tracking-widest">
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Privacy Protocol</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Security Standards</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Institutional Access</a>
                        <a class="text-on-surface-variant dark:text-outline hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Intelligence Feed</a>
                    </div>
                </div>
            </footer>
        </body></html>