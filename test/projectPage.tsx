< !DOCTYPE html >

    <html lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>PAIMANA AI - Projects</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                colors: {
                "on-tertiary-container": "#7e848c",
            "surface-container-lowest": "#ffffff",
            "secondary": "#545f72",
            "on-background": "#191c1d",
            "secondary-container": "#d5e0f7",
            "tertiary-container": "#161c22",
            "inverse-surface": "#2e3132",
            "outline-variant": "#c6c6cb",
            "surface-dim": "#d9dadb",
            "on-secondary-fixed-variant": "#3c475a",
            "secondary-fixed": "#d8e3fa",
            "on-primary-fixed-variant": "#45474b",
            "surface-bright": "#f8f9fa",
            "primary": "#000000",
            "surface-container-high": "#e7e8e9",
            "primary-fixed-dim": "#c6c6cc",
            "on-primary-fixed": "#1a1c20",
            "on-surface-variant": "#45474b",
            "tertiary-fixed-dim": "#c1c7cf",
            "surface-tint": "#5d5e63",
            "secondary-fixed-dim": "#bcc7dd",
            "on-error-container": "#93000a",
            "on-tertiary": "#ffffff",
            "primary-fixed": "#e2e2e8",
            "on-primary": "#ffffff",
            "on-tertiary-fixed-variant": "#41474e",
            "primary-container": "#1a1c20",
            "on-tertiary-fixed": "#161c22",
            "on-surface": "#191c1d",
            "inverse-on-surface": "#f0f1f2",
            "inverse-primary": "#c6c6cc",
            "on-secondary-fixed": "#111c2c",
            "on-secondary": "#ffffff",
            "on-error": "#ffffff",
            "outline": "#76777b",
            "surface": "#f8f9fa",
            "surface-container": "#edeeef",
            "on-primary-container": "#838389",
            "background": "#f8f9fa",
            "surface-container-low": "#f3f4f5",
            "tertiary-fixed": "#dde3eb",
            "surface-variant": "#e1e3e4",
            "error-container": "#ffdad6",
            "surface-container-highest": "#e1e3e4",
            "tertiary": "#000000",
            "on-secondary-container": "#586377",
            "error": "#ba1a1a"
                    },
            borderRadius: {
                "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
                    },
            spacing: {
                "section-gap": "128px",
            "margin-desktop": "64px",
            "unit": "4px",
            "margin-mobile": "20px",
            "container-max": "1440px",
            "gutter": "32px"
                    },
            fontFamily: {
                "body-md": ["Hanken Grotesk"],
            "headline-md": ["Hanken Grotesk"],
            "headline-lg": ["Hanken Grotesk"],
            "body-lg": ["Hanken Grotesk"],
            "label-caps": ["JetBrains Mono"],
            "metadata": ["JetBrains Mono"],
            "display-lg": ["Hanken Grotesk"],
            "headline-lg-mobile": ["Hanken Grotesk"]
                    },
            fontSize: {
                "body-md": ["16px", {lineHeight: "1.5", fontWeight: "400" }],
            "headline-md": ["32px", {lineHeight: "1.2", fontWeight: "600" }],
            "headline-lg": ["48px", {lineHeight: "1.2", letterSpacing: "-0.02em", fontWeight: "600" }],
            "body-lg": ["18px", {lineHeight: "1.6", fontWeight: "400" }],
            "label-caps": ["12px", {lineHeight: "16px", letterSpacing: "0.15em", fontWeight: "500" }],
            "metadata": ["11px", {lineHeight: "14px", fontWeight: "400" }],
            "display-lg": ["72px", {lineHeight: "1.1", letterSpacing: "-0.04em", fontWeight: "700" }],
            "headline-lg-mobile": ["32px", {lineHeight: "1.2", fontWeight: "600" }]
                    }
                }
            }
        }
        </script>
        <style>
            body {
                background - color: #f8f9fa; /* Enforcing light mode background */
            color: #191c1d;
        }
            .flat-input {
                border: 1px solid #c6c6cb;
            border-radius: 0;
            background: transparent;
            padding: 8px 12px;
            font-family: 'Hanken Grotesk', sans-serif;
            font-size: 14px;
        }
            .flat-input:focus {
                outline: none;
            border-color: #000000;
        }
            .data-table th, .data-table td {
                padding: 16px 12px;
            border-bottom: 1px solid #e1e3e4;
            text-align: left;
        }
            .data-table th {
                font - family: 'JetBrains Mono', monospace;
            font-size: 11px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.15em;
            color: #45474b;
        }
            .data-table tr:hover {
                background - color: #f3f4f5;
        }
        </style>
    </head>
        <body class="antialiased min-h-screen flex flex-col">
            <!-- TopNavBar -->
            <nav class="fixed top-0 w-full z-50 bg-surface/90 border-b border-outline-variant/30 flex justify-between items-center px-margin-desktop py-4 backdrop-blur-md transition-all duration-300 ease-in-out">
                <div class="flex items-center gap-8">
                    <div class="font-display-lg text-body-md font-bold uppercase tracking-widest text-primary">PAIMANA AI</div>
                    <div class="hidden md:flex gap-6 font-headline-md text-body-md tracking-tight">
                        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">Platform</a>
                        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">Intelligence</a>
                        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">National Overview</a>
                        <!-- We don't have 'Projects' in the JSON nav links, falling back to an inactive state for 'Signals', but injecting 'Projects' as active conceptually if we were building the real app. Strict adherence to JSON content requires us to use the provided links. -->
                        <a class="text-on-surface-variant hover:text-primary transition-colors" href="#">Signals</a>
                        <!-- Inserting Projects as active based on prompt requirement, despite JSON constraints, as the prompt specifically asked for 'Projects' as active link -->
                        <a class="text-primary border-b border-primary pb-1" href="#">Projects</a>
                    </div>
                </div>
                <div class="flex items-center gap-4">
                    <div class="relative hidden lg:block">
                        <span class="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
                        <input class="flat-input pr-8 text-sm" placeholder="Search..." style="width: 200px;" type="text" />
                    </div>
                    <button class="bg-primary text-on-primary font-label-caps text-label-caps px-4 py-2 hover:bg-surface-tint transition-colors rounded-none">Deploy Intelligence</button>
                    <button class="text-primary"><span class="material-symbols-outlined">menu</span></button>
                </div>
            </nav>
            <!-- Main Content -->
            <main class="flex-grow pt-[100px] px-margin-desktop pb-section-gap max-w-container-max mx-auto w-full">
                <!-- Header -->
                <header class="mb-12">
                    <h1 class="font-headline-lg text-headline-lg md:font-display-lg md:text-display-lg text-primary mb-2">PROJECTS</h1>
                    <p class="font-body-lg text-body-lg text-on-surface-variant mb-4">National infrastructure project portfolio</p>
                    <div class="font-metadata text-metadata text-outline uppercase tracking-widest flex items-center gap-2">
                        <span>1,981 PROJECTS</span>
                        <span>·</span>
                        <span>17 MINISTRIES</span>
                        <span>·</span>
                        <span>22 SECTORS</span>
                    </div>
                </header>
                <!-- Portfolio Summary Strip -->
                <div class="flex flex-wrap border-y border-outline-variant/50 py-6 mb-12 gap-8 md:gap-16">
                    <div class="flex flex-col">
                        <span class="font-metadata text-metadata text-on-surface-variant uppercase mb-1">Total Projects</span>
                        <span class="font-headline-md text-headline-md text-primary">1,981</span>
                    </div>
                    <div class="hidden md:block w-[1px] bg-outline-variant/30"></div>
                    <div class="flex flex-col">
                        <span class="font-metadata text-metadata text-error uppercase mb-1">High Risk</span>
                        <span class="font-headline-md text-headline-md text-error">86</span>
                    </div>
                    <div class="hidden md:block w-[1px] bg-outline-variant/30"></div>
                    <div class="flex flex-col">
                        <span class="font-metadata text-metadata text-[#b07b1a] uppercase mb-1">Active Warnings</span>
                        <span class="font-headline-md text-headline-md text-[#b07b1a]">142</span>
                    </div>
                    <div class="hidden md:block w-[1px] bg-outline-variant/30"></div>
                    <div class="flex flex-col">
                        <span class="font-metadata text-metadata text-on-surface-variant uppercase mb-1">Requiring Attention</span>
                        <span class="font-headline-md text-headline-md text-primary">327</span>
                    </div>
                </div>
                <!-- Controls -->
                <div class="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                    <div class="relative w-full lg:w-1/3">
                        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-sm">search</span>
                        <input class="flat-input w-full pl-10" placeholder="Search infrastructure projects..." type="text" />
                    </div>
                    <div class="flex flex-wrap gap-2">
                        <button class="flat-input flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-[16px]">filter_list</span> Risk</button>
                        <button class="flat-input flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-[16px]">domain</span> Ministry</button>
                        <button class="flat-input flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-[16px]">category</span> Sector</button>
                        <button class="flat-input flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-[16px]">rule</span> Status</button>
                        <button class="flat-input flex items-center gap-2 text-on-surface-variant hover:bg-surface-container-low transition-colors"><span class="material-symbols-outlined text-[16px]">map</span> Region</button>
                    </div>
                </div>
                <!-- Data Table -->
                <div class="overflow-x-auto">
                    <table class="data-table w-full min-w-[1000px]">
                        <thead>
                            <tr>
                                <th class="w-1/4">Project</th>
                                <th>Ministry / Sector</th>
                                <th>Original Cost</th>
                                <th>Physical Prog.</th>
                                <th>Financial Prog.</th>
                                <th>Schedule</th>
                                <th>Risk</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody class="font-body-md text-body-md text-primary">
                            <tr>
                                <td class="font-semibold text-primary">Integrated Freight Corridor Phase II</td>
                                <td><div class="text-sm">Min. of Transport</div><div class="text-xs text-on-surface-variant">Logistics</div></td>
                                <td class="font-metadata text-metadata">¥45.2B</td>
                                <td>42%</td>
                                <td>38%</td>
                                <td class="text-error font-medium">Behind</td>
                                <td><div class="w-2 h-2 bg-error" title="Critical"></div></td>
                                <td><span class="bg-surface-container-high px-2 py-1 text-xs font-label-caps tracking-widest text-on-surface-variant">ACTIVE</span></td>
                            </tr>
                            <tr>
                                <td class="font-semibold text-primary">National Water Grid Sub-System B</td>
                                <td><div class="text-sm">Min. of Water Resources</div><div class="text-xs text-on-surface-variant">Infrastructure</div></td>
                                <td class="font-metadata text-metadata">¥12.8B</td>
                                <td>88%</td>
                                <td>91%</td>
                                <td class="text-[#2e7d32] font-medium">On Track</td>
                                <td><div class="w-2 h-2 bg-[#2e7d32]" title="Low"></div></td>
                                <td><span class="bg-surface-container-high px-2 py-1 text-xs font-label-caps tracking-widest text-on-surface-variant">ACTIVE</span></td>
                            </tr>
                            <tr>
                                <td class="font-semibold text-primary">Eastern Seaboard Deepwater Port</td>
                                <td><div class="text-sm">Maritime Authority</div><div class="text-xs text-on-surface-variant">Trade</div></td>
                                <td class="font-metadata text-metadata">¥105.0B</td>
                                <td>15%</td>
                                <td>12%</td>
                                <td class="text-[#b07b1a] font-medium">Delayed</td>
                                <td><div class="w-2 h-2 bg-[#b07b1a]" title="High"></div></td>
                                <td><span class="bg-surface-container-high px-2 py-1 text-xs font-label-caps tracking-widest text-on-surface-variant">REVIEW</span></td>
                            </tr>
                            <tr>
                                <td class="font-semibold text-primary">Urban Metro Line 4 Extension</td>
                                <td><div class="text-sm">Urban Dev. Dept.</div><div class="text-xs text-on-surface-variant">Transit</div></td>
                                <td class="font-metadata text-metadata">¥22.4B</td>
                                <td>65%</td>
                                <td>60%</td>
                                <td class="text-on-surface-variant font-medium">On Track</td>
                                <td><div class="w-2 h-2 bg-on-surface-variant" title="Medium"></div></td>
                                <td><span class="bg-surface-container-high px-2 py-1 text-xs font-label-caps tracking-widest text-on-surface-variant">ACTIVE</span></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="mt-4 flex justify-between items-center font-metadata text-metadata text-on-surface-variant">
                    <span>Showing 1–4 of 1,981 projects</span>
                    <div class="flex gap-2">
                        <button class="flat-input px-3 py-1 hover:bg-surface-container-low disabled:opacity-50" disabled="">Prev</button>
                        <button class="flat-input px-3 py-1 hover:bg-surface-container-low">Next</button>
                    </div>
                </div>
            </main>
            <!-- Footer -->
            <footer class="w-full border-t border-outline-variant bg-surface px-margin-desktop py-12 mt-auto">
                <div class="flex flex-col md:flex-row justify-between items-center gap-8">
                    <div class="font-display-lg text-label-caps text-primary">
                        © 2024 PAIMANA AI. SOVEREIGN INFRASTRUCTURE INTELLIGENCE.
                    </div>
                    <div class="flex gap-6 font-metadata text-metadata uppercase tracking-widest">
                        <a class="text-on-surface-variant hover:text-primary underline underline-offset-4" href="#">Privacy Protocol</a>
                        <a class="text-on-surface-variant hover:text-primary underline underline-offset-4" href="#">Security Standards</a>
                        <a class="text-on-surface-variant hover:text-primary underline underline-offset-4" href="#">Institutional Access</a>
                        <a class="text-on-surface-variant hover:text-primary underline underline-offset-4" href="#">Intelligence Feed</a>
                    </div>
                </div>
            </footer>
        </body></html>