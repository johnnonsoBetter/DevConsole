/**
 * useReactionsChannel Hook
 * Real-time reactions and hand raising using LiveKit's data channel
 * Syncs reactions and raised hands across all participants
 */

import { useDataChannel, useLocalParticipant } from "@livekit/components-react";
import { useCallback, useEffect, useState } from "react";

// Topics for data channel messages
export const DATA_TOPICS = {
  REACTION: "reaction",
  HAND_RAISE: "hand-raise",
} as const;

// Reaction types using Lucide icon names
export type ReactionType =
  | "thumbs-up"
  | "heart"
  | "party-popper"
  | "laugh"
  | "fire"
  | "clap"
  | "sparkles"
  | "check";

export interface ReactionMessage {
  type: "reaction";
  reaction: ReactionType;
  participantId: string;
  participantName: string;
  timestamp: number;
}

export interface HandRaiseMessage {
  type: "hand-raise";
  action: "raise" | "lower";
  participantId: string;
  participantName: string;
  timestamp: number;
}

export type DataChannelMessage = ReactionMessage | HandRaiseMessage;

export interface FloatingReaction {
  id: string;
  reaction: ReactionType;
  participantId: string;
  participantName: string;
  x: number;
  timestamp: number;
}

export interface RaisedHand {
  participantId: string;
  participantName: string;
  raisedAt: number;
}

/**
 * Hook to manage real-time reactions via LiveKit data channel
 */
export function useReactionsChannel() {
  const { localParticipant } = useLocalParticipant();
  const [reactions, setReactions] = useState<FloatingReaction[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);

  // Data channel for reactions
  const { send: sendReaction } = useDataChannel<typeof DATA_TOPICS.REACTION>(
    DATA_TOPICS.REACTION,
    (msg) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(decoder.decode(msg.payload)) as ReactionMessage;

        // Add to floating reactions
        const newReaction: FloatingReaction = {
          id: `${data.participantId}-${data.timestamp}`,
          reaction: data.reaction,
          participantId: data.participantId,
          participantName: data.participantName,
          x: 20 + Math.random() * 60,
          timestamp: data.timestamp,
        };

        setReactions((prev) => [...prev, newReaction]);
      } catch (error) {
        console.error("Failed to parse reaction message:", error);
      }
    }
  );

  // Data channel for hand raising
  const { send: sendHandRaise } = useDataChannel<typeof DATA_TOPICS.HAND_RAISE>(
    DATA_TOPICS.HAND_RAISE,
    (msg) => {
      try {
        const decoder = new TextDecoder();
        const data = JSON.parse(
          decoder.decode(msg.payload)
        ) as HandRaiseMessage;

        if (data.action === "raise") {
          setRaisedHands((prev) => {
            // Don't add duplicate
            if (prev.some((h) => h.participantId === data.participantId)) {
              return prev;
            }
            return [
              ...prev,
              {
                participantId: data.participantId,
                participantName: data.participantName,
                raisedAt: data.timestamp,
              },
            ];
          });
        } else {
          setRaisedHands((prev) =>
            prev.filter((h) => h.participantId !== data.participantId)
          );
        }
      } catch (error) {
        console.error("Failed to parse hand raise message:", error);
      }
    }
  );

  // Clean up old reactions after animation
  useEffect(() => {
    const cleanup = setInterval(() => {
      const now = Date.now();
      setReactions((prev) => prev.filter((r) => now - r.timestamp < 4000));
    }, 1000);

    return () => clearInterval(cleanup);
  }, []);

  // Send a reaction
  const sendReactionMessage = useCallback(
    (reaction: ReactionType) => {
      const message: ReactionMessage = {
        type: "reaction",
        reaction,
        participantId: localParticipant.identity,
        participantName: localParticipant.name || "You",
        timestamp: Date.now(),
      };

      const encoder = new TextEncoder();
      sendReaction(encoder.encode(JSON.stringify(message)), { reliable: true });

      // Also add to local state for immediate feedback
      const newReaction: FloatingReaction = {
        id: `${message.participantId}-${message.timestamp}`,
        reaction: message.reaction,
        participantId: message.participantId,
        participantName: message.participantName,
        x: 20 + Math.random() * 60,
        timestamp: message.timestamp,
      };
      setReactions((prev) => [...prev, newReaction]);
    },
    [localParticipant.identity, localParticipant.name, sendReaction]
  );

  // Toggle hand raise
  const toggleHandRaise = useCallback(() => {
    const isRaised = raisedHands.some(
      (h) => h.participantId === localParticipant.identity
    );

    const message: HandRaiseMessage = {
      type: "hand-raise",
      action: isRaised ? "lower" : "raise",
      participantId: localParticipant.identity,
      participantName: localParticipant.name || "You",
      timestamp: Date.now(),
    };

    const encoder = new TextEncoder();
    sendHandRaise(encoder.encode(JSON.stringify(message)), { reliable: true });

    // Update local state immediately
    if (isRaised) {
      setRaisedHands((prev) =>
        prev.filter((h) => h.participantId !== localParticipant.identity)
      );
    } else {
      setRaisedHands((prev) => [
        ...prev,
        {
          participantId: localParticipant.identity,
          participantName: localParticipant.name || "You",
          raisedAt: Date.now(),
        },
      ]);
    }
  }, [
    localParticipant.identity,
    localParticipant.name,
    raisedHands,
    sendHandRaise,
  ]);

  // Lower own hand
  const lowerHand = useCallback(() => {
    const message: HandRaiseMessage = {
      type: "hand-raise",
      action: "lower",
      participantId: localParticipant.identity,
      participantName: localParticipant.name || "You",
      timestamp: Date.now(),
    };

    const encoder = new TextEncoder();
    sendHandRaise(encoder.encode(JSON.stringify(message)), { reliable: true });

    setRaisedHands((prev) =>
      prev.filter((h) => h.participantId !== localParticipant.identity)
    );
  }, [localParticipant.identity, localParticipant.name, sendHandRaise]);

  // Remove a reaction (for animation completion)
  const removeReaction = useCallback((id: string) => {
    setReactions((prev) => prev.filter((r) => r.id !== id));
  }, []);

  // Check if local user has hand raised
  const isLocalHandRaised = raisedHands.some(
    (h) => h.participantId === localParticipant.identity
  );

  return {
    // Reactions
    reactions,
    sendReaction: sendReactionMessage,
    removeReaction,

    // Raised hands
    raisedHands,
    toggleHandRaise,
    lowerHand,
    isLocalHandRaised,

    // Participant info
    localParticipantId: localParticipant.identity,
  };
}
