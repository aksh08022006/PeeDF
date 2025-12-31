import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  getOAuthRedirectUrl,
  exchangeCodeForSessionToken,
  authMiddleware,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { setCookie, getCookie } from "hono/cookie";
import {
  createVendorSession,
  verifyVendorSession,
  deleteVendorSession,
  verifyVendorPassword,
  VENDOR_SESSION_COOKIE,
} from "./vendor-auth";

const app = new Hono<{ Bindings: Env }>();

// ============================================
// Authentication Routes
// ============================================

app.get("/api/oauth/google/redirect_url", async (c) => {
  const redirectUrl = await getOAuthRedirectUrl("google", {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  return c.json({ redirectUrl }, 200);
});

app.post("/api/sessions", async (c) => {
  const body = await c.req.json();

  if (!body.code) {
    return c.json({ error: "No authorization code provided" }, 400);
  }

  const sessionToken = await exchangeCodeForSessionToken(body.code, {
    apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
    apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
  });

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 60 * 24 * 60 * 60, // 60 days
  });

  return c.json({ success: true }, 200);
});

app.get("/api/users/me", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  // Validate email domain
  if (!mochaUser.email.endsWith("@pilani.bits-pilani.ac.in")) {
    return c.json({ 
      error: "Only BITS Pilani email addresses (@pilani.bits-pilani.ac.in) are allowed" 
    }, 403);
  }
  
  // Check if user exists in our database
  const existingUser = await c.env.DB.prepare(
    "SELECT * FROM users WHERE mocha_user_id = ?"
  )
    .bind(mochaUser.id)
    .first();

  if (!existingUser) {
    // Create user record
    await c.env.DB.prepare(
      `INSERT INTO users (mocha_user_id, email, name, created_at, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(
        mochaUser.id,
        mochaUser.email,
        mochaUser.google_user_data.name || null
      )
      .run();
  }

  return c.json(mochaUser);
});

app.get("/api/logout", async (c) => {
  const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

  if (typeof sessionToken === "string") {
    await deleteSession(sessionToken, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });
  }

  setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, "", {
    httpOnly: true,
    path: "/",
    sameSite: "none",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true }, 200);
});

// ============================================
// User Profile Routes
// ============================================

app.patch(
  "/api/profile",
  authMiddleware,
  zValidator(
    "json",
    z.object({
      phone: z.string().optional(),
      hostel: z.string().optional(),
    })
  ),
  async (c) => {
    const mochaUser = c.get("user");
    
    if (!mochaUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const { phone, hostel } = c.req.valid("json");

    await c.env.DB.prepare(
      `UPDATE users SET phone = ?, hostel = ?, updated_at = CURRENT_TIMESTAMP
       WHERE mocha_user_id = ?`
    )
      .bind(phone || null, hostel || null, mochaUser.id)
      .run();

    return c.json({ success: true });
  }
);

// ============================================
// File Upload Routes
// ============================================

app.post("/api/files/upload", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const formData = await c.req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return c.json({ error: "No file provided" }, 400);
  }

  // Validate file type
  if (file.type !== "application/pdf") {
    return c.json({ error: "Only PDF files are allowed" }, 400);
  }

  // Validate file size (max 50MB)
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return c.json({ error: "File size exceeds 50MB limit" }, 400);
  }

  // Generate unique key for R2
  const fileKey = `uploads/${mochaUser.id}/${Date.now()}-${file.name}`;

  // Upload to R2
  await c.env.R2_BUCKET.put(fileKey, file, {
    httpMetadata: {
      contentType: file.type,
      contentDisposition: `attachment; filename="${file.name}"`,
    },
  });

  // Get page count (simplified - just estimate from file size)
  // In production, you'd use a PDF library to count actual pages
  const estimatedPages = Math.max(1, Math.ceil(file.size / 50000));

  return c.json({
    fileKey,
    originalFilename: file.name,
    size: file.size,
    estimatedPages,
  });
});

app.get("/api/files/:fileKey{.+}", authMiddleware, async (c) => {
  const fileKey = c.req.param("fileKey");
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Verify the file belongs to this user
  if (!fileKey.startsWith(`uploads/${mochaUser.id}/`)) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const object = await c.env.R2_BUCKET.get(fileKey);

  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return c.body(object.body, { headers });
});

// ============================================
// Order Routes
// ============================================

app.post(
  "/api/orders",
  authMiddleware,
  zValidator(
    "json",
    z.object({
      files: z.array(
        z.object({
          fileKey: z.string(),
          originalFilename: z.string(),
          pageCount: z.number().int().min(1),
          colorType: z.enum(["bw", "color"]),
          isDoubleSided: z.boolean(),
          pagesPerSide: z.number().int().min(1).max(4).default(1),
          copies: z.number().int().min(1).max(100).default(1),
          comments: z.string().optional(),
        })
      ),
      deliveryHostel: z.string().min(1),
      deliveryGate: z.string().min(1),
      deliveryPhone: z.string().min(1),
      expectedTime: z.string().optional(),
      notes: z.string().optional(),
    })
  ),
  async (c) => {
    const mochaUser = c.get("user");
    
    if (!mochaUser) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    
    const data = c.req.valid("json");

    // Get user's internal ID
    const user = await c.env.DB.prepare(
      "SELECT id FROM users WHERE mocha_user_id = ?"
    )
      .bind(mochaUser.id)
      .first<{ id: number }>();

    if (!user) {
      return c.json({ error: "User not found" }, 404);
    }

    // Get pricing config
    const pricing = await c.env.DB.prepare(
      "SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1"
    ).first<{
      bw_single_page: number;
      bw_double_page: number;
      color_single_page: number;
      color_double_page: number;
      delivery_fee: number;
    }>();

    if (!pricing) {
      return c.json({ error: "Pricing not configured" }, 500);
    }

    // Calculate total price
    let totalPrice = 0;
    for (const file of data.files) {
      const effectivePages = file.isDoubleSided
        ? Math.ceil(file.pageCount / 2)
        : file.pageCount;

      const pagePrice =
        file.colorType === "color"
          ? file.isDoubleSided
            ? pricing.color_double_page
            : pricing.color_single_page
          : file.isDoubleSided
          ? pricing.bw_double_page
          : pricing.bw_single_page;

      totalPrice += effectivePages * pagePrice * file.copies;
    }

    totalPrice += pricing.delivery_fee;

    // Get active vendor
    const vendor = await c.env.DB.prepare(
      "SELECT id FROM vendors WHERE is_active = 1 ORDER BY current_load ASC LIMIT 1"
    ).first<{ id: number }>();

    // Create order
    const orderResult = await c.env.DB.prepare(
      `INSERT INTO orders (
        user_id, vendor_id, status, total_price, 
        delivery_hostel, delivery_gate, delivery_phone,
        expected_time, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
    )
      .bind(
        user.id,
        vendor?.id || null,
        "pending",
        totalPrice,
        data.deliveryHostel,
        data.deliveryGate,
        data.deliveryPhone,
        data.expectedTime || null,
        data.notes || null
      )
      .run();

    const orderId = orderResult.meta.last_row_id;

    // Create order files
    for (const file of data.files) {
      await c.env.DB.prepare(
        `INSERT INTO order_files (
          order_id, file_key, original_filename, page_count,
          color_type, is_double_sided, pages_per_side, copies, comments,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`
      )
        .bind(
          orderId,
          file.fileKey,
          file.originalFilename,
          file.pageCount,
          file.colorType,
          file.isDoubleSided ? 1 : 0,
          file.pagesPerSide,
          file.copies,
          file.comments || null
        )
        .run();
    }

    return c.json({
      orderId,
      totalPrice,
      status: "pending",
    });
  }
);

app.get("/api/orders", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  // Get user's internal ID
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE mocha_user_id = ?"
  )
    .bind(mochaUser.id)
    .first<{ id: number }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Get all orders for this user
  const { results: orders } = await c.env.DB.prepare(
    `SELECT 
      o.id, o.status, o.total_price, o.delivery_hostel, 
      o.delivery_gate, o.expected_time, o.notes, o.created_at,
      v.shop_name as vendor_name
     FROM orders o
     LEFT JOIN vendors v ON o.vendor_id = v.id
     WHERE o.user_id = ?
     ORDER BY o.created_at DESC`
  )
    .bind(user.id)
    .all();

  // Get files for each order
  const ordersWithFiles = await Promise.all(
    orders.map(async (order: any) => {
      const { results: files } = await c.env.DB.prepare(
        `SELECT 
          id, file_key, original_filename, page_count, color_type,
          is_double_sided, pages_per_side, copies, comments
         FROM order_files
         WHERE order_id = ?`
      )
        .bind(order.id)
        .all();

      return {
        ...order,
        files,
      };
    })
  );

  return c.json(ordersWithFiles);
});

app.get("/api/orders/:id", authMiddleware, async (c) => {
  const mochaUser = c.get("user");
  
  if (!mochaUser) {
    return c.json({ error: "Unauthorized" }, 401);
  }
  
  const orderId = c.req.param("id");

  // Get user's internal ID
  const user = await c.env.DB.prepare(
    "SELECT id FROM users WHERE mocha_user_id = ?"
  )
    .bind(mochaUser.id)
    .first<{ id: number }>();

  if (!user) {
    return c.json({ error: "User not found" }, 404);
  }

  // Get order
  const order = await c.env.DB.prepare(
    `SELECT 
      o.id, o.status, o.total_price, o.delivery_hostel,
      o.delivery_gate, o.delivery_phone, o.expected_time, 
      o.notes, o.created_at, o.updated_at,
      v.shop_name as vendor_name, v.contact_phone as vendor_phone
     FROM orders o
     LEFT JOIN vendors v ON o.vendor_id = v.id
     WHERE o.id = ? AND o.user_id = ?`
  )
    .bind(orderId, user.id)
    .first();

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  // Get files
  const { results: files } = await c.env.DB.prepare(
    `SELECT 
      id, file_key, original_filename, page_count, color_type,
      is_double_sided, pages_per_side, copies, comments
     FROM order_files
     WHERE order_id = ?`
  )
    .bind(orderId)
    .all();

  return c.json({
    ...order,
    files,
  });
});

// ============================================
// Vendor Routes
// ============================================

app.post(
  "/api/vendor/login",
  zValidator(
    "json",
    z.object({
      username: z.string(),
      password: z.string(),
    })
  ),
  async (c) => {
    const { username, password } = c.req.valid("json");

    const vendor = await c.env.DB.prepare(
      "SELECT id, password_hash FROM vendors WHERE username = ? AND is_active = 1"
    )
      .bind(username)
      .first<{ id: number; password_hash: string }>();

    if (!vendor || !vendor.password_hash) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const isValid = await verifyVendorPassword(password, vendor.password_hash);

    if (!isValid) {
      return c.json({ error: "Invalid credentials" }, 401);
    }

    const sessionToken = await createVendorSession(c, vendor.id);

    setCookie(c, VENDOR_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "lax",
      secure: true,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return c.json({ success: true });
  }
);

app.get("/api/vendor/me", async (c) => {
  const vendorId = await verifyVendorSession(c);

  if (!vendorId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const vendor = await c.env.DB.prepare(
    "SELECT id, shop_name, contact_email, contact_phone FROM vendors WHERE id = ?"
  )
    .bind(vendorId)
    .first();

  if (!vendor) {
    return c.json({ error: "Vendor not found" }, 404);
  }

  return c.json(vendor);
});

app.post("/api/vendor/logout", async (c) => {
  await deleteVendorSession(c);

  setCookie(c, VENDOR_SESSION_COOKIE, "", {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: true,
    maxAge: 0,
  });

  return c.json({ success: true });
});

app.get("/api/vendor/orders", async (c) => {
  const vendorId = await verifyVendorSession(c);

  if (!vendorId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const { results: orders } = await c.env.DB.prepare(
    `SELECT 
      o.id, o.status, o.total_price, o.delivery_hostel, 
      o.delivery_gate, o.delivery_phone, o.notes, o.created_at,
      u.email as user_email, u.name as user_name
     FROM orders o
     LEFT JOIN users u ON o.user_id = u.id
     WHERE o.vendor_id = ? OR o.status = 'pending'
     ORDER BY 
       CASE o.status
         WHEN 'pending' THEN 1
         WHEN 'accepted' THEN 2
         WHEN 'printing' THEN 3
         WHEN 'out_for_delivery' THEN 4
         WHEN 'delivered' THEN 5
       END,
       o.created_at ASC`
  )
    .bind(vendorId)
    .all();

  const ordersWithFiles = await Promise.all(
    orders.map(async (order: any) => {
      const { results: files } = await c.env.DB.prepare(
        `SELECT 
          id, file_key, original_filename, page_count, color_type,
          is_double_sided, copies, comments
         FROM order_files
         WHERE order_id = ?`
      )
        .bind(order.id)
        .all();

      return {
        ...order,
        files,
      };
    })
  );

  return c.json(ordersWithFiles);
});

app.post("/api/vendor/orders/:id/accept", async (c) => {
  const vendorId = await verifyVendorSession(c);

  if (!vendorId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const orderId = c.req.param("id");

  const order = await c.env.DB.prepare(
    "SELECT id, status FROM orders WHERE id = ?"
  )
    .bind(orderId)
    .first<{ id: number; status: string }>();

  if (!order) {
    return c.json({ error: "Order not found" }, 404);
  }

  if (order.status !== "pending") {
    return c.json({ error: "Order already accepted" }, 400);
  }

  await c.env.DB.prepare(
    `UPDATE orders 
     SET status = 'accepted', vendor_id = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  )
    .bind(vendorId, orderId)
    .run();

  return c.json({ success: true });
});

app.patch(
  "/api/vendor/orders/:id/status",
  zValidator(
    "json",
    z.object({
      status: z.enum(["printing", "out_for_delivery", "delivered"]),
    })
  ),
  async (c) => {
    const vendorId = await verifyVendorSession(c);

    if (!vendorId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const orderId = c.req.param("id");
    const { status } = c.req.valid("json");

    const order = await c.env.DB.prepare(
      "SELECT id, vendor_id FROM orders WHERE id = ?"
    )
      .bind(orderId)
      .first<{ id: number; vendor_id: number }>();

    if (!order) {
      return c.json({ error: "Order not found" }, 404);
    }

    if (order.vendor_id !== vendorId) {
      return c.json({ error: "Not your order" }, 403);
    }

    await c.env.DB.prepare(
      "UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
      .bind(status, orderId)
      .run();

    return c.json({ success: true });
  }
);

app.get("/api/vendor/files/:fileKey{.+}", async (c) => {
  const vendorId = await verifyVendorSession(c);

  if (!vendorId) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const fileKey = c.req.param("fileKey");

  // Verify this file belongs to an order assigned to this vendor OR is pending
  const orderFile = await c.env.DB.prepare(
    `SELECT of.file_key 
     FROM order_files of
     JOIN orders o ON of.order_id = o.id
     WHERE of.file_key = ? AND (o.vendor_id = ? OR o.status = 'pending')`
  )
    .bind(fileKey, vendorId)
    .first();

  if (!orderFile) {
    return c.json({ error: "Unauthorized" }, 403);
  }

  const object = await c.env.R2_BUCKET.get(fileKey);

  if (!object) {
    return c.json({ error: "File not found" }, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);

  return c.body(object.body, { headers });
});

export default app;
