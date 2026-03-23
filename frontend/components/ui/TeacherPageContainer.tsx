import React from 'react';

interface TeacherPageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function TeacherPageContainer({ children, className = '' }: TeacherPageContainerProps) {
  return (
    <div className="w-full min-w-0 px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
      <div className={`mx-auto w-full max-w-[1600px] ${className}`.trim()}>{children}</div>
    </div>
  );
}
