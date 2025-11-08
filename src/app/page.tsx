"use client";
import React, { useState, useEffect, useRef } from "react";
import { Wallet, Users, Coins, Shield, Zap } from "lucide-react";

// Type definitions
type Choice = 0 | 1 | 2; // None, Split, Steal
type GameState = 0 | 1 | 2 | 3; // Waiting, Committed, Revealed, Finished

interface GameData {
  betAmount: string;
  playerA: string;
  playerB: string;
  state: GameState;
  playerACommitted: boolean;
  playerBCommitted: boolean;
  playerARevealed: boolean;
  playerBRevealed: boolean;
}

// Contract configuration
const CONTRACT_ADDRESS = "0x7c6D5E192dFD56607eC7837813e22114641c8249";
const WS_RPC_URL =
  "wss://base-sepolia.g.alchemy.com/v2/OtS13aQpEcgBt0NB4GOe4VxQJH8gcvk_";
const CONTRACT_ABI = [
  "function createGame(uint256 betAmount) external payable returns (uint256)",
  "function joinGame(uint256 gameId) external payable",
  "function commitChoice(uint256 gameId, bytes32 commitment) external",
  "function revealChoice(uint256 gameId, uint8 choice, bytes32 salt) external",
  "function getGame(uint256 gameId) external view returns (uint256,address,address,uint8,bool,bool,bool,bool)",
  "function generateCommitment(uint8 choice, bytes32 salt) external pure returns (bytes32)",
  "function getPlayerActiveGame(address player) external view returns (uint256)",
  "event GameCreated(uint256 indexed gameId, address indexed creator, uint256 betAmount)",
  "event PlayerJoined(uint256 indexed gameId, address indexed player)",
  "event ChoiceCommitted(uint256 indexed gameId, address indexed player)",
  "event ChoiceRevealed(uint256 indexed gameId, address indexed player, uint8 choice)",
  "event GameFinished(uint256 indexed gameId, address playerA, address playerB, uint8 choiceA, uint8 choiceB, uint256 payoutA, uint256 payoutB)",
];

// Utility functions
const isInFrame = () => {
  try {
    return (
      window.self !== window.top ||
      window.location !== window.parent.location ||
      document.referrer.includes("warpcast") ||
      document.referrer.includes("farcaster")
    );
  } catch {
    return true;
  }
};

const shortenAddress = (address: string) => {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// WebSocket Hook
const useWebSocketContract = (
  gameId: number | null,
  onEvent: (event: any) => void
) => {
  const wsRef = useRef<any>(null);
  const contractRef = useRef<any>(null);

  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      try {
        const ethers = await import("ethers");
        const wsProvider = new ethers.WebSocketProvider(WS_RPC_URL);
        wsRef.current = wsProvider;

        const contract = new ethers.Contract(
          CONTRACT_ADDRESS,
          CONTRACT_ABI,
          wsProvider
        );
        contractRef.current = contract;

        if (gameId) {
          // Listen to all game events
          const gameFilter = contract.filters.GameCreated(gameId);
          const joinFilter = contract.filters.PlayerJoined(gameId);
          const commitFilter = contract.filters.ChoiceCommitted(gameId);
          const revealFilter = contract.filters.ChoiceRevealed(gameId);
          const finishFilter = contract.filters.GameFinished(gameId);

          contract.on(joinFilter, (...args) => {
            if (mounted) onEvent({ type: "PlayerJoined", args });
          });

          contract.on(commitFilter, (...args) => {
            if (mounted) onEvent({ type: "ChoiceCommitted", args });
          });

          contract.on(revealFilter, (...args) => {
            if (mounted) onEvent({ type: "ChoiceRevealed", args });
          });

          contract.on(finishFilter, (...args) => {
            if (mounted) onEvent({ type: "GameFinished", args });
          });
        }
      } catch (error) {
        console.error("WebSocket setup error:", error);
      }
    };

    setupWebSocket();

    return () => {
      mounted = false;
      if (wsRef.current) {
        wsRef.current.removeAllListeners();
        wsRef.current.destroy();
      }
    };
  }, [gameId]);

  return contractRef.current;
};

// Connect Wallet Component
const ConnectWallet: React.FC<{
  onConnect: (address: string, provider: any) => void;
}> = ({ onConnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const inFrame = isInFrame();

  const connectWallet = async () => {
    setIsConnecting(true);
    try {
      if (inFrame) {
        if (typeof window.ethereum !== "undefined") {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          onConnect(accounts[0], window.ethereum);
        }
      } else {
        if (typeof window.ethereum !== "undefined") {
          const accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
          onConnect(accounts[0], window.ethereum);
        } else {
          alert("Please install MetaMask or use a Web3 browser");
        }
      }
    } catch (error) {
      console.error("Connection error:", error);
      alert("Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-500 rounded-2xl mb-6 shadow-lg shadow-purple-500/50">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">Split or Steal</h1>
          <p className="text-purple-200 text-lg">
            Trust or betray. Choose wisely.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 shadow-2xl">
          <div className="space-y-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Coins className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Win Big</h3>
                <p className="text-purple-200 text-sm">
                  Both split? Share the pot. One steals? Winner takes all.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-purple-300" />
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Trustless</h3>
                <p className="text-purple-200 text-sm">
                  Smart contract ensures fair play. No cheating possible.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Wallet className="w-5 h-5" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Game Lobby Component
const GameLobby: React.FC<{
  address: string;
  provider: any;
  onGameStart: (gameId: number, isCreator: boolean) => void;
}> = ({ address, provider, onGameStart }) => {
  const [mode, setMode] = useState<"select" | "create" | "join">("select");
  const [betAmount, setBetAmount] = useState("0.001");
  const [gameId, setGameId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const createGame = async () => {
    setIsLoading(true);
    try {
      const ethers = await import("ethers");
      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const betAmountWei = ethers.parseEther(betAmount);
      const tx = await contract.createGame(betAmountWei, {
        value: betAmountWei,
      });
      const receipt = await tx.wait();

      // Find GameCreated event
      const event = receipt.logs.find((log: any) => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed?.name === "GameCreated";
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        const createdGameId = Number(parsed?.args[0]);
        onGameStart(createdGameId, true);
      }
    } catch (error) {
      console.error("Create game error:", error);
      alert("Failed to create game");
    } finally {
      setIsLoading(false);
    }
  };

  const joinGame = async () => {
    setIsLoading(true);
    try {
      const ethers = await import("ethers");
      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const gameData = await contract.getGame(gameId);
      const betAmountWei = gameData[0];

      const tx = await contract.joinGame(gameId, { value: betAmountWei });
      await tx.wait();

      onGameStart(Number(gameId), false);
    } catch (error) {
      console.error("Join game error:", error);
      alert("Failed to join game");
    } finally {
      setIsLoading(false);
    }
  };

  if (mode === "select") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <div className="inline-block px-4 py-2 bg-purple-500/20 rounded-full border border-purple-500/30 mb-4">
              <p className="text-purple-200 text-sm">
                {shortenAddress(address)}
              </p>
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">
              Ready to Play?
            </h2>
            <p className="text-purple-200">Choose your path</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode("create")}
              className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Coins className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    Create Game
                  </h3>
                  <p className="text-purple-200 text-sm">
                    Set the stakes and wait for an opponent
                  </p>
                </div>
              </div>
            </button>

            <button
              onClick={() => setMode("join")}
              className="w-full bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl p-6 hover:bg-white/15 transition-all text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-white font-semibold text-lg mb-1">
                    Join Game
                  </h3>
                  <p className="text-purple-200 text-sm">
                    Enter a game ID to challenge someone
                  </p>
                </div>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (mode === "create") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <button
            onClick={() => setMode("select")}
            className="text-purple-200 mb-6 hover:text-white transition-colors"
          >
            ← Back
          </button>

          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-white mb-6">Create Game</h2>

            <div className="mb-6">
              <label className="block text-purple-200 text-sm mb-2">
                Bet Amount (ETH)
              </label>
              <input
                type="number"
                step="0.001"
                value={betAmount}
                onChange={(e) => setBetAmount(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
                placeholder="0.001"
              />
            </div>

            <button
              onClick={createGame}
              disabled={isLoading || !betAmount || parseFloat(betAmount) <= 0}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Creating..." : "Create Game"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={() => setMode("select")}
          className="text-purple-200 mb-6 hover:text-white transition-colors"
        >
          ← Back
        </button>

        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6">Join Game</h2>

          <div className="mb-6">
            <label className="block text-purple-200 text-sm mb-2">
              Game ID
            </label>
            <input
              type="text"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-purple-300/50 focus:outline-none focus:border-purple-500"
              placeholder="Enter game ID"
            />
          </div>

          <button
            onClick={joinGame}
            disabled={isLoading || !gameId}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-blue-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "Joining..." : "Join Game"}
          </button>
        </div>
      </div>
    </div>
  );
};

// Game Play Component
const GamePlay: React.FC<{
  gameId: number;
  address: string;
  provider: any;
  isCreator: boolean;
}> = ({ gameId, address, provider, isCreator }) => {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [selectedChoice, setSelectedChoice] = useState<Choice | null>(null);
  const [salt, setSalt] = useState<string>("");
  const [phase, setPhase] = useState<
    "waiting" | "commit" | "reveal" | "result"
  >("waiting");
  const [isLoading, setIsLoading] = useState(false);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [gameResult, setGameResult] = useState<{
    playerAChoice?: number;
    playerBChoice?: number;
    winner?: string;
    payoutA?: string;
    payoutB?: string;
  } | null>(null);

  // WebSocket event handler
  // WebSocket event handler
  const handleEvent = async (event: any) => {
    console.log("Received event:", event);

    setEventLog((prev) => [
      ...prev,
      `${event.type} at ${new Date().toLocaleTimeString()}`,
    ]);

    // Always reload game data when any event is received
    await loadGameData();

    // If game finished event, also try to extract result from event
    if (event.type === "GameFinished") {
      try {
        const ethers = await import("ethers");
        const eventArgs = event.args || [];

        if (eventArgs.length >= 6) {
          // Skip first element (gameId) and get the rest
          const [
            gameIdFromEvent,
            playerA,
            playerB,
            choiceA,
            choiceB,
            payoutA,
            payoutB,
          ] = eventArgs;

          const payoutABigInt = payoutA
            ? BigInt(payoutA.toString())
            : BigInt(0);
          const payoutBBigInt = payoutB
            ? BigInt(payoutB.toString())
            : BigInt(0);

          const result = {
            playerAChoice: Number(choiceA) || 0,
            playerBChoice: Number(choiceB) || 0,
            winner:
              payoutABigInt > payoutBBigInt
                ? playerA
                : payoutBBigInt > payoutABigInt
                ? playerB
                : "tie",
            payoutA: ethers.formatEther(payoutABigInt),
            payoutB: ethers.formatEther(payoutBBigInt),
          };

          setGameResult(result);
        }
      } catch (error) {
        console.error("Error processing GameFinished event:", error);
      }
    }
  };
  // Use WebSocket hook
  useWebSocketContract(gameId, async (event: any) => {
    console.log("Received event:", event);
    if (event.type === "GameFinished") {
      try {
        const ethers = await import("ethers");
        const eventArgs = event.args || [];
        console.log("GameFinished event args:", eventArgs);

        if (eventArgs.length >= 7) {
          const [gameId, playerA, playerB, choiceA, choiceB, payoutA, payoutB] =
            eventArgs;

          // Parse choices as numbers from Choice enum (1 = Split, 2 = Steal)
          const choiceANum = Number(choiceA);
          const choiceBNum = Number(choiceB);

          // Determine winner based on the game logic
          let winner;
          if (choiceANum === 1 && choiceBNum === 1) {
            winner = "tie"; // Both split
          } else if (choiceANum === 2 && choiceBNum === 2) {
            winner = "none"; // Both steal - goes to charity
          } else if (choiceANum === 1 && choiceBNum === 2) {
            winner = playerB; // A split, B steal
          } else if (choiceANum === 2 && choiceBNum === 1) {
            winner = playerA; // A steal, B split
          }

          // Handle payouts
          const payoutABigInt = BigInt(payoutA?.toString() || "0");
          const payoutBBigInt = BigInt(payoutB?.toString() || "0");

          setGameResult({
            playerAChoice: choiceANum,
            playerBChoice: choiceBNum,
            winner,
            payoutA: ethers.formatEther(payoutABigInt),
            payoutB: ethers.formatEther(payoutBBigInt),
          });
        }
      } catch (error) {
        console.error("Error processing GameFinished event:", error);
        loadGameData();
      }
    }
    setEventLog((prev) => [
      ...prev,
      `${event.type} at ${new Date().toLocaleTimeString()}`,
    ]);
    loadGameData();
  });

  useEffect(() => {
    loadGameData();
  }, [gameId]);

  const loadGameData = async () => {
    try {
      const ethers = await import("ethers");
      const web3Provider = new ethers.BrowserProvider(provider);
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        web3Provider
      );

      const data = await contract.getGame(gameId);
      const gameState: GameData = {
        betAmount: ethers.formatEther(data[0]),
        playerA: data[1],
        playerB: data[2],
        state: data[3],
        playerACommitted: data[4],
        playerBCommitted: data[5],
        playerARevealed: data[6],
        playerBRevealed: data[7],
      };

      setGameData(gameState);

      // Determine phase
      // Determine phase
      const noPlayerB =
        gameState.playerB === "0x0000000000000000000000000000000000000000";

      if (noPlayerB) {
        setPhase("waiting");
      } else if (gameState.state === 3) {
        // Game finished
        setPhase("result");
      } else if (gameState.state === 2) {
        // Reveal phase (state 2 = Revealed in contract)
        setPhase("result");
      } else if (gameState.state === 1) {
        // Both committed, waiting for reveals
        if (!gameState.playerARevealed || !gameState.playerBRevealed) {
          setPhase("reveal");
        } else {
          setPhase("result");
        }
      } else {
        // State 0 = Waiting (or both players just joined)
        // If both players exist and haven't both committed yet, go to commit phase
        if (!gameState.playerACommitted || !gameState.playerBCommitted) {
          setPhase("commit");
        } else if (!gameState.playerARevealed || !gameState.playerBRevealed) {
          setPhase("reveal");
        } else {
          setPhase("result");
        }
      }
    } catch (error) {
      console.error("Load game error:", error);
    }
  };

  const commitChoice = async () => {
    if (!selectedChoice) return;

    setIsLoading(true);
    try {
      const ethers = await import("ethers");
      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const randomSalt = ethers.hexlify(ethers.randomBytes(32));
      setSalt(randomSalt);

      const commitment = await contract.generateCommitment(
        selectedChoice,
        randomSalt
      );
      const tx = await contract.commitChoice(gameId, commitment);
      await tx.wait();

      // WebSocket will trigger update
    } catch (error) {
      console.error("Commit error:", error);
      alert("Failed to commit choice");
    } finally {
      setIsLoading(false);
    }
  };

  const revealChoice = async () => {
    setIsLoading(true);
    try {
      const ethers = await import("ethers");
      const web3Provider = new ethers.BrowserProvider(provider);
      const signer = await web3Provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer
      );

      const tx = await contract.revealChoice(gameId, selectedChoice, salt);
      await tx.wait();

      // WebSocket will trigger update
    } catch (error) {
      console.error("Reveal error:", error);
      alert("Failed to reveal choice");
    } finally {
      setIsLoading(false);
    }
  };

  if (!gameData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white">Loading game...</div>
      </div>
    );
  }

  const isPlayerA = address.toLowerCase() === gameData.playerA.toLowerCase();
  const hasCommitted = isPlayerA
    ? gameData.playerACommitted
    : gameData.playerBCommitted;
  const hasRevealed = isPlayerA
    ? gameData.playerARevealed
    : gameData.playerBRevealed;
  const opponentCommitted = isPlayerA
    ? gameData.playerBCommitted
    : gameData.playerACommitted;
  const opponentRevealed = isPlayerA
    ? gameData.playerBRevealed
    : gameData.playerARevealed;

  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <div className="w-16 h-16 bg-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
              <Users className="w-8 h-8 text-purple-300" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-4">
              Waiting for Opponent
            </h2>
            <p className="text-purple-200 mb-2">Share this Game ID:</p>
            <div className="bg-white/5 border border-white/10 rounded-xl px-6 py-4 mb-4">
              <p className="text-white font-mono text-2xl">{gameId}</p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 rounded-full border border-green-500/30">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-200 text-xs">
                WebSocket Connected
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "commit") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                Make Your Choice
              </h2>
              <p className="text-purple-200 text-sm">
                Choose wisely. This decision is final.
              </p>
            </div>

            {/* Status indicators */}
            <div className="flex gap-2 justify-center mb-6">
              <div
                className={`px-3 py-1 rounded-full text-xs ${
                  hasCommitted
                    ? "bg-green-500/20 border border-green-500/30 text-green-200"
                    : "bg-gray-500/20 border border-gray-500/30 text-gray-300"
                }`}
              >
                You {hasCommitted ? "✓" : "○"}
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs ${
                  opponentCommitted
                    ? "bg-green-500/20 border border-green-500/30 text-green-200"
                    : "bg-gray-500/20 border border-gray-500/30 text-gray-300"
                }`}
              >
                Opponent {opponentCommitted ? "✓" : "○"}
              </div>
            </div>

            {!hasCommitted ? (
              <>
                <div className="space-y-4 mb-6">
                  <button
                    onClick={() => setSelectedChoice(1)}
                    className={`w-full p-6 rounded-2xl border-2 transition-all ${
                      selectedChoice === 1
                        ? "bg-blue-500/20 border-blue-500"
                        : "bg-white/5 border-white/10 hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-white font-semibold text-lg">
                          Split
                        </h3>
                        <p className="text-purple-200 text-sm">
                          Cooperate and share the pot
                        </p>
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => setSelectedChoice(2)}
                    className={`w-full p-6 rounded-2xl border-2 transition-all ${
                      selectedChoice === 2
                        ? "bg-red-500/20 border-red-500"
                        : "bg-white/5 border-white/10 hover:border-red-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center">
                        <Zap className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <h3 className="text-white font-semibold text-lg">
                          Steal
                        </h3>
                        <p className="text-purple-200 text-sm">
                          Take it all... if they split
                        </p>
                      </div>
                    </div>
                  </button>
                </div>

                <button
                  onClick={commitChoice}
                  disabled={!selectedChoice || isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? "Committing..." : "Lock In Choice"}
                </button>
              </>
            ) : (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-300" />
                </div>
                <p className="text-white font-semibold mb-2">
                  Choice Committed
                </p>
                <p className="text-purple-200 text-sm mb-4">
                  Waiting for opponent...
                </p>
                {!opponentCommitted && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
            <h2 className="text-2xl font-bold text-white mb-4">Reveal Phase</h2>

            {/* Status indicators */}
            <div className="flex gap-2 justify-center mb-6">
              <div
                className={`px-3 py-1 rounded-full text-xs ${
                  hasRevealed
                    ? "bg-green-500/20 border border-green-500/30 text-green-200"
                    : "bg-gray-500/20 border border-gray-500/30 text-gray-300"
                }`}
              >
                You {hasRevealed ? "✓" : "○"}
              </div>
              <div
                className={`px-3 py-1 rounded-full text-xs ${
                  opponentRevealed
                    ? "bg-green-500/20 border border-green-500/30 text-green-200"
                    : "bg-gray-500/20 border border-gray-500/30 text-gray-300"
                }`}
              >
                Opponent {opponentRevealed ? "✓" : "○"}
              </div>
            </div>

            {!hasRevealed ? (
              <>
                <p className="text-purple-200 mb-6">
                  Both players have committed. Time to reveal!
                </p>
                <button
                  onClick={revealChoice}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all disabled:opacity-50"
                >
                  {isLoading ? "Revealing..." : "Reveal My Choice"}
                </button>
              </>
            ) : (
              <div>
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-8 h-8 text-green-300" />
                </div>
                <p className="text-white font-semibold mb-2">Choice Revealed</p>
                <p className="text-purple-200 text-sm mb-4">
                  Waiting for opponent to reveal...
                </p>
                {!opponentRevealed && (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 text-center">
          <h2 className="text-2xl font-bold text-white mb-6">Game Complete!</h2>

          <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
            {gameResult ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-white font-semibold mb-2">Results</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-purple-200 text-sm">Player A</p>
                      <p className="text-white font-semibold">
                        {gameResult.playerAChoice === 1 ? "Split" : "Steal"}
                      </p>
                      <p className="text-green-400 text-sm mt-1">
                        {gameResult.payoutA} ETH
                      </p>
                    </div>
                    <div>
                      <p className="text-purple-200 text-sm">Player B</p>
                      <p className="text-white font-semibold">
                        {gameResult.playerBChoice === 1 ? "Split" : "Steal"}
                      </p>
                      <p className="text-green-400 text-sm mt-1">
                        {gameResult.payoutB} ETH
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  {(() => {
                    if (gameResult.winner === "tie") {
                      return (
                        <div className="text-yellow-400">
                          <p className="font-bold text-lg mb-1">It's a tie!</p>
                          <p className="text-sm">
                            Both players chose to split. The pot was divided
                            equally.
                          </p>
                        </div>
                      );
                    } else if (gameResult.winner === "none") {
                      return (
                        <div className="text-red-400">
                          <p className="font-bold text-lg mb-1">No Winners!</p>
                          <p className="text-sm">
                            Both players chose to steal. The pot goes to
                            charity.
                          </p>
                        </div>
                      );
                    } else if (
                      gameResult.winner?.toLowerCase() === address.toLowerCase()
                    ) {
                      return (
                        <div className="text-green-400">
                          <p className="font-bold text-lg mb-1">🎉 You Won!</p>
                          <p className="text-sm">
                            {gameResult.playerAChoice === 2
                              ? "You stole while they split!"
                              : "They stole but you split - good karma!"}
                          </p>
                        </div>
                      );
                    } else {
                      return (
                        <div className="text-red-400">
                          <p className="font-bold text-lg mb-1">You Lost</p>
                          <p className="text-sm">
                            {gameResult.playerAChoice === 1
                              ? "You split but they stole!"
                              : "They split and you stole - bad karma!"}
                          </p>
                        </div>
                      );
                    }
                  })()}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-purple-400 rounded-full animate-bounce"
                  style={{ animationDelay: "0.4s" }}
                ></div>
                <p className="text-purple-200 ml-2">Calculating results...</p>
              </div>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-4 rounded-2xl hover:shadow-lg hover:shadow-purple-500/50 transition-all"
          >
            Play Again
          </button>
        </div>
      </div>
    </div>
  );
};

// Main App
export default function App() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [provider, setProvider] = useState<any>(null);
  const [currentGameId, setCurrentGameId] = useState<number | null>(null);
  const [isCreator, setIsCreator] = useState(false);

  const handleConnect = (address: string, prov: any) => {
    setWalletAddress(address);
    setProvider(prov);
  };

  const handleGameStart = (gameId: number, creator: boolean) => {
    setCurrentGameId(gameId);
    setIsCreator(creator);
  };

  if (!walletAddress) {
    return <ConnectWallet onConnect={handleConnect} />;
  }

  if (!currentGameId) {
    return (
      <GameLobby
        address={walletAddress}
        provider={provider}
        onGameStart={handleGameStart}
      />
    );
  }

  return (
    <GamePlay
      gameId={currentGameId}
      address={walletAddress}
      provider={provider}
      isCreator={isCreator}
    />
  );
}
