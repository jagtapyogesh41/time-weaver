
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
import { Calendar as CalendarIcon, Clock, RotateCcw } from "lucide-react";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
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

export function CountdownTimer() {
  const [targetDate, setTargetDate] = useState<Date | null>(null);
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // State for date/time picker dialog
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState({ hour: "00", minute: "00", second: "00" });

  useEffect(() => {
    setIsMounted(true);
    const savedDate = localStorage.getItem("targetDate");
    if (savedDate) {
      const date = new Date(savedDate);
      if (date.getTime() > new Date().getTime()) {
        setTargetDate(date);
      } else {
        localStorage.removeItem("targetDate");
      }
    }
  }, []);

  useEffect(() => {
    if (!targetDate) {
      setTimeLeft(null);
      return;
    }

    if (isMounted) {
      localStorage.setItem("targetDate", targetDate.toISOString());
    }

    const timer = setInterval(() => {
      const now = new Date();
      const distance = targetDate.getTime() - now.getTime();

      if (distance <= 0) {
        clearInterval(timer);
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });

        if (isMounted) {
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          getCountdownNotification({
            targetDate: targetDate.toISOString(),
            timeZone: timeZone,
            location: timeZone,
          }).then((res) => {
            setNotification(res.notificationMessage);
          });
          localStorage.removeItem("targetDate");
        }

      } else {
        setIsExpired(false);
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        });
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate, isMounted]);

  const handleOpenDialog = () => {
    const d = targetDate || new Date();
    setSelectedDate(d);
    setTime({
      hour: String(d.getHours()).padStart(2, "0"),
      minute: String(d.getMinutes()).padStart(2, "0"),
      second: String(d.getSeconds()).padStart(2, "0"),
    });
    setIsDialogOpen(true);
  };

  const handleSetCountdown = () => {
    const newTarget = selectedDate ? new Date(selectedDate) : new Date();
    const now = new Date();
    
    // Set time, defaulting to current time if inputs are invalid
    newTarget.setHours(parseInt(time.hour, 10) || now.getHours());
    newTarget.setMinutes(parseInt(time.minute, 10) || now.getMinutes());
    newTarget.setSeconds(parseInt(time.second, 10) || now.getSeconds());
    newTarget.setMilliseconds(0);

    if (newTarget.getTime() > now.getTime()) {
      setTargetDate(newTarget);
      setIsExpired(false);
    }
    setIsDialogOpen(false);
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

  const handleReset = () => {
    setTargetDate(null);
    setTimeLeft(null);
    setIsExpired(false);
    setNotification(null);
    if (isMounted) {
      localStorage.removeItem("targetDate");
    }
  };

  const formattedTargetDate = useMemo(() => {
    if (!targetDate) return "";
    return targetDate.toLocaleString(undefined, {
      year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }, [targetDate]);

  if (!isMounted) {
    return <Card className="w-full max-w-2xl animate-pulse"><div className="h-[28rem]"></div></Card>;
  }

  return (
    <>
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-headline font-bold text-primary">Time Weaver</CardTitle>
          <CardDescription>
            {targetDate && !isExpired ? `Counting down to ${formattedTargetDate}` : "Set a date and time to begin the countdown."}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center min-h-[12rem]">
          {timeLeft && !isExpired ? (
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <TimeBox value={String(timeLeft.days).padStart(2, "0")} label="Days" />
              <TimeBox value={String(timeLeft.hours).padStart(2, "0")} label="Hours" />
              <TimeBox value={String(timeLeft.minutes).padStart(2, "0")} label="Minutes" />
              <TimeBox value={String(timeLeft.seconds).padStart(2, "0")} label="Seconds" />
            </div>
          ) : (
            <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{isExpired ? "Countdown Expired!" : "No Countdown Set"}</p>
                <p className="text-muted-foreground">{isExpired ? "The target time has been reached." : "Set a timer to get started."}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-center gap-4">
          <Button onClick={handleOpenDialog}><Clock className="mr-2 h-4 w-4" />Set Countdown</Button>
          {targetDate && <Button variant="outline" onClick={handleReset}><RotateCcw className="mr-2 h-4 w-4"/>Reset</Button>}
        </CardFooter>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[650px] grid-rows-[auto_1fr_auto] p-0">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="font-headline">Set Target Date and Time</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 md:grid-cols-2 p-6 overflow-y-auto">
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
          <DialogFooter className="p-6 pt-0">
            <DialogClose asChild>
                <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSetCountdown}>Set</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!notification}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="font-headline text-primary">Countdown Complete!</AlertDialogTitle>
            <AlertDialogDescription>
              {notification}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => {
              setNotification(null);
              setIsExpired(false);
            }}>
              Awesome!
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
