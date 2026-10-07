import * as React from 'react';
import { cn } from '@/lib/utils';

const make = (name, base, Tag = 'div') => {
  const C = React.forwardRef(({ className, ...props }, ref) => <Tag ref={ref} className={cn(base, className)} {...props} />);
  C.displayName = name;
  return C;
};

const Card = make('Card', 'rounded-lg border bg-card text-card-foreground shadow-sm');
const CardHeader = make('CardHeader', 'flex flex-col space-y-1.5 p-6');
const CardTitle = make('CardTitle', 'text-2xl font-semibold leading-none tracking-tight', 'h3');
const CardDescription = make('CardDescription', 'text-sm text-muted-foreground', 'p');
const CardContent = make('CardContent', 'p-6 pt-0');
const CardFooter = make('CardFooter', 'flex items-center p-6 pt-0');

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
