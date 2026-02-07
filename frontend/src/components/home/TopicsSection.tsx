/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { X } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { Plus } from "lucide-react";

interface TopicsSectionProps {
  topics: any[];
  isAdminUser: boolean;
  loading: boolean;

  setShowNewTopicModal?: Dispatch<SetStateAction<boolean>>;
  setSelectedTopicId?: Dispatch<SetStateAction<number | null>>;
  setShowAddOptionModal?: Dispatch<SetStateAction<boolean>>;

  handleOpenTopic: (topicId: number) => void;
  handleRequestVote: (
    topicId: number,
    optionId: number,
    optionLabel: string,
  ) => void;
  handleCloseTopic: (topicId: number) => void;
}

export default function TopicsSection({
  topics,
  isAdminUser,
  loading,
  setShowNewTopicModal,
  setSelectedTopicId,
  setShowAddOptionModal,
  handleOpenTopic,
  handleRequestVote,
  handleCloseTopic,
}: TopicsSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-end  pt-4 mb-4">
        {isAdminUser && setShowNewTopicModal && (
          <button
            onClick={() => setShowNewTopicModal(true)}
            className="px-4 py-2 text-sm font-medium cursor-pointer bg-white text-black rounded hover:bg-white/80 disabled:opacity-50"
            disabled={loading}
          >
            + New Topic
          </button>
        )}
      </div>

      {topics.map((t) => (
        <div key={t.id} className="border border-white/10 bg-[#171717] rounded-lg p-4 mt-3">
          <p className="font-bold text-sm">{t.title}</p>

          <p className="text-sm text-[#a1a1a1] inline-block mt-2">
            Status: 
            <span className={`w-fit ml-2 rounded-full px-4 py-0.5 text-xs font-medium ${
              t.status === 0 ? 'bg-gray-400/20 text-gray-400' :
              t.status === 1 ? 'bg-green-500/10 text-green-600' :
              'bg-orange-500/20 text-orange-600'
            }`}>{t.statusLabel}</span>
          </p>

          {/* ============================================
              EARLY TOPIC STATE
              Styling: Early topic section with admin controls
              ============================================ */}
          {t.status === 0 && (
            <div className="mt-2 space-y-3">
              {t.options.length === 0 ? (
                <p className="text-sm text-gray-400 italic">
                  No voting options have been added yet.
                </p>
              ) : (
                <div className="text-sm text-white">
                  <p className="font-medium">Options:</p>
                  <ul className="list-decimal ml-5 text-[#a1a1a1]">
                    {t.options.map((o: any) => (
                      <li
                        key={o.id}
                        className="pt-2 cursor-pointer hover:underline"
                      >
                        {o.label}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {isAdminUser && (
                <div className="flex justify-end gap-2 border-t border-white/10 mt-4 pt-3">
                  <button
                    onClick={() => {
                      setSelectedTopicId(t.id);
                      setShowAddOptionModal(true);
                    }}
                    className="pr-4 pl-3 py-2 inline-flex items-center gap-1 cursor-pointer text-white border border-white/15 text-xs font-semibold rounded hover:bg-white/5 hover:border-white/5 disabled:opacity-50"
                    disabled={loading}
                  >
                    <Plus className="w-3 h-3 shrink-0" strokeWidth={3} />
                    <span>Add Option</span>
                  </button>
                  <button
                    onClick={() => handleOpenTopic(t.id)}
                    className="px-4 py-2 cursor-pointer bg-white text-black text-xs font-semibold rounded hover:not-disabled:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading || t.options.length < 2}
                  >
                    Open Topic {t.options.length < 2 && "(Add at least 2 options)"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================
              OPEN TOPIC STATE
              Styling: Voting buttons and member voting interface
              ============================================ */}
          {t.status === 1 && (
            <div className="flex flex-col gap-2 mt-3">
              {t.hasVoted && (
                <p className="text-sm">
                  You voted:{" "}
                  <span className="text-green-600 font-semibold">
                    {
                      t.options.find((o: any) => o.id === t.votedOptionId)
                        ?.label
                    }
                  </span>
                </p>
              )}

              <div className="flex gap-2">
                {t.options.map((option: any) => {
                  const isSelected = option.id === t.votedOptionId;

                  return (
                    <button
                      key={option.id}
                      disabled={t.hasVoted || !t.canVote}
                      onClick={() =>
                        handleRequestVote(t.id, option.id, option.label)
                      }
                      className={`px-4 py-2 text-sm text-white border rounded
    ${
      t.hasVoted || !t.canVote
        ? "cursor-not-allowed opacity-60 border-white/10"
        : "cursor-pointer hover:bg-white/10 border-white/10"
    }
    ${isSelected ? "font-bold bg-white/10" : ""}
  `}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {isAdminUser && (
                <div className="flex justify-end gap-2 border-t border-white/10 mt-4 pt-3">
                  <button
                    onClick={() => handleCloseTopic(t.id)}
                    className="pr-4 pl-3 py-2 inline-flex items-center gap-1 cursor-pointer bg-white text-black text-xs font-semibold rounded hover:not-disabled:bg-white/80 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 shrink-0 -mt-1" strokeWidth={3} />
                    <span>Close Topic</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ============================================
              CLOSED TOPIC STATE
              Styling: Results display with voting breakdown
              ============================================ */}
          {t.status === 2 && t.results && (
            <div className="mt-3 space-y-2">
              {t.results.map((r: any) => {
                const isUserChoice = r.optionId === t.votedOptionId;

                return (
                  <div key={r.optionId} className="mb-4">
                    <div className="flex mb-2 justify-between text-sm">
                      <span
                        className={
                          isUserChoice ? "font-medium text-green-500" : ""
                        }
                      >
                        {r.label}
                        {isUserChoice && " (your vote)"}
                      </span>
                      <span className={
                          isUserChoice ? "font-medium text-green-500" : ""
                        }>{r.percentage}%</span>
                    </div>

                    <div className="w-full h-3 bg-white/10 rounded-full">
                      <div
                        className={`h-3 rounded-full ${
                          isUserChoice ? "bg-white" : "bg-white"
                        }`}
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </section>
  );
}
