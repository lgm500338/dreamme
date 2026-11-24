import express, { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type AvatarAction = 'stand' | 'walk' | 'sit' | 'wine' | 'toast' | 'wave' | 'greet' | 'sign';

interface PeerState {
  clientId: string;
  roomId: string;
  name: string;
  x: number;
  y: number;
  facing: 'left' | 'right';
  action: AvatarAction;
  outfit: string;
  hairStyle: string;
  hairColor: string;
  skinTone: string;
  prop: string;
  greetingText?: string;
  greetingAt?: number;
  lastSeen: number;
}

interface SseClient {
  clientId: string;
  roomId: string;
  res: Response;
}

const VALID_ACTIONS = new Set<AvatarAction>([
  'stand',
  'walk',
  'sit',
  'wine',
  'toast',
  'wave',
  'greet',
  'sign',
]);

const VALID_OUTFITS = new Set(['resort', 'tailored', 'parisChic', 'evening', 'athleisure']);
const VALID_HAIR_STYLES = new Set(['bob', 'longWave', 'shortNeat', 'updo', 'curly']);
const VALID_SKIN_TONES = new Set(['fair', 'warm', 'olive', 'tan', 'deep']);
const VALID_PROPS = new Set([
  'none',
  'coffee',
  'wine',
  'sunglasses',
  'champagne',
  'shoppingBag',
  'bestsellerBook',
  'goldKey',
]);

const rooms = new Map<string, Map<string, PeerState>>();
const sseClients = new Map<string, SseClient>();

function sanitizeId(raw: unknown, maxLen = 48): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, maxLen);
}

function sanitizeText(raw: unknown, maxLen = 40): string {
  if (typeof raw !== 'string') return '';
  return raw.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

function clampCoord(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n * 10) / 10));
}

function sanitizeHexColor(raw: unknown, fallback = '#26201D'): string {
  if (typeof raw === 'string' && /^#[0-9a-fA-F]{6}$/.test(raw)) {
    return raw;
  }
  return fallback;
}

function getRoom(roomId: string): Map<string, PeerState> {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map<string, PeerState>();
    rooms.set(roomId, room);
  }
  return room;
}

function broadcastToRoom(roomId: string, event: string, payload: unknown, excludeClientId?: string) {
  const message = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const [, client] of sseClients) {
    if (client.roomId === roomId && client.clientId !== excludeClientId) {
      try {
        client.res.write(message);
      } catch {
        // Disconnect handled by req close listener
      }
    }
  }
}

// Clean up stale peers every 60 seconds
setInterval(() => {
  const cutoff = Date.now() - 120_000;
  for (const [roomId, room] of rooms) {
    for (const [clientId, peer] of room) {
      if (peer.lastSeen < cutoff && !sseClients.has(clientId)) {
        room.delete(clientId);
        broadcastToRoom(roomId, 'avatar:left', { clientId });
      }
    }
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
}, 60_000);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Live active user count per room
  app.get('/api/together/rooms', (_req: Request, res: Response) => {
    const counts: Record<string, number> = {};
    for (const [roomId, room] of rooms) {
      counts[roomId] = room.size;
    }
    res.json({ counts });
  });

  // Real-time Server-Sent Events stream for Together Mode
  app.get('/api/together/stream', (req: Request, res: Response) => {
    const roomId = sanitizeId(req.query.roomId, 48);
    const clientId = sanitizeId(req.query.clientId, 48);

    if (!roomId || !clientId) {
      res.status(400).json({ error: 'Invalid roomId or clientId' });
      return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    sseClients.set(clientId, { clientId, roomId, res });

    const room = getRoom(roomId);
    const existingPeers = Array.from(room.values());
    res.write(`event: room:init\ndata: ${JSON.stringify({ roomId, peers: existingPeers })}\n\n`);

    const heartbeat = setInterval(() => {
      try {
        res.write(': ping\n\n');
      } catch {
        clearInterval(heartbeat);
      }
    }, 20_000);

    req.on('close', () => {
      clearInterval(heartbeat);
      const active = sseClients.get(clientId);
      if (active && active.res === res) {
        sseClients.delete(clientId);
      }
      const currentRoom = rooms.get(roomId);
      if (currentRoom && currentRoom.has(clientId)) {
        currentRoom.delete(clientId);
        broadcastToRoom(roomId, 'avatar:left', { clientId });
        if (currentRoom.size === 0) {
          rooms.delete(roomId);
        }
      }
    });
  });

  // Join or update avatar profile in a Together room (no personal photos sent to server)
  app.post('/api/together/join', (req: Request, res: Response) => {
    const roomId = sanitizeId(req.body?.roomId, 48);
    const clientId = sanitizeId(req.body?.clientId, 48);
    if (!roomId || !clientId) {
      res.status(400).json({ error: 'Invalid roomId or clientId' });
      return;
    }

    const room = getRoom(roomId);
    const name = sanitizeText(req.body?.name, 24) || 'Dreamer';
    const actionRaw = req.body?.action as AvatarAction;
    const action: AvatarAction = VALID_ACTIONS.has(actionRaw) ? actionRaw : 'stand';
    const outfit = VALID_OUTFITS.has(req.body?.outfit) ? req.body.outfit : 'resort';
    const hairStyle = VALID_HAIR_STYLES.has(req.body?.hairStyle) ? req.body.hairStyle : 'longWave';
    const skinTone = VALID_SKIN_TONES.has(req.body?.skinTone) ? req.body.skinTone : 'warm';
    const prop = VALID_PROPS.has(req.body?.prop) ? req.body.prop : 'none';
    const facing = req.body?.facing === 'left' ? 'left' : 'right';

    const peer: PeerState = {
      clientId,
      roomId,
      name,
      x: clampCoord(req.body?.x, 0, 100, 50),
      y: clampCoord(req.body?.y, 0, 100, 80),
      facing,
      action,
      outfit,
      hairStyle,
      hairColor: sanitizeHexColor(req.body?.hairColor),
      skinTone,
      prop,
      lastSeen: Date.now(),
    };

    room.set(clientId, peer);
    broadcastToRoom(roomId, 'avatar:joined', { peer }, clientId);
    res.json({ ok: true, peer, count: room.size });
  });

  // Move or change calm action in Together room
  app.post('/api/together/move', (req: Request, res: Response) => {
    const roomId = sanitizeId(req.body?.roomId, 48);
    const clientId = sanitizeId(req.body?.clientId, 48);
    if (!roomId || !clientId) {
      res.status(400).json({ error: 'Invalid roomId or clientId' });
      return;
    }

    const room = rooms.get(roomId);
    const existing = room?.get(clientId);
    if (!existing) {
      res.status(404).json({ error: 'Peer not in room' });
      return;
    }

    const actionRaw = req.body?.action as AvatarAction;
    existing.x = clampCoord(req.body?.x, 0, 100, existing.x);
    existing.y = clampCoord(req.body?.y, 0, 100, existing.y);
    existing.facing = req.body?.facing === 'left' ? 'left' : 'right';
    if (VALID_ACTIONS.has(actionRaw)) {
      existing.action = actionRaw;
    }
    if (VALID_PROPS.has(req.body?.prop)) {
      existing.prop = req.body.prop;
    }
    existing.lastSeen = Date.now();

    broadcastToRoom(roomId, 'avatar:updated', { peer: existing }, clientId);
    res.json({ ok: true });
  });

  // Calm greeting / waving interaction (no dancing)
  app.post('/api/together/greet', (req: Request, res: Response) => {
    const roomId = sanitizeId(req.body?.roomId, 48);
    const clientId = sanitizeId(req.body?.clientId, 48);
    if (!roomId || !clientId) {
      res.status(400).json({ error: 'Invalid roomId or clientId' });
      return;
    }

    const room = rooms.get(roomId);
    const existing = room?.get(clientId);
    if (!existing) {
      res.status(404).json({ error: 'Peer not in room' });
      return;
    }

    const actionRaw = req.body?.action === 'greet' ? 'greet' : 'wave';
    const greetingText = sanitizeText(req.body?.message, 32) || '안녕하세요';
    existing.action = actionRaw;
    existing.greetingText = greetingText;
    existing.greetingAt = Date.now();
    existing.lastSeen = Date.now();

    broadcastToRoom(
      roomId,
      'avatar:greet',
      {
        clientId,
        action: actionRaw,
        greetingText,
        greetingAt: existing.greetingAt,
      },
      clientId
    );
    res.json({ ok: true });
  });

  // Explicit leave endpoint
  app.post('/api/together/leave', (req: Request, res: Response) => {
    const roomId = sanitizeId(req.body?.roomId, 48);
    const clientId = sanitizeId(req.body?.clientId, 48);
    if (roomId && clientId) {
      const room = rooms.get(roomId);
      if (room?.has(clientId)) {
        room.delete(clientId);
        broadcastToRoom(roomId, 'avatar:left', { clientId });
        if (room.size === 0) rooms.delete(roomId);
      }
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DreamMe server running at http://localhost:${PORT}`);
  });
}

startServer();
