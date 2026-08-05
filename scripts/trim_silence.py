#!/usr/bin/env python3
"""Cut the silence edge-tts leaves around and inside a clip.

Every clip the TTS service returns carries roughly 0.19s of silence in front
and 0.90s behind, and a sentence-ending mark inside the text ("Sure. For here
or to go?") buys another ~1.0s in the middle. None of it is speech, and across
a thousand clips it adds up to about a third of the total runtime.

This rewrites the files in place: strip the head and tail, cap any internal
pause, then hand back a little lead-in and tail so nothing sounds clipped. The
text and the voice are untouched, and nothing is regenerated.

Run it over newly generated audio before committing:

    python3 scripts/trim_silence.py                    # audio/, skipping clean files
    python3 scripts/trim_silence.py audio/hotel_*.mp3  # only these
    python3 scripts/trim_silence.py --dry-run          # report, change nothing

Files already within tolerance are skipped, so a second run is a no-op rather
than a second round of lossy re-encoding. --force overrides that.

Requires ffmpeg (brew install ffmpeg). audio/conversations/ holds the original
full-conversation recordings and is left alone.
"""
import argparse
import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'audio')

# Matches how the corpus was encoded, so trimming does not change the format.
BITRATE = '48k'
SAMPLE_RATE = '24000'
CHANNELS = '1'

LEAD_PAD = 0.06   # silence kept before the first word
TAIL_PAD = 0.15   # silence kept after the last word

# A file is considered already trimmed when it is within these.
CLEAN_LEAD = 0.15
CLEAN_TAIL = 0.30


def die(msg):
    sys.exit('error: ' + msg)


def run(cmd):
    return subprocess.run(cmd, capture_output=True, text=True)


def duration(path):
    out = run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
               '-of', 'csv=p=0', path]).stdout.strip()
    return float(out) if out else 0.0


def silences(path, threshold, min_dur=0.10):
    """[(start, end)] of silent stretches, via ffmpeg's silencedetect."""
    r = run(['ffmpeg', '-v', 'info', '-i', path,
             '-af', 'silencedetect=n=%ddB:d=%s' % (threshold, min_dur),
             '-f', 'null', '-'])
    starts = [float(m) for m in re.findall(r'silence_start: ([\d.]+)', r.stderr)]
    ends = [float(m) for m in re.findall(r'silence_end: ([\d.]+)', r.stderr)]
    out = []
    for i, s in enumerate(starts):
        out.append((s, ends[i] if i < len(ends) else duration(path)))
    return out


def measure(path, threshold):
    """(lead, tail, longest internal gap) in seconds."""
    total = duration(path)
    gaps = silences(path, threshold)
    lead = tail = 0.0
    inner = 0.0
    for s, e in gaps:
        if s <= 0.05:
            lead = max(lead, e - s)
        elif e >= total - 0.05:
            tail = max(tail, e - s)
        else:
            inner = max(inner, e - s)
    return lead, tail, inner, total


def build_filter(gap, threshold):
    keep = (
        'silenceremove=start_periods=1:start_silence=0:start_threshold={t}dB:'
        'stop_periods=-1:stop_silence={g}:stop_threshold={t}dB:detection=rms'
    ).format(g=gap, t=threshold)
    # silenceremove only trims from the front, so reverse to reach the tail.
    return (
        '{keep},areverse,'
        'silenceremove=start_periods=1:start_silence=0:start_threshold={t}dB,'
        'areverse,adelay={lead},apad=pad_dur={tail}'
    ).format(keep=keep, t=threshold,
             lead=int(LEAD_PAD * 1000), tail=TAIL_PAD)


def is_clean(path, gap, threshold):
    lead, tail, inner, _ = measure(path, threshold)
    return lead <= CLEAN_LEAD and tail <= CLEAN_TAIL and inner <= gap + 0.10


def trim(path, filt, dry_run):
    """Rewrite path in place. Returns (before, after) or None if refused."""
    before = duration(path)
    if dry_run:
        return before, None
    tmp = path + '.trim.tmp.mp3'
    r = run(['ffmpeg', '-v', 'error', '-y', '-i', path, '-af', filt,
             '-c:a', 'libmp3lame', '-b:a', BITRATE, '-ar', SAMPLE_RATE,
             '-ac', CHANNELS, tmp])
    if r.returncode != 0 or not os.path.exists(tmp):
        if os.path.exists(tmp):
            os.remove(tmp)
        return None
    after = duration(tmp)
    # Padding is at most ~1.3s; losing most of a clip means the filter ate
    # speech, so keep the original and let the caller report it.
    if after < 0.4 or after < before * 0.35:
        os.remove(tmp)
        return None
    os.replace(tmp, path)
    return before, after


def collect(args):
    if args.files:
        return [os.path.abspath(f) for f in args.files]
    if not os.path.isdir(AUDIO):
        die('no audio directory at ' + AUDIO)
    return [os.path.join(AUDIO, f)
            for f in sorted(os.listdir(AUDIO)) if f.endswith('.mp3')]


def main():
    p = argparse.ArgumentParser(
        description='Trim TTS silence from mp3 files in place.')
    p.add_argument('files', nargs='*',
                   help='files to process (default: every mp3 in audio/)')
    p.add_argument('--gap', type=float, default=0.25, metavar='SEC',
                   help='longest internal pause to keep (default: 0.25)')
    p.add_argument('--threshold', type=int, default=-45, metavar='DB',
                   help='level counted as silence (default: -45)')
    p.add_argument('--force', action='store_true',
                   help='re-encode even files that already look trimmed')
    p.add_argument('--dry-run', action='store_true',
                   help='report what would change and stop')
    args = p.parse_args()

    if not shutil.which('ffmpeg') or not shutil.which('ffprobe'):
        die('ffmpeg and ffprobe are required (brew install ffmpeg)')

    files = collect(args)
    if not files:
        print('nothing to do')
        return 0
    missing = [f for f in files if not os.path.exists(f)]
    if missing:
        die('missing: %s' % ', '.join(os.path.basename(m) for m in missing))

    filt = build_filter(args.gap, args.threshold)
    before_total = after_total = 0.0
    done = skipped = 0
    refused = []

    for n, path in enumerate(files, 1):
        name = os.path.basename(path)
        if not args.force and is_clean(path, args.gap, args.threshold):
            skipped += 1
            d = duration(path)
            before_total += d
            after_total += d
            continue
        res = trim(path, filt, args.dry_run)
        if res is None:
            refused.append(name)
            continue
        b, a = res
        before_total += b
        after_total += a if a is not None else b
        done += 1
        if args.dry_run:
            print('  would trim %s (%.2fs)' % (name, b))
        elif len(files) > 50 and n % 100 == 0:
            print('  %d/%d ...' % (n, len(files)))

    verb = 'would trim' if args.dry_run else 'trimmed'
    print('\n%s %d, already clean %d, of %d file(s)'
          % (verb, done, skipped, len(files)))
    if not args.dry_run and before_total and done:
        fmt = (lambda s: '%.1f min' % (s / 60)) if before_total >= 60 \
            else (lambda s: '%.1fs' % s)
        print('total runtime %s -> %s (-%.0f%%)'
              % (fmt(before_total), fmt(after_total),
                 100 * (before_total - after_total) / before_total))
    if refused:
        print('left alone (output looked over-trimmed): %s' % ', '.join(refused))
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main())
