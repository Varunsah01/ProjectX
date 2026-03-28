import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const controlDensityClasses = {
  compact:
    "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
  comfortable:
    "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm transition-all focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500",
} as const;

export function getFormControlClassName({
  error,
  density = "compact",
  className,
}: {
  error?: string;
  density?: keyof typeof controlDensityClasses;
  className?: string;
}) {
  return cn(
    controlDensityClasses[density],
    error &&
      "border-red-300 text-red-900 placeholder:text-red-300 focus:border-red-500 focus:ring-red-200",
    className,
  );
}

type NativeFieldProps =
  | (InputHTMLAttributes<HTMLInputElement> & { as?: "input" })
  | (TextareaHTMLAttributes<HTMLTextAreaElement> & { as: "textarea" })
  | (SelectHTMLAttributes<HTMLSelectElement> & { as: "select" });

interface FormFieldOption {
  label: string;
  value: string;
}

interface SharedProps {
  label: ReactNode;
  error?: string;
  required?: boolean;
  description?: ReactNode;
  children?: ReactNode;
  containerClassName?: string;
  labelClassName?: string;
  controlClassName?: string;
  density?: keyof typeof controlDensityClasses;
  options?: FormFieldOption[];
}

type FormFieldProps = SharedProps & NativeFieldProps;

export function FormField({
  as = "input",
  label,
  error,
  required,
  description,
  children,
  containerClassName,
  labelClassName,
  controlClassName,
  density = "compact",
  options,
  ...props
}: FormFieldProps) {
  const fieldId =
    "id" in props && props.id
      ? props.id
      : "name" in props && typeof props.name === "string"
        ? props.name
        : undefined;
  const errorId = fieldId ? `${fieldId}-error` : undefined;
  const descriptionId = fieldId ? `${fieldId}-description` : undefined;
  const describedBy = [description ? descriptionId : undefined, error ? errorId : undefined]
    .filter(Boolean)
    .join(" ");

  let control = children;

  if (!control) {
    const sharedProps = {
      ...props,
      id: fieldId,
      "aria-invalid": Boolean(error),
      "aria-describedby": describedBy || undefined,
      className: getFormControlClassName({
        error,
        density,
        className: controlClassName,
      }),
    };

    if (as === "textarea") {
      control = (
        <textarea
          {...(sharedProps as TextareaHTMLAttributes<HTMLTextAreaElement>)}
        />
      );
    } else if (as === "select") {
      control = (
        <select
          {...(sharedProps as SelectHTMLAttributes<HTMLSelectElement>)}
        >
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    } else {
      control = (
        <input
          {...(sharedProps as InputHTMLAttributes<HTMLInputElement>)}
        />
      );
    }
  }

  return (
    <div className={containerClassName}>
      <label
        htmlFor={fieldId}
        className={cn("mb-1 block text-sm font-medium text-slate-700", labelClassName)}
      >
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {control}
      {description && (
        <p
          id={descriptionId}
          className="mt-1.5 text-xs text-slate-500"
        >
          {description}
        </p>
      )}
      {error && (
        <p
          id={errorId}
          className="mt-1.5 text-sm text-red-600"
        >
          {error}
        </p>
      )}
    </div>
  );
}
