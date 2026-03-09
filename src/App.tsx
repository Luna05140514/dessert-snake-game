import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Pause, Play, RotateCcw, Trophy } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Point = { x: number; y: number };
type DessertType = 'cookie' | 'cake' | 'candy';
type Food = Point & { type: DessertType };

const GRID_SIZE = 20;
const INITIAL_SNAKE: Point[] = [
  { x: 10, y: 10 },
  { x: 10, y: 11 },
  { x: 10, y: 12 },
];
const INITIAL_DIRECTION: Point = { x: 0, y: -1 };
const INITIAL_SPEED = 150;

const DESSERTS: DessertType[] = ['cookie', 'cake', 'candy'];
const DESSERT_EMOJIS: Record<DessertType, string> = {
  cookie: '🧇',
  cake: '🍰',
  candy: '🍬',
};

export default function App() {
  const [snake, setSnake] = useState<Point[]>(INITIAL_SNAKE);
  const [direction, setDirection] = useState<Point>(INITIAL_DIRECTION);
  const [foods, setFoods] = useState<Food[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [speed, setSpeed] = useState(INITIAL_SPEED);

  const gameLoopRef = useRef<number | null>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<Point | null>(null);
  const directionRef = useRef<Point>(INITIAL_DIRECTION);

  // Keep directionRef in sync with direction state
  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  // Native event listeners to handle touch properly on iPad/iOS
  useEffect(() => {
    const container = gameContainerRef.current;
    if (!container) return;

    const handleCanvasInteraction = (clientX: number, clientY: number) => {
      const canvas = canvasRef.current;
      if (!canvas || isPaused || isGameOver) return;

      const rect = canvas.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      // Convert to grid coordinates
      const gridX = Math.floor((x / rect.width) * GRID_SIZE);
      const gridY = Math.floor((y / rect.height) * GRID_SIZE);

      const head = snake[0];
      const diffX = gridX - head.x;
      const diffY = gridY - head.y;

      // Decide direction based on which axis has more distance
      if (Math.abs(diffX) > Math.abs(diffY)) {
        if (diffX > 0 && directionRef.current.x === 0) setDirection({ x: 1, y: 0 });
        else if (diffX < 0 && directionRef.current.x === 0) setDirection({ x: -1, y: 0 });
        else if (diffY > 0 && directionRef.current.y === 0) setDirection({ x: 0, y: 1 });
        else if (diffY < 0 && directionRef.current.y === 0) setDirection({ x: 0, y: -1 });
      } else {
        if (diffY > 0 && directionRef.current.y === 0) setDirection({ x: 0, y: 1 });
        else if (diffY < 0 && directionRef.current.y === 0) setDirection({ x: 0, y: -1 });
        else if (diffX > 0 && directionRef.current.x === 0) setDirection({ x: 1, y: 0 });
        else if (diffX < 0 && directionRef.current.x === 0) setDirection({ x: -1, y: 0 });
      }
    };

    const handleNativeTouchStart = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
      const touch = e.touches[0];
      touchStartRef.current = { x: touch.clientX, y: touch.clientY };
      handleCanvasInteraction(touch.clientX, touch.clientY);
    };

    const handleNativeTouchMove = (e: TouchEvent) => {
      if (e.cancelable) e.preventDefault();
    };

    const handleNativeTouchEnd = (e: TouchEvent) => {
      if (!touchStartRef.current) return;

      const touch = e.changedTouches[0];
      const deltaX = touch.clientX - touchStartRef.current.x;
      const deltaY = touch.clientY - touchStartRef.current.y;
      const minSwipeDistance = 30;

      if (Math.abs(deltaX) > minSwipeDistance || Math.abs(deltaY) > minSwipeDistance) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          if (deltaX > 0 && directionRef.current.x === 0) setDirection({ x: 1, y: 0 });
          else if (deltaX < 0 && directionRef.current.x === 0) setDirection({ x: -1, y: 0 });
        } else {
          if (deltaY > 0 && directionRef.current.y === 0) setDirection({ x: 0, y: 1 });
          else if (deltaY < 0 && directionRef.current.y === 0) setDirection({ x: 0, y: -1 });
        }
      }
      touchStartRef.current = null;
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') {
        handleCanvasInteraction(e.clientX, e.clientY);
      }
    };

    container.addEventListener('touchstart', handleNativeTouchStart, { passive: false });
    container.addEventListener('touchmove', handleNativeTouchMove, { passive: false });
    container.addEventListener('touchend', handleNativeTouchEnd, { passive: false });
    container.addEventListener('pointerdown', handlePointerDown);

    return () => {
      container.removeEventListener('touchstart', handleNativeTouchStart);
      container.removeEventListener('touchmove', handleNativeTouchMove);
      container.removeEventListener('touchend', handleNativeTouchEnd);
      container.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isPaused, isGameOver, snake]);

  const generateFood = useCallback((currentSnake: Point[], currentFoods: Food[] = []): Food => {
    let newFood: Point;
    while (true) {
      newFood = {
        x: Math.floor(Math.random() * GRID_SIZE),
        y: Math.floor(Math.random() * GRID_SIZE),
      };
      const onSnake = currentSnake.some(segment => segment.x === newFood.x && segment.y === newFood.y);
      const onFood = currentFoods.some(f => f.x === newFood.x && f.y === newFood.y);
      if (!onSnake && !onFood) {
        break;
      }
    }
    const type = DESSERTS[Math.floor(Math.random() * DESSERTS.length)];
    return { ...newFood, type };
  }, []);

  const resetGame = () => {
    // Reset timer to prevent immediate jump
    lastUpdateTimeRef.current = 0;
    
    // Reset direction ref immediately for touch logic
    directionRef.current = INITIAL_DIRECTION;
    
    setSnake(INITIAL_SNAKE);
    setDirection(INITIAL_DIRECTION);
    setScore(0);
    setIsPaused(false);
    setIsGameOver(false);
    setSpeed(INITIAL_SPEED);
    
    const initialFoods: Food[] = [];
    for (let i = 0; i < 10; i++) {
      initialFoods.push(generateFood(INITIAL_SNAKE, initialFoods));
    }
    setFoods(initialFoods);
  };

  useEffect(() => {
    const initialFoods: Food[] = [];
    for (let i = 0; i < 10; i++) {
      initialFoods.push(generateFood(INITIAL_SNAKE, initialFoods));
    }
    setFoods(initialFoods);
    const savedHighScore = localStorage.getItem('snakeHighScore');
    if (savedHighScore) setHighScore(parseInt(savedHighScore));
  }, [generateFood]);

  const moveSnake = useCallback(() => {
    if (isPaused || isGameOver) return;

    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = {
        x: (head.x + direction.x + GRID_SIZE) % GRID_SIZE,
        y: (head.y + direction.y + GRID_SIZE) % GRID_SIZE,
      };

      // Check collision with self
      if (prevSnake.some(segment => segment.x === newHead.x && segment.y === newHead.y)) {
        setIsGameOver(true);
        if (score > highScore) {
          setHighScore(score);
          localStorage.setItem('snakeHighScore', score.toString());
        }
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check collision with any food
      const foodIndex = foods.findIndex(f => f.x === newHead.x && f.y === newHead.y);
      if (foodIndex !== -1) {
        setScore(s => s + 10);
        const newFoods = [...foods];
        newFoods.splice(foodIndex, 1);
        newFoods.push(generateFood(newSnake, newFoods));
        setFoods(newFoods);
        setSpeed(prev => Math.max(prev - 2, 80)); // Increase speed
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [direction, foods, generateFood, isGameOver, isPaused, score, highScore]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (direction.y === 0) setDirection({ x: 0, y: -1 });
          break;
        case 'ArrowDown':
          if (direction.y === 0) setDirection({ x: 0, y: 1 });
          break;
        case 'ArrowLeft':
          if (direction.x === 0) setDirection({ x: -1, y: 0 });
          break;
        case 'ArrowRight':
          if (direction.x === 0) setDirection({ x: 1, y: 0 });
          break;
        case ' ':
          setIsPaused(p => !p);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [direction]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!lastUpdateTimeRef.current) lastUpdateTimeRef.current = timestamp;
    const deltaTime = timestamp - lastUpdateTimeRef.current;

    if (deltaTime > speed) {
      moveSnake();
      lastUpdateTimeRef.current = timestamp;
    }

    gameLoopRef.current = requestAnimationFrame(gameLoop);
  }, [moveSnake, speed]);

  useEffect(() => {
    gameLoopRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (gameLoopRef.current) cancelAnimationFrame(gameLoopRef.current);
    };
  }, [gameLoop]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const cellSize = canvas.width / GRID_SIZE;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (subtle)
    ctx.strokeStyle = '#f0f0f0';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(canvas.width, i * cellSize);
      ctx.stroke();
    }

    // Draw foods
    ctx.font = `${cellSize * 1.5}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    foods.forEach(food => {
      ctx.fillText(
        DESSERT_EMOJIS[food.type],
        food.x * cellSize + cellSize / 2,
        food.y * cellSize + cellSize / 2
      );
    });

    // Draw snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.fillStyle = isHead ? '#4ade80' : '#86efac';
      
      // Rounded segments
      const x = segment.x * cellSize + 2;
      const y = segment.y * cellSize + 2;
      const size = cellSize - 4;
      const radius = 8;

      ctx.beginPath();
      ctx.roundRect(x, y, size, size, radius);
      ctx.fill();

      if (isHead) {
        // Draw cute big eyes
        const eyeSize = cellSize * 0.2;
        const eyeOffset = cellSize * 0.25;
        
        ctx.fillStyle = 'white';
        // Left eye
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();
        // Right eye
        ctx.beginPath();
        ctx.arc(x + size - eyeOffset, y + eyeOffset, eyeSize, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'black';
        // Pupils
        ctx.beginPath();
        ctx.arc(x + eyeOffset, y + eyeOffset, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(x + size - eyeOffset, y + eyeOffset, eyeSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  }, [snake, foods]);

  return (
    <div className="min-h-screen bg-pink-50 flex flex-col items-center justify-center p-4 font-sans text-slate-800">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-pink-200">
        {/* Header */}
        <div className="p-6 bg-pink-100 flex justify-between items-center border-b-4 border-pink-200">
          <div>
            <h1 className="text-2xl font-bold text-pink-600 flex items-center gap-2">
              甜點貪食蛇 🐍
            </h1>
            <p className="text-sm text-pink-400 font-medium">快去吃甜點吧！</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              disabled={isGameOver}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border-2 border-pink-200 text-pink-500 hover:bg-pink-50 transition-colors disabled:opacity-50"
              title={isPaused ? "繼續" : "暫停"}
            >
              {isPaused ? <Play size={24} fill="currentColor" /> : <Pause size={24} fill="currentColor" />}
            </button>
            <button
              onClick={resetGame}
              className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm border-2 border-pink-200 text-pink-500 hover:bg-pink-50 transition-colors"
              title="重新開始"
            >
              <RotateCcw size={24} />
            </button>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-2 justify-end text-pink-600 font-bold">
              <Trophy size={18} />
              <span>{highScore}</span>
            </div>
            <div className="text-3xl font-black text-pink-500">{score}</div>
          </div>
        </div>

        {/* Game Area */}
        <div 
          ref={gameContainerRef}
          className="relative aspect-square p-4 bg-white touch-none select-none"
        >
          <canvas
            ref={canvasRef}
            width={400}
            height={400}
            className="w-full h-full rounded-xl bg-slate-50 border-2 border-pink-100 touch-none"
          />

          {/* Overlays */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10"
              >
                <h2 className="text-4xl font-black text-pink-600 mb-2">遊戲結束!</h2>
                <p className="text-xl font-bold text-slate-600 mb-6">得分: {score}</p>
                <button
                  onClick={resetGame}
                  className="w-100 h-12 flex items-center justify-center bg-pink rounded-xl shadow-sm border-2 border-pink-200 text-pink-500 hover:bg-pink-100 transition-colors"
              title="重新開始"
                >
                  <RotateCcw size={20} /> 再玩一次
                </button>
              </motion.div>
            )}

            {isPaused && !isGameOver && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex items-center justify-center bg-pink-50/40 backdrop-blur-[2px] z-10"
              >
                <div className="bg-white p-6 rounded-full shadow-2xl border-4 border-pink-200">
                  <Play size={48} className="text-pink-500 fill-pink-500" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Controls Info */}
        <div className="p-4 bg-pink-50 flex justify-center items-center border-t-4 border-pink-200">
          <div className="text-xs text-pink-400 font-bold uppercase tracking-widest text-center">
            點擊畫面或滑動控制方向 | 空白鍵暫停
          </div>
        </div>
      </div>

      {/* Touch Controls for Mobile/Tablet */}
      <div className="mt-8 grid grid-cols-3 gap-2 lg:hidden">
        <div />
        <button 
          onClick={() => direction.y === 0 && setDirection({ x: 0, y: -1 })}
          className="w-16 h-16 bg-white rounded-2xl shadow-lg border-2 border-pink-200 flex items-center justify-center text-pink-500 active:bg-pink-100 touch-manipulation"
        >
          ↑
        </button>
        <div />
        <button 
          onClick={() => direction.x === 0 && setDirection({ x: -1, y: 0 })}
          className="w-16 h-16 bg-white rounded-2xl shadow-lg border-2 border-pink-200 flex items-center justify-center text-pink-500 active:bg-pink-100 touch-manipulation"
        >
          ←
        </button>
        <button 
          onClick={() => direction.y === 0 && setDirection({ x: 0, y: 1 })}
          className="w-16 h-16 bg-white rounded-2xl shadow-lg border-2 border-pink-200 flex items-center justify-center text-pink-500 active:bg-pink-100 touch-manipulation"
        >
          ↓
        </button>
        <button 
          onClick={() => direction.x === 0 && setDirection({ x: 1, y: 0 })}
          className="w-16 h-16 bg-white rounded-2xl shadow-lg border-2 border-pink-200 flex items-center justify-center text-pink-500 active:bg-pink-100 touch-manipulation"
        >
          →
        </button>
      </div>
    </div>
  );
}
