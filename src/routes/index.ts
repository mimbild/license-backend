import { Router } from "express";

import { adminRouter } from "./admin.routes";
import { authRouter } from "./auth.routes";
import { licenseRouter } from "./license.routes";
import { meRouter } from "./me.routes";
import { webhookRouter } from "./webhook.routes";

const apiRouter = Router();

apiRouter.use("/auth", authRouter);
apiRouter.use("/licenses", licenseRouter);
apiRouter.use("/me", meRouter);
apiRouter.use("/admin", adminRouter);
apiRouter.use("/webhooks", webhookRouter);

export { apiRouter };

