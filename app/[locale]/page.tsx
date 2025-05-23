/* eslint-disable @next/next/no-img-element */
"use client";
import "katex/dist/katex.min.css";

import { AnimatePresence, motion } from "framer-motion";
import { useChat, UseChatOptions } from "@ai-sdk/react";
import {
	CalendarBlank,
	Clock as PhosphorClock,
	Info,
	Translate,
} from "@phosphor-icons/react";
import { parseAsString, useQueryState } from "nuqs";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Moon, Plus, Sun } from "lucide-react";
import Link from "next/link";
import React, {
	memo,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";

import { Button } from "@/components/ui/button";
import FormComponent from "@/components/ui/form-component";
import { InstallPrompt } from "@/components/InstallPrompt";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { cn, getUserId, SearchGroupId } from "@/lib/utils";
import { suggestQuestions } from "./actions";
import Messages from "@/components/messages";
import { T, Var } from "gt-next";
import { LocaleSelector, DateTime, useLocale} from "gt-next/client"
import { useGT } from "gt-next/client";

interface Attachment {
	name: string;
	contentType: string;
	url: string;
	size: number;
}

const VercelIcon = ({ size = 16 }: { size: number }) => {
	return (
		<svg
			height={size}
			strokeLinejoin="round"
			viewBox="0 0 16 16"
			width={size}
			style={{ color: "currentcolor" }}
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M8 1L16 15H0L8 1Z"
				fill="currentColor"
			></path>
		</svg>
	);
};

const HomeContent = () => {
	const [query] = useQueryState("query", parseAsString.withDefault(""));
	const [q] = useQueryState("q", parseAsString.withDefault(""));

	// Use localStorage hook directly for model selection with a default
	const [selectedModel, setSelectedModel] = useLocalStorage(
		"scira-selected-model",
		"scira-default",
	);

	const initialState = useMemo(
		() => ({
			query: query || q,
		}),
		[query, q],
	);

	const lastSubmittedQueryRef = useRef(initialState.query);
	const bottomRef = useRef<HTMLDivElement>(null);
	const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
	const [isEditingMessage, setIsEditingMessage] = useState(false);
	const [editingMessageIndex, setEditingMessageIndex] = useState(-1);
	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const initializedRef = useRef(false);
	const [selectedGroup, setSelectedGroup] = useState<SearchGroupId>("web");
	const [hasSubmitted, setHasSubmitted] = React.useState(false);
	const [hasManuallyScrolled, setHasManuallyScrolled] = useState(false);
	const isAutoScrollingRef = useRef(false);
	const t = useGT();

	// Get stored user ID
	const userId = useMemo(() => getUserId(), []);

	const chatOptions: UseChatOptions = useMemo(
		() => ({
			api: "/api/search",
			experimental_throttle: 500,
			maxSteps: 5,
			body: {
				model: selectedModel,
				group: selectedGroup,
				user_id: userId,
				timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			},
			onFinish: async (message, { finishReason }) => {
				console.log("[finish reason]:", finishReason);
				if (
					message.content &&
					(finishReason === "stop" || finishReason === "length")
				) {
					const newHistory = [
						{ role: "user", content: lastSubmittedQueryRef.current },
						{ role: "assistant", content: message.content },
					];

					const { questions } = await suggestQuestions(newHistory);
					setSuggestedQuestions(questions);
				}
			},
			onError: (error) => {
				console.error("Chat error:", error.cause, error.message);
				toast.error(<T id="page.error.generic">An error occurred.</T>, {
					description: (
						<T id="page.error.processingRequest">
							Oops! An error occurred while processing your request. <Var name="message">{error.message}</Var>
						</T>
					),
				});
			},
		}),
		[selectedModel, selectedGroup, userId],
	);

	const {
		input,
		messages,
		setInput,
		append,
		handleSubmit,
		setMessages,
		reload,
		stop,
		status,
		error,
	} = useChat(chatOptions);

	useEffect(() => {
		if (!initializedRef.current && initialState.query && !messages.length) {
			initializedRef.current = true;
			console.log("[initial query]:", initialState.query);
			append({
				content: initialState.query,
				role: "user",
			});
		}
	}, [initialState.query, append, setInput, messages.length]);

	const ThemeToggle: React.FC = () => {
		const { resolvedTheme, setTheme } = useTheme();

		return (
			<T id="page.0">
				<Button
					variant="ghost"
					size="icon"
					onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
					className="bg-transparent hover:bg-neutral-100 dark:hover:bg-neutral-800"
				>
					<Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
					<Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
					<span className="sr-only">Toggle theme</span>
				</Button>
			</T>
		);
	};

	const lastUserMessageIndex = useMemo(() => {
		for (let i = messages.length - 1; i >= 0; i--) {
			if (messages[i].role === "user") {
				return i;
			}
		}
		return -1;
	}, [messages]);

	useEffect(() => {
		// Reset manual scroll when streaming starts
		if (status === "streaming") {
			setHasManuallyScrolled(false);
			// Initial scroll to bottom when streaming starts
			if (bottomRef.current) {
				isAutoScrollingRef.current = true;
				bottomRef.current.scrollIntoView({ behavior: "smooth" });
			}
		}
	}, [status]);

	useEffect(() => {
		let scrollTimeout: NodeJS.Timeout;

		const handleScroll = () => {
			// Clear any pending timeout
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}

			// If we're not auto-scrolling and we're streaming, it must be a user scroll
			if (!isAutoScrollingRef.current && status === "streaming") {
				const isAtBottom =
					window.innerHeight + window.scrollY >=
					document.body.offsetHeight - 100;
				if (!isAtBottom) {
					setHasManuallyScrolled(true);
				}
			}
		};

		window.addEventListener("scroll", handleScroll);

		// Auto-scroll on new content if we haven't manually scrolled
		if (status === "streaming" && !hasManuallyScrolled && bottomRef.current) {
			scrollTimeout = setTimeout(() => {
				isAutoScrollingRef.current = true;
				bottomRef.current?.scrollIntoView({ behavior: "smooth" });
				// Reset auto-scroll flag after animation
				setTimeout(() => {
					isAutoScrollingRef.current = false;
				}, 100);
			}, 100);
		}

		return () => {
			window.removeEventListener("scroll", handleScroll);
			if (scrollTimeout) {
				clearTimeout(scrollTimeout);
			}
		};
	}, [messages, suggestedQuestions, status, hasManuallyScrolled]);

	const AboutButton = () => {
		return (
			<Link href="/about">
				<Button
					variant="outline"
					size="icon"
					className="rounded-full w-8 h-8 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-all"
				>
					<Info className="h-5 w-5 text-neutral-600 dark:text-neutral-400" />
				</Button>
			</Link>
		);
	};

	interface NavbarProps {}

	const Navbar: React.FC<NavbarProps> = () => {
		return (
			<T id="page.1">
				<div
					className={cn(
						"fixed top-0 left-0 right-0 z-60 flex justify-between items-center p-4",
						// Add opaque background only after submit
						status === "streaming" || status === "ready"
							? "bg-background/95 backdrop-blur-sm supports-backdrop-filter:bg-background/60"
							: "bg-background",
					)}
				>
					<div className="flex items-center gap-4">
						<Link href="/new">
							<Button
								type="button"
								variant={"secondary"}
								className="rounded-full bg-accent hover:bg-accent/80 backdrop-blur-xs group transition-all hover:scale-105 pointer-events-auto"
							>
								<Plus
									size={18}
									className="group-hover:rotate-90 transition-all"
								/>
								<span className="text-sm ml-2 group-hover:block hidden animate-in fade-in duration-300">
									New
								</span>
							</Button>
						</Link>
					</div>
					<div className="flex items-center space-x-4">
						<Link
							target="_blank"
							href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgeneraltranslation%2Fscira-multilingual&env=GT_PROJECT_ID,GT_API_KEY,OPENAI_API_KEY,MEM0_API_KEY,EXA_API_KEY,ANTHROPIC_API_KEY,TAVILY_API_KEY,XAI_API_KEY,E2B_API_KEY,FIRECRAWL_API_KEY"
							className="flex flex-row gap-2 items-center py-1.5 px-2 rounded-md 
                            bg-accent hover:bg-accent/80
                            backdrop-blur-xs text-foreground shadow-sm text-sm
                            transition-all duration-200"
						>
							<VercelIcon size={14} />
							<span className="hidden sm:block">Deploy with Vercel</span>
							<span className="sm:hidden block">Deploy</span>
						</Link>
						<AboutButton />
						<ThemeToggle />
					</div>
				</div>
			</T>
		);
	};

	// Define the model change handler
	const handleModelChange = useCallback(
		(model: string) => {
			setSelectedModel(model);
		},
		[setSelectedModel],
	);

	const resetSuggestedQuestions = useCallback(() => {
		setSuggestedQuestions([]);
	}, []);

const WidgetSection = memo(() => {
	// Use null as initial state to prevent hydration mismatch
	const [currentTime, setCurrentTime] = useState<Date | null>(null);
	const timerRef = useRef<NodeJS.Timeout>();
	const timeDateQuestion = t("What's the current date and time?");
	const locale = useLocale(); 
	
	const timeZoneRef = useRef<string | null>(null);
	
	// Track if component is mounted (client-side)
	const isMounted = useRef(false);
  
	// First effect handles initial client-side setup only
	useEffect(() => {
	  // Mark as mounted - we're now client-side
	  isMounted.current = true;
	  
	  // Get client timezone
	  timeZoneRef.current = Intl.DateTimeFormat().resolvedOptions().timeZone;
	  
	  // Set time immediately after component mounts on client
	  setCurrentTime(new Date());
	  
	  return () => {
		isMounted.current = false;
	  };
	}, []);
	
	// Second effect sets up the timing synchronization
	// Only runs after initial client-side render is complete
	useEffect(() => {
	  if (!isMounted.current || currentTime === null) return;

	  const now = new Date();
	  const delay = 1000 - now.getMilliseconds();
  
	  const timeout = setTimeout(() => {
		if (isMounted.current) {
		  setCurrentTime(new Date());
		  
		  timerRef.current = setInterval(() => {
			if (isMounted.current) {
			  setCurrentTime(new Date());
			}
		  }, 1000);
		}
	  }, delay);
  
	  return () => {
		clearTimeout(timeout);
		if (timerRef.current) {
		  clearInterval(timerRef.current);
		}
	  };
	}, [currentTime]);
	
	// Force an update to date/time display when locale changes
	useEffect(() => {
	  if (isMounted.current) {
		setCurrentTime(new Date());
	  }
	}, [locale]);
  
	// Only define handleDateTimeClick once using useCallback
	const handleDateTimeClick = useCallback(() => {
	  if (status !== "ready") return;
  
	  append({
		content: timeDateQuestion,
		role: "user",
	  });
  
	  lastSubmittedQueryRef.current = timeDateQuestion;
	  setHasSubmitted(true);
	}, [status, timeDateQuestion, append, lastSubmittedQueryRef, setHasSubmitted]);
  
	// If we don't have a current time yet (SSR or early render), show placeholder or skeleton
	if (currentTime === null) {
	  return (
		<div className="mt-8 w-full">
		  <div className="flex flex-wrap gap-3 justify-center">
			{/* Placeholder widgets while loading client time */}
			<div className="h-10 w-24 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"></div>
			<div className="h-10 w-32 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"></div>
			<div className="h-10 w-28 bg-neutral-100 dark:bg-neutral-800 rounded-full animate-pulse"></div>
		  </div>
		</div>
	  );
	}
  
	return (
	  <div className="mt-8 w-full">
		<div className="flex flex-wrap gap-3 justify-center">
		  {/* Time Widget */}
		  <Button
			variant="outline"
			className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-xs transition-all h-auto"
			onClick={handleDateTimeClick}
		  >
			<PhosphorClock
			  weight="duotone"
			  className="h-5 w-5 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform"
			/>
			<span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
			  {/* Use timeZone property in DateTime options */}
			  <DateTime options={{ hour: "2-digit", minute: "2-digit", timeZone: timeZoneRef.current || undefined }}>
				{currentTime}
			  </DateTime>
			</span>
		  </Button>
  
		  {/* Date Widget */}
		  <Button
			variant="outline"
			className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-xs transition-all h-auto"
			onClick={handleDateTimeClick}
		  >
			<CalendarBlank
			  weight="duotone"
			  className="h-5 w-5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform"
			/>
			<span className="text-sm text-neutral-700 dark:text-neutral-300 font-medium">
			  <DateTime options={{ weekday: "short", month: "short", day: "numeric", timeZone: timeZoneRef.current || undefined }}>
				{currentTime}
			  </DateTime>
			</span>
		  </Button>
		  <Button
			variant="outline"
			className="group flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:shadow-xs transition-all h-auto"
		  >
			<Translate
			  weight="duotone"
			  className="h-5 w-5 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform"
			/>
			<LocaleSelector />
		  </Button>
		</div>
	  </div>
	);
  });

	WidgetSection.displayName = "WidgetSection";

	return (
		<div className="flex flex-col font-sans! items-center min-h-screen bg-background text-foreground transition-all duration-500">
			<Navbar />

			<div
				className={`w-full p-2 sm:p-4 ${
					status === "ready" && messages.length === 0
						? "min-h-screen! flex! flex-col! items-center! justify-center!" // Center everything when no messages
						: "mt-20! sm:mt-16!" // Add top margin when showing messages
				}`}
			>
				<div
					className={`w-full max-w-[26rem] sm:max-w-2xl space-y-6 p-0 mx-auto transition-all duration-300`}
				>
					{status === "ready" && messages.length === 0 && (
						<T id="page.2">
							<div className="text-center">
								<div className="flex justify-center mb-8">
									<div className="relative group">
										<div className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition duration-300"></div>
										<div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-gray-900 backdrop-blur-sm text-black dark:text-white border border-transparent">
											<a href="https://github.com/generaltranslation/gt" target="_blank" rel="noopener noreferrer" className="text-xs">
												✨ Translated with GT Libraries
											</a>
										</div>
									</div>
								</div>

								<h1 className="text-2xl sm:text-4xl mb-4 sm:mb-6 text-neutral-800 dark:text-neutral-100 font-syne!">
									What do you want to explore?
								</h1>
							</div>
						</T>
					)
				}
    
    <AnimatePresence>
      {messages.length === 0 && !hasSubmitted && (
        <motion.div
          initial={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.5 }}
          className={cn("mt-4!")}
        >
          <FormComponent
            input={input}
            setInput={setInput}
            attachments={attachments}
            setAttachments={setAttachments}
            handleSubmit={handleSubmit}
            fileInputRef={fileInputRef}
            inputRef={inputRef}
            stop={stop}
            messages={messages as any}
            append={append}
            selectedModel={selectedModel}
            setSelectedModel={handleModelChange}
            resetSuggestedQuestions={resetSuggestedQuestions}
            lastSubmittedQueryRef={lastSubmittedQueryRef}
            selectedGroup={selectedGroup}
            setSelectedGroup={setSelectedGroup}
            showExperimentalModels={true}
            status={status}
            setHasSubmitted={setHasSubmitted}
          />
        </motion.div>
      )}
    </AnimatePresence>

					{/* Add the widget section below form when no messages */}
					{messages.length === 0 && (
						<div>
							<WidgetSection />
						</div>
					)}

					{/* Use the Messages component */}
					{messages.length > 0 && (
						<Messages
							messages={messages}
							lastUserMessageIndex={lastUserMessageIndex}
							isEditingMessage={isEditingMessage}
							editingMessageIndex={editingMessageIndex}
							input={input}
							setInput={setInput}
							setIsEditingMessage={setIsEditingMessage}
							setEditingMessageIndex={setEditingMessageIndex}
							setMessages={setMessages}
							append={append}
							reload={reload}
							suggestedQuestions={suggestedQuestions}
							setSuggestedQuestions={setSuggestedQuestions}
							status={status}
							error={error}
						/>
					)}

					<div ref={bottomRef} />
				</div>

				<AnimatePresence>
					{(messages.length > 0 || hasSubmitted) && (
						<motion.div
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							exit={{ opacity: 0, y: 20 }}
							transition={{ duration: 0.5 }}
							className="fixed bottom-6 sm:bottom-4 left-0 right-0 w-full max-w-[26rem] sm:max-w-2xl mx-auto z-20"
						>
							<FormComponent
								input={input}
								setInput={setInput}
								attachments={attachments}
								setAttachments={setAttachments}
								handleSubmit={handleSubmit}
								fileInputRef={fileInputRef}
								inputRef={inputRef}
								stop={stop}
								messages={messages as any}
								append={append}
								selectedModel={selectedModel}
								setSelectedModel={handleModelChange}
								resetSuggestedQuestions={resetSuggestedQuestions}
								lastSubmittedQueryRef={lastSubmittedQueryRef}
								selectedGroup={selectedGroup}
								setSelectedGroup={setSelectedGroup}
								showExperimentalModels={false}
								status={status}
								setHasSubmitted={setHasSubmitted}
							/>
						</motion.div>
					)}
				</AnimatePresence>
			</div>
		</div>
	);
};

const Home = () => {
	return (
		<Suspense>
			<HomeContent />
			<InstallPrompt />
		</Suspense>
	);
};

export default Home;
