import React, { Component, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("Uncaught error in component tree:", error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
          <div className="glass-card flex max-w-md flex-col items-center p-6 shadow-2xl">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {this.props.fallbackTitle ?? "Something went wrong"}
            </h3>
            <p className="mt-2 text-xs text-muted-foreground">
              An error occurred while loading this view. The application recovered safely.
            </p>
            {this.state.error && (
              <div className="mt-3 w-full rounded-md border border-border bg-card/60 p-2.5 font-mono text-[11px] text-destructive/90 overflow-x-auto text-left">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}
            <div className="mt-5 flex gap-3">
              <Button size="sm" onClick={this.handleReset} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Reload View
              </Button>
              <Button size="sm" variant="outline" onClick={() => window.location.reload()}>
                Full Refresh
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
