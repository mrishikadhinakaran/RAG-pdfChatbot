import React from 'react';

interface MessageProps {
  role: "user" | "assistant";
  content: string;
}

export default function Message({ role, content }: MessageProps) {
  return (
    <div
      className={`p-3 rounded-2xl my-2 max-w-[80%] ${
        role === "user"
          ? "bg-blue-500 text-white self-end"
          : "bg-gray-200 text-black self-start"
      }`}
    >
      {content}
    </div>
  );
}