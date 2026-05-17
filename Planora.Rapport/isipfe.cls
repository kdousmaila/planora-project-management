%%%%%
% isipfe.cls for PFE reports in ISI
% Realized by: Mohamed Laaraiedh
% mail: m.laaraiedh@supcom.tn
% Produced based on mqthesis.cls

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{isipfe}[22/01/2015 ISI PFE LaTeX class]

% ifthenelse for if loops
\RequirePackage{ifthen}

% Default is pfe
\newcommand{\degreetext}{for the degree of Engineer/Bachelor}
\DeclareOption{pfe}{\renewcommand{\degreetext}%
	{for the degree of \\ Engineer}}
\DeclareOption{honours}{\renewcommand{\degreetext}%
	{in partial fulfilment of the degree of \\ Engineer with honours}}

% print a copyright page on the back of the title page?
\newboolean{copyrightpage}
\setboolean{copyrightpage}{false}
\DeclareOption{copyrightpage}{\setboolean{copyrightpage}{true}}

% print ``Examiner's copy'' on the title page?
\newboolean{examinerscopy}
\setboolean{examinerscopy}{false}
\DeclareOption{examinerscopy}{\setboolean{examinerscopy}{true}}

% use small caps for the title text?
\newboolean{titlesmallcaps}
\setboolean{titlesmallcaps}{false}
\DeclareOption{titlesmallcaps}{\setboolean{titlesmallcaps}{true}}

% finished processing options
\ProcessOptions\relax

% load the book class using a4paper
\LoadClass[12pt,a4paper, oneside]{book}

% give the header a bit more room for fancyhdr below
% otherwise LaTeX will spew on each page
\addtolength{\headheight}{2.5pt}

% first set to zero ... 
\setlength{\oddsidemargin}{-1in}
\setlength{\evensidemargin}{-1in}
\setlength{\topmargin}{-1in}

% adjust these if printer is off by a bit
\setlength{\hoffset}{0mm}
\setlength{\voffset}{0mm}

% NB also that the optimal number of characters per line 
% for readability is only 60-70, we're over so we'll be a
% bit more generous on the evensidemargin
\addtolength{\oddsidemargin}{25mm}
\addtolength{\evensidemargin}{20mm}
\addtolength{\topmargin}{20mm}

% set up some of the spacing
\setlength{\marginparwidth}{40pt}
\setlength{\marginparsep}{10pt}
\setlength{\headsep}{0.2in}

% A4 dimensions [mm]: 209.903 x 297.039
\setlength{\textwidth}{21 cm}
\setlength{\textheight}{30 cm}

% fix up width
\addtolength{\textwidth}{-\oddsidemargin}
\addtolength{\textwidth}{-\evensidemargin}
% now we've added 2inches in setting up margins
\addtolength{\textwidth}{-2in}

% fix up height
\addtolength{\textheight}{-2\topmargin}
\addtolength{\textheight}{-\headheight}
\addtolength{\textheight}{-\headsep}
\addtolength{\textheight}{-\footskip}
% now we've added 2inches in setting up margins
\addtolength{\textheight}{-2in}

\brokenpenalty=10000   % dunno what this does, maybe handy



% this stops one figure taking up a whole page and lets more text onto
% the one page when a figure exists
\renewcommand\floatpagefraction{0.8} %   Default = 0.5

% macros for defining the department, various dates and the title and
% author of the report.
\def\department#1{\gdef\@department{#1}}
\def\submitdate#1{\gdef\@submitdate{#1}}
\def\copyrightyear#1{\gdef\@copyrightyear{#1}} % \author, \title in report
\def\@title{}
\def\@author{}
\def\@affil{}
\def\@submitdate{\ifcase\the\month\or
		January\or February\or March\or April\or May\or June\or
		July\or August\or September\or October\or November\or December\fi
	\space \number\the\year}
\def\@copyrightyear{\number\the\year}

%%% load the required packages
% fancyhdr for nice, fancy headings
\RequirePackage{fancyhdr}
% ccaption for good caption handling
\RequirePackage{ccaption}
% xspace so that spaces after commands are handled correctly
\RequirePackage{xspace}

% improved version of caption handling
\usepackage{ccaption}
\captionnamefont{\scshape}
\captionstyle{}
\makeatletter
\renewcommand{\fnum@figure}{\quad\footnotesize\bfseries \figurename~\thefigure}
\renewcommand{\fnum@table}{\quad\footnotesize\bfseries \tablename~\thetable}
\renewcommand{\@makecaption}[2]{%
	\vskip\abovecaptionskip
	\sbox\@tempboxa{#1: #2}%
	\ifdim \wd\@tempboxa >\hsize
		\def\baselinestretch{1}\@normalsize
		#1: #2\par
		\def\baselinestretch{1.5}\@normalsize
	\else
		\global \@minipagefalse
		\hb@xt@\hsize{\hfil\box\@tempboxa\hfil}%
	\fi
	\vskip\belowcaptionskip}
\makeatother

% set the pagestyle to look good

\pagestyle{fancy}
\fancypagestyle{plain}{%
	\fancyhf{}%
	\renewcommand{\footrulewidth}{0.3pt}%
	\renewcommand{\headrulewidth}{0pt}%
	\fancyfoot[r]{\footnotesize \thepage}%
}

%%%%% Fancyhdr stuff
% define how headers are marked, for details, see fancyhdr docs
%\renewcommand{\chaptermark}[1]{\markboth{#1}{}}
%\renewcommand{\sectionmark}[1]{\markright{\thesection\ #1}}
% define where sections, chapters and pagenumbers are put
% see fancyhdr docs for details
% the \nouppercase stops book.cls making the contents, bibliography
% and index headers from being all in uppercase.
% The options used here are essentially that in Lamport's book, but
% with small caps for the headings.
\fancyhf{}
%\fancyhead[LE,RO]{\nouppercase{\thepage}}
%\fancyhead[L]{\nouppercase{\leftmark}}
\lhead{\nouppercase{\leftmark}}
\renewcommand{\headrulewidth}{0.3pt}
\renewcommand{\footrulewidth}{0.3pt}
\rfoot{\thepage}

%%% other settings required for a thesis
% It's a references section, not a bibliography, hence redefine
% \bibname i.e. change ``Bibliography'' to ``References''
\renewcommand*{\bibname}{References}

% use 1.5 line spacing
\ifthenelse{\boolean{examinerscopy}}{%
	\renewcommand{\baselinestretch}{1.5}}%
{\renewcommand{\baselinestretch}{1.5}}

% spell things correctly
\newenvironment{centre}{\begin{center}}{\end{center}}
\newenvironment{itemise}{\begin{itemize}}{\end{itemize}}

%\usepackage{play}
\usepackage[grey,times]{quotchap}
\usepackage{makeidx}

%%%%% set up the bibliography style
\bibliographystyle{is-unsrt}  % mqthesis bibliography style file, made
% with makebst


%%%%% optional packages
\usepackage[square,comma,numbers,sort&compress]{natbib}
% this is the natural sciences bibliography citation
% style package.  The options here give citations in
% the text as numbers in square brackets, separated by
% commas, citations sorted and consecutive citations
% compressed 
% output example: [1,4,12-15]

\usepackage[nottoc,notlof, notlot]{tocbibind}
% allows the table of contents, bibliography
% and index to be added to the table of
% contents if desired, the option used
% here specifies that the table of
% contents is not to be added.
% tocbibind needs to be after natbib
% otherwise bits of it get trampled.

\usepackage{amsmath,amsfonts,amssymb} % this is handy for mathematicians and physicists
% see http://www.ams.org/tex/amslatex.html

\usepackage{graphicx} % standard graphics package for inclusion of
% images and eps files into LaTeX document
\usepackage{graphics} % standard graphics package for inclusion of
% images and eps files into LaTeX document

%% this code hacked from that of R Chandrasekhar from UWA
%\newif\ifpdf
%\ifx\pdfoutput\undefined
%	\pdffalse    % we are not running pdfLaTeX
%\else
%	\pdfoutput=1 % we are running pdfLaTeX
%	\pdftrue
%\fi
%
%\ifpdf
%	\DeclareGraphicsExtensions{.pdf}  % this command defined in graphicx
%	\pdfcompresslevel=9  % 0: no compression, 9: highest compression
%			     % or, set compress_level 9 in file pdftex.cfg
%\else
%	\DeclareGraphicsExtensions{.eps}
%\fi

% put in an index?
% \makeindex

\renewcommand{\chapterheadstartvskip}{\vspace*{-2\baselineskip}}

