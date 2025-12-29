
"use client";

import { useState, useEffect, useMemo } from "react";
import { getCountdownNotification } from "@/app/actions";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PlusCircle, Clock, RotateCcw } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

interface Timer {
    id: string;
    title: string;
    targetDate: Date;
}

const TimeBox = ({ value, label }: { value: string; label: string }) => (
  <div className="flex flex-col items-center justify-center bg-secondary p-4 rounded-lg w-20 h-20 sm:w-24 sm:h-24 shadow-inner transition-all duration-300">
    <span className="text-3xl sm:text-4xl font-bold text-primary font-headline tracking-tighter">
      {value}
    </span>
    <span className="text-xs sm:text-sm text-muted-foreground uppercase tracking-wider">
      {label}
    </span>
  </div>
);


const CountdownCard = ({ timer, onRemove }: { timer: Timer; onRemove: (id: string) => void }) => {
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const distance = timer.targetDate.getTime() - now.getTime();

      if (distance <= 0) {
        clearInterval(interval);
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        getCountdownNotification({
            targetDate: timer.targetDate.toISOString(),
            timeZone: timeZone,
            location: timeZone,
        }).then((res) => {
            setNotification(res.notificationMessage);
        });

      } else {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.targetDate]);

  const formattedTargetDate = useMemo(() => {
    return timer.targetDate.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }, [timer.targetDate]);

  return (
      <>
        <Card className="w-full shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl font-headline text-primary">{timer.title}</CardTitle>
                <CardDescription>
                    {isExpired ? "Countdown finished" : `Counting down to ${formattedTargetDate}`}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {timeLeft && !isExpired ? (
                    <div className="flex items-center justify-center gap-2 sm:gap-4">
                        <TimeBox value={String(timeLeft.days).padStart(2, "0")} label="Days" />
                        <TimeBox value={String(timeLeft.hours).padStart(2, "0")} label="Hours" />
                        <TimeBox value={String(timeLeft.minutes).padStart(2, "0")} label="Minutes" />
                        <TimeBox value={String(timeLeft.seconds).padStart(2, "0")} label="Seconds" />
                    </div>
                ) : (
                    <div className="text-center min-h-[96px] flex flex-col justify-center">
                        <p className="text-2xl font-bold text-destructive">Countdown Expired!</p>
                        <p className="text-muted-foreground">The target time has been reached.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                 <Button variant="outline" size="sm" onClick={() => onRemove(timer.id)}>
                    Remove
                </Button>
            </CardFooter>
        </Card>
        <AlertDialog open={!!notification}>
            <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle className="font-headline text-primary">{timer.title} - Complete!</AlertDialogTitle>
                <AlertDialogDescription>
                {notification}
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => {
                  setNotification(null);
                  onRemove(timer.id);
                }}>
                Awesome!
                </AlertDialogAction>
            </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </>
  );
};


export function CountdownTimer() {
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // State for date/time picker dialog
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState({ hour: "00", minute: "00", second: "00" });

  useEffect(() => {
    setIsMounted(true);
    const savedTimers = localStorage.getItem("timers");
    if (savedTimers) {
      try {
        const parsedTimers: any[] = JSON.parse(savedTimers);
        const validTimers = parsedTimers
          .map(t => ({...t, targetDate: new Date(t.targetDate)}))
          .filter(t => t.targetDate.getTime() > new Date().getTime());
        setTimers(validTimers);
      } catch(e) {
        console.error("Failed to parse timers from localStorage", e);
        localStorage.removeItem("timers");
      }
    }
  }, []);

  useEffect(() => {
    if (isMounted) {
      localStorage.setItem("timers", JSON.stringify(timers));
    }
  }, [timers, isMounted]);


  const handleOpenDialog = () => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0);
    d.setSeconds(0);
    setSelectedDate(d);
    setTime({
      hour: String(d.getHours()).padStart(2, "0"),
      minute: "00",
      second: "00",
    });
    setTitle("");
    setIsDialogOpen(true);
  };

  const handleAddTimer = () => {
    const newTarget = selectedDate ? new Date(selectedDate) : new Date();
    const now = new Date();
    
    newTarget.setHours(parseInt(time.hour, 10) || now.getHours());
    newTarget.setMinutes(parseInt(time.minute, 10) || now.getMinutes());
    newTarget.setSeconds(parseInt(time.second, 10) || now.getSeconds());
    newTarget.setMilliseconds(0);

    if (newTarget.getTime() > now.getTime() && title) {
      const newTimer: Timer = {
        id: new Date().getTime().toString(),
        title,
        targetDate: newTarget
      };
      setTimers(prev => [...prev, newTimer]);
    }
    setIsDialogOpen(false);
  };
  
  const handleRemoveTimer = (id: string) => {
    setTimers(prev => prev.filter(timer => timer.id !== id));
  };
  
  const handleTimeInputChange = (e: React.ChangeEvent<HTMLInputElement>, unit: 'hour' | 'minute' | 'second') => {
    const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 2);
    const max = unit === 'hour' ? 23 : 59;
    const numValue = parseInt(value, 10);
    const clampedValue = isNaN(numValue) ? '' : String(Math.min(numValue, max));

    setTime(prev => ({ ...prev, [unit]: clampedValue }));
  };

  const handleTimeBlur = (e: React.FocusEvent<HTMLInputElement>, unit: 'hour' | 'minute' | 'second') => {
    const value = e.target.value.padStart(2, '0');
    setTime(prev => ({...prev, [unit]: value}));
  };


  if (!isMounted) {
    return <Card className="w-full max-w-4xl animate-pulse"><div className="h-[28rem]"></div></Card>;
  }

  return (
    <>
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
            <div className="text-center sm:text-left">
                <h1 className="text-4xl font-headline font-bold text-primary">Time Weaver</h1>
                <p className="text-muted-foreground">Your personal countdown manager.</p>
            </div>
            <Button onClick={handleOpenDialog}><PlusCircle className="mr-2 h-4 w-4" />Add New Timer</Button>
        </header>
        
        {timers.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
                {timers.map(timer => (
                    <CountdownCard key={timer.id} timer={timer} onRemove={handleRemoveTimer} />
                ))}
            </div>
        ) : (
            <Card className="flex flex-col items-center justify-center p-12 text-center">
                 <CardHeader>
                    <CardTitle>No Countdowns Yet!</CardTitle>
                    <CardDescription>Click "Add New Timer" to get started.</CardDescription>
                </CardHeader>
            </Card>
        )}
      </div>


      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[750px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Create a New Countdown</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
                <Label htmlFor="title" className="mb-2 block">Title</Label>
                <Input id="title" placeholder="e.g., New Year's Eve" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <div className="flex justify-center">
                <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1))}
                    initialFocus
                />
                </div>
                <div className="flex flex-col justify-center gap-4 p-4 rounded-lg bg-secondary">
                <h3 className="text-lg font-medium text-center font-headline">Set Time (24h)</h3>
                <div className="flex items-center justify-center gap-2">
                    <div className="w-20">
                    <Label htmlFor="hour" className="text-center block mb-1 text-sm">Hour</Label>
                    <Input id="hour" value={time.hour} onChange={e => handleTimeInputChange(e, 'hour')} onBlur={e => handleTimeBlur(e, 'hour')} className="text-center text-2xl h-16"/>
                    </div>
                    <span className="text-2xl font-bold mt-6">:</span>
                    <div className="w-20">
                    <Label htmlFor="minute" className="text-center block mb-1 text-sm">Minute</Label>
                    <Input id="minute" value={time.minute} onChange={e => handleTimeInputChange(e, 'minute')} onBlur={e => handleTimeBlur(e, 'minute')} className="text-center text-2xl h-16"/>
                    </div>
                    <span className="text-2xl font-bold mt-6">:</span>
                    <div className="w-20">
                    <Label htmlFor="second" className="text-center block mb-1 text-sm">Second</Label>
                    <Input id="second" value={time.second} onChange={e => handleTimeInputChange(e, 'second')} onBlur={e => handleTimeBlur(e, 'second')} className="text-center text-2xl h-16"/>
                    </div>
                </div>
                </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleAddTimer} disabled={!title}>Set Countdown</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
