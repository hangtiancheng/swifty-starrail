import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
          <div className="max-w-md rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-2 text-lg text-red-600">应用出错</h2>
            <p className="mb-4 text-sm text-gray-600">
              {this.state.error.message}
            </p>
            <button
              className="rounded bg-purple-500 px-4 py-2 text-sm text-white hover:bg-purple-600"
              onClick={() => this.setState({ error: null })}
            >
              重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
