import React from 'react';

// A modern, abstract logo for "ScanZa".
// The icon is a stylized 'S' and 'Z' mark with a violet-to-magenta gradient.
const logoDataUri = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4Ij48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImxvZ29HcmFkaWVudCIgeDE9IjAlIiB5MT0iMCUiIHgyPSIxMDAlIiB5Mj0iMTAwJSI+PHN0b3Agb2Zmc2V0PSIwJSIgc3RvcC1jb2xvcj0iIzZkMjhkOSIvPjxzdG9wIG9mZnNldD0iMTAwJSIgc3RvcC1jb2xvcj0iI2JlMTg1ZCIvPjwvbGluZWFyR3JhZGllbnQ+PC9kZWZzPjxwYXRoIGZpbGw9InVybCgjbG9nb0dyYWRpZW50KSIgZD0iTTgsM0gxNkMxOC43NiwzIDIxLDUuMjQgMjEsOFY5SDE5VjhDMTksNi4zNCAxNy42Niw1IDE2LDVIOFYxMUgxNEwxMCwxOUgxNkMxNy42NiwxOSAxOSwxNy42NiAxOSwxNlYxNUgyMVYxNkMyMSwxOC43NiAxOC43NiwyMSAxNiwyMUg4QzUuMjQsMjEgMywxOC43NiAzLDE2VjE1SDRWMTZDNSwxNy42NiA2LjM0LDE5IDgsMTlIMTBMMTQsMTFINVY4QzUsNS4yNCA3LjI0LDMgOCwzWiIgLz48L3N2Zz4=';


export const Logo: React.FC<{ className?: string }> = ({ className }) => (
  <img src={logoDataUri} alt="ScanZa Logo" className={className || 'h-12 w-12'} />
);
