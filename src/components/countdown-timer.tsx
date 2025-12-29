"use client";

import { useState, useEffect, useMemo, useRef } from "react";
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
import { PlusCircle, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db, auth } from "@/lib/firebase/config";
import {
  collection,
  addDoc,
  onSnapshot,
  doc,
  deleteDoc,
  query,
  where,
  Timestamp,
} from "firebase/firestore";

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
    userId: string;
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
  const notificationFetched = useRef(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const distance = timer.targetDate.getTime() - now.getTime();

      if (distance <= 0) {
        setIsExpired(true);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        
        if (!notificationFetched.current) {
          notificationFetched.current = true;
          const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
          getCountdownNotification({
              targetDate: timer.targetDate.toISOString(),
              timeZone: timeZone,
              location: timeZone,
          }).then((res) => {
              setNotification(res.notificationMessage);
          });
        }
        return null;
      } else {
        return {
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000),
        };
      }
    };
    
    // Set initial time left immediately
    const initialTimeLeft = calculateTimeLeft();
    if (initialTimeLeft) {
      setTimeLeft(initialTimeLeft);
    }

    const interval = setInterval(() => {
      const newTimeLeft = calculateTimeLeft();
      if(newTimeLeft) {
        setTimeLeft(newTimeLeft);
      } else {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [timer.targetDate, timer.title]);

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
  const { user, loading } = useAuth();
  const [timers, setTimers] = useState<Timer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // State for date/time picker dialog
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [time, setTime] = useState({ hour: "00", minute: "00", second: "00" });

  useEffect(() => {
    if (user) {
      const q = query(collection(db, "timers"), where("userId", "==", user.uid));
      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const timersData: Timer[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          timersData.push({
            id: doc.id,
            title: data.title,
            targetDate: (data.targetDate as Timestamp).toDate(),
            userId: data.userId,
          });
        });
        setTimers(timersData.sort((a,b) => a.targetDate.getTime() - b.targetDate.getTime()));
      });
      return () => unsubscribe();
    }
  }, [user]);


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

  const handleAddTimer = async () => {
    if (!title || !selectedDate || !user) return;

    const newTarget = new Date(selectedDate);
    const now = new Date();
    
    newTarget.setHours(parseInt(time.hour, 10) || 0);
    newTarget.setMinutes(parseInt(time.minute, 10) || 0);
    newTarget.setSeconds(parseInt(time.second, 10) || 0);
    newTarget.setMilliseconds(0);

    if (newTarget.getTime() > now.getTime()) {
      await addDoc(collection(db, "timers"), {
        title,
        targetDate: Timestamp.fromDate(newTarget),
        userId: user.uid,
      });
    }
    setIsDialogOpen(false);
    setTitle("");
  };
  
  const handleRemoveTimer = async (id: string) => {
    await deleteDoc(doc(db, "timers", id));
  };

  const handleSignOut = async () => {
    await auth.signOut();
  }
  
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

  if (loading) {
    return <div className="flex min-h-screen w-full items-center justify-center"><Card className="w-full max-w-4xl animate-pulse"><div className="h-[28rem]"></div></Card></div>;
  }
  
  if (!user) {
    return null; // Don't render anything if not logged in, auth provider handles redirect
  }


  return (
    <>
      <div className="w-full max-w-4xl">
        <header className="flex items-center justify-between mb-8">
            <div className="text-center sm:text-left">
                <h1 className="text-4xl font-headline font-bold text-primary">Time Weaver</h1>
                <p className="text-muted-foreground">Your personal countdown manager.</p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleOpenDialog}><PlusCircle className="mr-2 h-4 w-4" />Add New Timer</Button>
              <Button variant="ghost" size="icon" onClick={handleSignOut}><LogOut /></Button>
            </div>
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
            <Button onClick={handleAddTimer} disabled={!title || !selectedDate}>Set Countdown</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
