import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as DialogPrimitive from "@radix-ui/react-dialog";

// Utility function
function cn(...inputs: (string | undefined | null | boolean)[]): string { 
  return inputs.filter(Boolean).join(" "); 
}

// Tooltip components
const TooltipProvider = TooltipPrimitive.Provider;
const Tooltip = TooltipPrimitive.Root;
const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>, 
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => ( 
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content 
      ref={ref} 
      sideOffset={sideOffset} 
      className={cn(
        "z-50 overflow-hidden rounded-md bg-gray-900 px-3 py-1.5 text-xs text-white animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95", 
        className
      )} 
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Dialog components
const Dialog = DialogPrimitive.Root;
const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>, 
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => ( 
  <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <DialogPrimitive.Content 
      ref={ref} 
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:bg-gray-950 sm:rounded-lg", 
        className
      )} 
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:ring-offset-gray-950 dark:focus:ring-gray-300 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400">
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
        </svg>
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
));
DialogContent.displayName = DialogPrimitive.Content.displayName;

// Icons

const SendIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}> 
    <path d="M22 2L11 13" /> 
    <polygon points="22,2 15,22 11,13 2,9 22,2" /> 
  </svg> 
);

const ImageIcon = (props: React.SVGProps<SVGSVGElement>) => ( 
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}> 
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" /> 
    <circle cx="9" cy="9" r="2" /> 
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /> 
  </svg> 
);

export interface PromptBoxProps {
  onSubmit?: (value: string, images: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export const PromptBox = React.forwardRef<HTMLTextAreaElement, PromptBoxProps>(
  ({ onSubmit, placeholder = "Type your message...", disabled = false, className }, ref) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [value, setValue] = React.useState("");
    const [images, setImages] = React.useState<string[]>([]);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [selectedImage, setSelectedImage] = React.useState<string | null>(null);

    React.useImperativeHandle(ref, () => textareaRef.current!, []);

    // Auto-resize textarea
    React.useLayoutEffect(() => { 
      const textarea = textareaRef.current; 
      if (textarea) { 
        textarea.style.height = "auto"; 
        const newHeight = Math.min(textarea.scrollHeight, 120); 
        textarea.style.height = `${newHeight}px`; 
      } 
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { 
      setValue(e.target.value); 
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => { 
      const files = event.target.files; 
      if (!files) return;

      Array.from(files).forEach(file => {
        if (file.type.startsWith("image/")) { 
          const reader = new FileReader(); 
          reader.onloadend = () => { 
            setImages(prev => [...prev, reader.result as string]); 
          }; 
          reader.readAsDataURL(file); 
        }
      });
      event.target.value = ""; 
    };

    const removeImage = (index: number) => {
      setImages(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (onSubmit && (value.trim() || images.length > 0)) {
        onSubmit(value.trim(), images);
        setValue("");
        setImages([]);
      }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSubmit(e);
      }
    };

    const hasContent = value.trim().length > 0 || images.length > 0;

    return (
      <TooltipProvider>
        <form onSubmit={handleSubmit} className={cn("w-full", className)}>
          <div className="flex flex-col rounded-[28px] bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 transition-colors focus-within:border-gray-300 dark:focus-within:border-gray-600">
            
            {/* Image previews */}
            {images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {images.map((image, index) => (
                  <div key={index} className="relative group">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(image);
                        setIsDialogOpen(true);
                      }}
                      className="block"
                    >
                      <img 
                        src={image} 
                        alt={`Upload ${index + 1}`} 
                        className="w-16 h-16 object-cover rounded-lg border border-gray-200 dark:border-gray-600" 
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Input area */}
            <div className="flex items-end gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/*"
                multiple
              />

              {/* Image upload button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={disabled}
                    className="flex-shrink-0 p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ImageIcon />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload image</p>
                </TooltipContent>
              </Tooltip>

              {/* Textarea */}
              <textarea 
                ref={textareaRef} 
                value={value} 
                onChange={handleInputChange} 
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                disabled={disabled}
                rows={1}
                className="flex-1 resize-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none min-h-[40px] max-h-[120px]" 
              />

              {/* Send button */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button 
                    type="submit" 
                    disabled={!hasContent || disabled}
                    className="flex-shrink-0 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 text-white rounded-full transition-colors disabled:cursor-not-allowed"
                  >
                    <SendIcon />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Send message</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Image preview dialog */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="max-w-4xl">
              {selectedImage && (
                <img 
                  src={selectedImage} 
                  alt="Full size preview" 
                  className="w-full h-auto max-h-[80vh] object-contain rounded-lg" 
                />
              )}
            </DialogContent>
          </Dialog>
        </form>
      </TooltipProvider>
    );
  }
);

PromptBox.displayName = "PromptBox";