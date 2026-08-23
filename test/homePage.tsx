< !DOCTYPE html >

    <html class="light" lang="en"><head>
        <meta charset="utf-8" />
        <meta content="width=device-width, initial-scale=1.0" name="viewport" />
        <title>PAIMANA AI - National Infrastructure Intelligence</title>
        <script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700&amp;family=JetBrains+Mono:wght@400;500&amp;display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script id="tailwind-config">
            tailwind.config = {
                darkMode: "class",
            theme: {
                extend: {
                "colors": {
                "on-secondary-fixed": "#111c2c",
            "on-secondary": "#ffffff",
            "on-error": "#ffffff",
            "on-secondary-fixed-variant": "#3c475a",
            "primary-fixed-dim": "#c6c6cc",
            "on-surface-variant": "#45474b",
            "tertiary": "#000000",
            "surface-container-lowest": "#ffffff",
            "secondary-fixed-dim": "#bcc7dd",
            "tertiary-container": "#161c22",
            "on-tertiary": "#ffffff",
            "on-error-container": "#93000a",
            "error-container": "#ffdad6",
            "tertiary-fixed": "#dde3eb",
            "secondary": "#545f72",
            "surface-tint": "#5d5e63",
            "surface-dim": "#d9dadb",
            "surface-variant": "#e1e3e4",
            "on-primary-container": "#838389",
            "on-primary-fixed": "#1a1c20",
            "outline-variant": "#c6c6cb",
            "on-tertiary-fixed-variant": "#41474e",
            "inverse-on-surface": "#f0f1f2",
            "on-background": "#191c1d",
            "primary-container": "#1a1c20",
            "surface-container-highest": "#e1e3e4",
            "surface-container": "#edeeef",
            "primary": "#000000",
            "on-surface": "#191c1d",
            "outline": "#76777b",
            "background": "#f8f9fa",
            "surface-container-high": "#e7e8e9",
            "tertiary-fixed-dim": "#c1c7cf",
            "surface-container-low": "#f3f4f5",
            "on-tertiary-container": "#7e848c",
            "on-secondary-container": "#586377",
            "surface": "#f8f9fa",
            "on-tertiary-fixed": "#161c22",
            "surface-bright": "#f8f9fa",
            "inverse-surface": "#2e3132",
            "secondary-fixed": "#d8e3fa",
            "on-primary": "#ffffff",
            "inverse-primary": "#c6c6cc",
            "secondary-container": "#d5e0f7",
            "primary-fixed": "#e2e2e8",
            "error": "#ba1a1a",
            "on-primary-fixed-variant": "#45474b"
            },
            "borderRadius": {
                "DEFAULT": "0.25rem",
            "lg": "0.5rem",
            "xl": "0.75rem",
            "full": "9999px"
            },
            "spacing": {
                "container-max": "1440px",
            "section-gap": "128px",
            "unit": "4px",
            "margin-mobile": "20px",
            "margin-desktop": "64px",
            "gutter": "32px"
            },
            "fontFamily": {
                "display-lg": [
            "Hanken Grotesk"
            ],
            "body-lg": [
            "Hanken Grotesk"
            ],
            "metadata": [
            "JetBrains Mono"
            ],
            "body-md": [
            "Hanken Grotesk"
            ],
            "headline-md": [
            "Hanken Grotesk"
            ],
            "headline-lg-mobile": [
            "Hanken Grotesk"
            ],
            "label-caps": [
            "JetBrains Mono"
            ],
            "headline-lg": [
            "Hanken Grotesk"
            ]
            },
            "fontSize": {
                "display-lg": [
            "72px",
            {
                "lineHeight": "1.1",
            "letterSpacing": "-0.04em",
            "fontWeight": "700"
                            }
            ],
            "body-lg": [
            "18px",
            {
                "lineHeight": "1.6",
            "fontWeight": "400"
                            }
            ],
            "metadata": [
            "11px",
            {
                "lineHeight": "14px",
            "fontWeight": "400"
                            }
            ],
            "body-md": [
            "16px",
            {
                "lineHeight": "1.5",
            "fontWeight": "400"
                            }
            ],
            "headline-md": [
            "32px",
            {
                "lineHeight": "1.2",
            "fontWeight": "600"
                            }
            ],
            "headline-lg-mobile": [
            "32px",
            {
                "lineHeight": "1.2",
            "fontWeight": "600"
                            }
            ],
            "label-caps": [
            "12px",
            {
                "lineHeight": "16px",
            "letterSpacing": "0.15em",
            "fontWeight": "500"
                            }
            ],
            "headline-lg": [
            "48px",
            {
                "lineHeight": "1.2",
            "letterSpacing": "-0.02em",
            "fontWeight": "600"
                            }
            ]
            }
    },
        },
      }
        </script>
        <style>
        /* Custom overrides to ensure absolute rigidity in the design */
            body {
                background - color: #f8f9fa; /* surface */
            color: #000000; /* primary */
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

            .industrial-line {
                border - bottom: 1px solid #E2E8F0; /* Thin precise line */
        }

            .industrial-line-top {
                border - top: 1px solid #E2E8F0;
        }

            /* Enforce straight corners globally */
            * {
                border - radius: 0 !important;
        }

            /* Specific link styling */
            .text-link-hover {
                position: relative;
            text-decoration: none;
        }
            .text-link-hover::after {
                content: '';
            position: absolute;
            width: 100%;
            transform: scaleX(0);
            height: 1px;
            bottom: 0;
            left: 0;
            background-color: currentColor;
            transform-origin: bottom right;
            transition: transform 0.25s ease-out;
        }
            .text-link-hover:hover::after {
                transform: scaleX(1);
            transform-origin: bottom left;
        }

            .hero-overlay {
                background: linear-gradient(180deg, rgba(10,12,16,0.85) 0%, rgba(10,12,16,0.6) 50%, rgba(10,12,16,0.9) 100%);
        }
        </style>
    </head>
        <body class="font-body-md text-body-md selection:bg-primary selection:text-on-primary">
            <!-- HERO SECTION -->
            <section class="relative min-h-screen w-full flex flex-col justify-between overflow-hidden">
                <!-- Background Image -->
                <div class="absolute inset-0 w-full h-full z-0 bg-cover bg-center" data-alt="Aerial view of massive infrastructure highway interchange construction site at dusk, moody atmospheric lighting, industrial scale, raw concrete and heavy machinery, cinematic sovereign intelligence aesthetic." style="background-image: url('https://lh3.googleusercontent.com/aida-public/AB6AXuCFVl7bqAca7quBoz-KGr3RllPqbHHySKMyuQx-ttMGTLoeXOrDrF9A3TwkOrt1RuBUF49o4AJeoNKit2x_D3hUnmLAHZcPg4Oug0iSqJrUzr7nbDn1cR4yDGTro8gepfZdnnLMauLQHIeeiHJwfTbtzWeYhjMbvbKnd3a1eJuEeT8CUmEq2-2OWz8BtXUUu_uOiK4mxTZIFYUSACmj_Qfw5zQWSyX1nkIQWfwaV37PPK64cuq6I7hP');">
                    <div class="absolute inset-0 hero-overlay"></div>
                </div>
                <!-- TopNavBar (Shared Component) -->
                <nav class="relative z-50 flex justify-between items-center px-margin-mobile md:px-margin-desktop py-4 w-full bg-transparent border-b border-outline-variant/30 text-on-primary transition-all duration-300 ease-in-out">
                    <div class="flex items-center gap-8">
                        <a class="font-display-lg text-body-md font-bold uppercase tracking-widest text-on-primary" href="#">
                            PAIMANA AI
                        </a>
                        <div class="hidden md:flex items-center gap-6">
                            <a class="font-headline-md text-body-md tracking-tight text-on-primary border-b border-on-primary pb-1" href="#">Platform</a>
                            <a class="font-headline-md text-body-md tracking-tight text-outline hover:text-on-primary transition-colors" href="#">Intelligence</a>
                            <a class="font-headline-md text-body-md tracking-tight text-outline hover:text-on-primary transition-colors" href="#">National Overview</a>
                            <a class="font-headline-md text-body-md tracking-tight text-outline hover:text-on-primary transition-colors" href="#">Signals</a>
                        </div>
                    </div>
                    <div class="flex items-center gap-4">
                        <button class="hidden md:flex items-center gap-2 font-label-caps text-label-caps uppercase tracking-widest text-on-primary hover:text-outline transition-colors group">
                            Deploy Intelligence
                            <span class="material-symbols-outlined text-[16px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </button>
                        <button class="p-2 hover:bg-primary-container/50 transition-colors">
                            <span class="material-symbols-outlined text-on-primary">menu</span>
                        </button>
                    </div>
                </nav>
                <!-- Hero Content -->
                <div class="relative z-10 px-margin-mobile md:px-margin-desktop pb-24 max-w-container-max mx-auto w-full text-on-primary">
                    <div class="max-w-4xl">
                        <h1 class="font-display-lg text-display-lg mb-6 leading-[1.05]">
                            NATIONAL INFRASTRUCTURE INTELLIGENCE
                        </h1>
                        <p class="font-body-lg text-body-lg text-inverse-primary mb-12 max-w-2xl border-l-2 border-on-primary pl-6">
                            AI-powered monitoring and early warning for India's critical infrastructure portfolio. Real-time sovereign scale analytics.
                        </p>
                        <div class="flex flex-col md:flex-row md:items-center gap-8 mb-12">
                            <div class="font-metadata text-metadata text-outline tracking-widest uppercase flex gap-4">
                                <span>1,981 PROJECTS</span>
                                <span>·</span>
                                <span>22 SECTORS</span>
                                <span>·</span>
                                <span>17 MINISTRIES</span>
                            </div>
                        </div>
                        <a class="inline-flex items-center gap-3 font-label-caps text-label-caps text-on-primary uppercase tracking-widest text-link-hover py-2" href="#">
                            EXPLORE PROJECTS
                            <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </a>
                    </div>
                </div>
            </section>
            <main class="w-full max-w-container-max mx-auto">
                <!-- NATIONAL SITUATION (Stats) -->
                <section class="px-margin-mobile md:px-margin-desktop py-section-gap">
                    <div class="industrial-line-top pt-8 mb-16">
                        <h2 class="font-label-caps text-label-caps text-outline tracking-widest uppercase mb-12">National Situation Overview</h2>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-x-gutter gap-y-12">
                        <div class="industrial-line pb-8">
                            <div class="font-display-lg text-[64px] font-bold leading-none mb-4 text-primary">1,981</div>
                            <div class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Projects Monitored</div>
                        </div>
                        <div class="industrial-line pb-8">
                            <div class="font-display-lg text-[64px] font-bold leading-none mb-4 text-primary">327</div>
                            <div class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Require Attention</div>
                        </div>
                        <div class="industrial-line pb-8">
                            <div class="font-display-lg text-[64px] font-bold leading-none mb-4 text-error">86</div>
                            <div class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">High Risk</div>
                        </div>
                        <div class="industrial-line pb-8">
                            <div class="font-display-lg text-[64px] font-bold leading-none mb-4 text-primary">142</div>
                            <div class="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-widest">Active Warnings</div>
                        </div>
                    </div>
                </section>
                <!-- PROJECT ATTENTION -->
                <section class="px-margin-mobile md:px-margin-desktop py-section-gap">
                    <div class="flex items-baseline justify-between industrial-line-top pt-8 mb-16">
                        <h2 class="font-headline-lg text-headline-lg-mobile md:text-headline-lg text-primary">PROJECTS REQUIRING ATTENTION</h2>
                        <a class="font-metadata text-metadata uppercase tracking-widest text-link-hover hidden md:inline-flex items-center gap-2" href="#">View All Portfolio <span class="material-symbols-outlined text-[14px]">arrow_forward</span></a>
                    </div>
                    <div class="flex flex-col">
                        <!-- Row 1 -->
                        <a class="group block industrial-line py-8 hover:bg-surface-container-low transition-colors px-4 -mx-4" href="#">
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div class="col-span-1 font-metadata text-metadata text-outline">01</div>
                                <div class="col-span-12 md:col-span-5">
                                    <h3 class="font-headline-md text-[24px] text-primary group-hover:text-on-surface-variant transition-colors mb-2">INTEGRATED FREIGHT CORRIDOR PHASE II</h3>
                                    <div class="font-label-caps text-label-caps text-outline uppercase tracking-widest">Railways · Transport</div>
                                </div>
                                <div class="col-span-12 md:col-span-2">
                                    <span class="inline-block bg-[#FEE2E2] text-[#991B1B] font-metadata text-metadata px-3 py-1 border border-[#FCA5A5]">CRITICAL</span>
                                </div>
                                <div class="col-span-12 md:col-span-3 flex flex-col gap-2">
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Physical Progress</span>
                                        <span>42.5%</span>
                                    </div>
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Financial Progress</span>
                                        <span>68.1%</span>
                                    </div>
                                </div>
                                <div class="col-span-1 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span class="material-symbols-outlined text-primary">arrow_forward</span>
                                </div>
                            </div>
                        </a>
                        <!-- Row 2 -->
                        <a class="group block industrial-line py-8 hover:bg-surface-container-low transition-colors px-4 -mx-4" href="#">
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div class="col-span-1 font-metadata text-metadata text-outline">02</div>
                                <div class="col-span-12 md:col-span-5">
                                    <h3 class="font-headline-md text-[24px] text-primary group-hover:text-on-surface-variant transition-colors mb-2">NATIONAL WATERWAY TERMINAL 4</h3>
                                    <div class="font-label-caps text-label-caps text-outline uppercase tracking-widest">Shipping · Logistics</div>
                                </div>
                                <div class="col-span-12 md:col-span-2">
                                    <span class="inline-block bg-[#FEF9C3] text-[#854D0E] font-metadata text-metadata px-3 py-1 border border-[#FEF08A]">DELAYED</span>
                                </div>
                                <div class="col-span-12 md:col-span-3 flex flex-col gap-2">
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Physical Progress</span>
                                        <span>18.2%</span>
                                    </div>
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Financial Progress</span>
                                        <span>35.0%</span>
                                    </div>
                                </div>
                                <div class="col-span-1 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span class="material-symbols-outlined text-primary">arrow_forward</span>
                                </div>
                            </div>
                        </a>
                        <!-- Row 3 -->
                        <a class="group block industrial-line py-8 hover:bg-surface-container-low transition-colors px-4 -mx-4" href="#">
                            <div class="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                                <div class="col-span-1 font-metadata text-metadata text-outline">03</div>
                                <div class="col-span-12 md:col-span-5">
                                    <h3 class="font-headline-md text-[24px] text-primary group-hover:text-on-surface-variant transition-colors mb-2">ULTRA MEGA POWER PROJECT ZONAL</h3>
                                    <div class="font-label-caps text-label-caps text-outline uppercase tracking-widest">Energy · Power</div>
                                </div>
                                <div class="col-span-12 md:col-span-2">
                                    <span class="inline-block bg-[#FEE2E2] text-[#991B1B] font-metadata text-metadata px-3 py-1 border border-[#FCA5A5]">CRITICAL</span>
                                </div>
                                <div class="col-span-12 md:col-span-3 flex flex-col gap-2">
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Physical Progress</span>
                                        <span>89.5%</span>
                                    </div>
                                    <div class="flex justify-between font-metadata text-metadata text-on-surface-variant">
                                        <span>Financial Progress</span>
                                        <span>99.1%</span>
                                    </div>
                                </div>
                                <div class="col-span-1 hidden md:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span class="material-symbols-outlined text-primary">arrow_forward</span>
                                </div>
                            </div>
                        </a>
                    </div>
                </section>
                <!-- EARLY WARNING -->
                <section class="px-margin-mobile md:px-margin-desktop py-section-gap bg-surface-container-lowest">
                    <div class="industrial-line-top pt-8 mb-16">
                        <h2 class="font-label-caps text-label-caps text-outline tracking-widest uppercase mb-12">EARLY WARNING SIGNALS</h2>
                    </div>
                    <div class="flex flex-col gap-8 max-w-4xl">
                        <div class="flex gap-4 md:gap-8 items-start group cursor-pointer">
                            <div class="w-2 h-2 bg-error mt-2 flex-shrink-0"></div>
                            <div>
                                <div class="font-body-md text-[20px] text-primary mb-2 group-hover:text-on-surface-variant transition-colors">Unusual financial drawdown detected in PRJ-HWY-449. Pattern matches historic stalling precursors.</div>
                                <div class="font-metadata text-metadata text-outline uppercase tracking-widest flex gap-4">
                                    <span>CRITICAL</span>
                                    <span>·</span>
                                    <span>10 MIN AGO</span>
                                </div>
                            </div>
                        </div>
                        <div class="flex gap-4 md:gap-8 items-start group cursor-pointer">
                            <div class="w-2 h-2 bg-[#F59E0B] mt-2 flex-shrink-0"></div>
                            <div>
                                <div class="font-body-md text-[20px] text-primary mb-2 group-hover:text-on-surface-variant transition-colors">Land acquisition litigation filed against NWT-Phase3 site C. Projected delay: 14 months.</div>
                                <div class="font-metadata text-metadata text-outline uppercase tracking-widest flex gap-4">
                                    <span>WARNING</span>
                                    <span>·</span>
                                    <span>2 HOURS AGO</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
                <!-- AI ASK -->
                <section class="px-margin-mobile md:px-margin-desktop py-section-gap">
                    <div class="industrial-line-top pt-8 mb-16">
                        <h2 class="font-label-caps text-label-caps text-outline tracking-widest uppercase">ASK PAIMANA</h2>
                    </div>
                    <div class="max-w-4xl mx-auto text-center">
                        <h3 class="font-display-lg text-[40px] md:text-[56px] text-primary mb-12 leading-tight">
                            "Which infrastructure projects require intervention this month?"
                        </h3>
                        <div class="relative w-full max-w-2xl mx-auto border-b border-primary group">
                            <input class="w-full bg-transparent border-none outline-none font-body-md text-[20px] py-4 pl-0 pr-12 text-primary placeholder:text-outline focus:ring-0" placeholder="Query the national intelligence model..." type="text" />
                            <button class="absolute right-0 top-1/2 -translate-y-1/2 p-2 hover:bg-surface-container transition-colors">
                                <span class="material-symbols-outlined text-primary">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </section>
                <!-- EXPLORATION BIG LINK -->
                <section class="px-margin-mobile md:px-margin-desktop py-section-gap border-t border-outline-variant/30 flex items-center justify-center min-h-[40vh] hover:bg-surface-container-lowest transition-colors cursor-pointer group">
                    <a class="font-display-lg text-[48px] md:text-[72px] text-primary text-center leading-tight flex items-center gap-6 group-hover:gap-8 transition-all" href="#">
                        EXPLORE THE NATIONAL PROJECT PORTFOLIO
                        <span class="material-symbols-outlined text-[64px]">arrow_forward</span>
                    </a>
                </section>
            </main>
            <!-- Footer (Shared Component) -->
            <footer class="w-full bg-surface dark:bg-primary border-t border-outline-variant flex flex-col md:flex-row justify-between items-center px-margin-desktop py-12 gap-8 text-primary dark:text-on-primary">
                <div class="font-display-lg text-label-caps">
                    PAIMANA AI
                </div>
                <div class="font-metadata text-metadata uppercase tracking-widest text-on-surface-variant dark:text-outline text-center md:text-left">
                    © 2024 PAIMANA AI. SOVEREIGN INFRASTRUCTURE INTELLIGENCE.
                </div>
                <div class="flex flex-wrap justify-center gap-6 font-metadata text-metadata uppercase tracking-widest text-on-surface-variant dark:text-outline">
                    <a class="hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Privacy Protocol</a>
                    <a class="hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Security Standards</a>
                    <a class="hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Institutional Access</a>
                    <a class="hover:text-primary dark:hover:text-on-primary underline underline-offset-4" href="#">Intelligence Feed</a>
                </div>
            </footer>
        </body></html>