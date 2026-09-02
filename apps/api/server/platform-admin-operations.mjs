export async function readPlatformOverview({ database }) {
  const result = await database.query(
    `select
       (select count(*)::int from public.workspaces) as workspace_count,
       (select count(*)::int from public.shopify_stores) as shopify_store_count,
       (select count(*)::int from public.storefronts) as storefront_count,
       (select count(*)::int from public.store_subscriptions where status = 'active') as active_subscription_count,
       (select count(*)::int from private.webhook_events where status = 'failed') as failed_webhook_count,
       (select count(*)::int from private.webhook_events where status = 'dead_letter') as dead_letter_webhook_count`
  )
  const row = result.rows[0]
  return {
    workspaces: row.workspace_count,
    shopifyStores: row.shopify_store_count,
    storefronts: row.storefront_count,
    activeSubscriptions: row.active_subscription_count,
    failedWebhooks: row.failed_webhook_count,
    deadLetterWebhooks: row.dead_letter_webhook_count
  }
}

export async function listPlatformWorkspaces({ database, page = 1, pageSize = 25 }) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
  const safePageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 25))
  const result = await database.query(
    `select workspace.id, workspace.name, workspace.created_at,
            count(*) over()::int as total_count,
            (select count(*)::int from public.workspace_memberships membership
             where membership.workspace_id = workspace.id) as member_count,
            (select count(*)::int from public.shopify_stores store
             where store.workspace_id = workspace.id) as store_count,
            (select auth_user.email
             from public.workspace_memberships owner_membership
             join auth.users auth_user on auth_user.id = owner_membership.user_id
             where owner_membership.workspace_id = workspace.id and owner_membership.role = 'owner'
             order by owner_membership.created_at, auth_user.id
             limit 1) as owner_email
     from public.workspaces workspace
     order by workspace.created_at desc, workspace.id desc
     limit $1 offset $2`,
    [safePageSize, (safePage - 1) * safePageSize]
  )
  return {
    items: result.rows.map(row => ({
      id: row.id,
      name: row.name,
      ownerEmail: row.owner_email,
      memberCount: row.member_count,
      storeCount: row.store_count,
      createdAt: row.created_at
    })),
    page: safePage,
    pageSize: safePageSize,
    total: result.rows[0]?.total_count || 0
  }
}

export async function listPlatformStores({ database, page = 1, pageSize = 25 }) {
  const safePage = Math.max(1, Number.parseInt(page, 10) || 1)
  const safePageSize = Math.min(50, Math.max(1, Number.parseInt(pageSize, 10) || 25))
  const result = await database.query(
    `select store.id, store.shop_name, store.current_myshopify_domain, store.status,
            workspace.id as workspace_id, workspace.name as workspace_name,
            storefront.id as storefront_id, storefront.status as storefront_status,
            subscription.plan_key, subscription.status as subscription_status,
            subscription.current_period_end, subscription.cancel_at_period_end,
            count(*) over()::int as total_count,
            (select count(*)::int from public.onboarding_progress progress
             where progress.storefront_id = storefront.id) as onboarding_total,
            (select count(*)::int from public.onboarding_progress progress
             where progress.storefront_id = storefront.id and progress.status = 'completed') as onboarding_completed
     from public.shopify_stores store
     join public.workspaces workspace on workspace.id = store.workspace_id
     left join public.storefronts storefront on storefront.shopify_store_id = store.id
     left join public.store_subscriptions subscription on subscription.storefront_id = storefront.id
     order by store.created_at desc, store.id desc
     limit $1 offset $2`,
    [safePageSize, (safePage - 1) * safePageSize]
  )
  return {
    items: result.rows.map(row => ({
      id: row.id, name: row.shop_name, myshopifyDomain: row.current_myshopify_domain,
      status: row.status, workspace: { id: row.workspace_id, name: row.workspace_name },
      storefront: row.storefront_id ? { id: row.storefront_id, status: row.storefront_status } : null,
      subscription: row.plan_key ? { planKey: row.plan_key, status: row.subscription_status,
        currentPeriodEnd: row.current_period_end, cancelAtPeriodEnd: row.cancel_at_period_end } : null,
      onboarding: { completed: row.onboarding_completed, total: row.onboarding_total }
    })),
    page: safePage, pageSize: safePageSize, total: result.rows[0]?.total_count || 0
  }
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export async function readPlatformStore({ database, storeId }) {
  if (!UUID.test(String(storeId || ''))) throw new Error('invalid_store_id')
  const result = await database.query(
    `select store.id, store.shop_name, store.current_myshopify_domain, store.status,
      workspace.id workspace_id, workspace.name workspace_name,
      storefront.id storefront_id, storefront.status storefront_status,
      subscription.plan_key, subscription.status subscription_status,
      subscription.current_period_start, subscription.current_period_end, subscription.cancel_at_period_end
     from public.shopify_stores store join public.workspaces workspace on workspace.id=store.workspace_id
     left join public.storefronts storefront on storefront.shopify_store_id=store.id
     left join public.store_subscriptions subscription on subscription.storefront_id=storefront.id
     where store.id=$1`, [storeId])
  const row = result.rows[0]; if (!row) return null
  const progress = row.storefront_id ? await database.query(
    `select step_key, status, completed_at, updated_at from public.onboarding_progress
     where storefront_id=$1 order by updated_at, step_key`, [row.storefront_id]) : { rows: [] }
  return { id:row.id,name:row.shop_name,myshopifyDomain:row.current_myshopify_domain,status:row.status,
    workspace:{id:row.workspace_id,name:row.workspace_name},
    storefront:row.storefront_id?{id:row.storefront_id,status:row.storefront_status}:null,
    subscription:row.plan_key?{planKey:row.plan_key,status:row.subscription_status,currentPeriodStart:row.current_period_start,currentPeriodEnd:row.current_period_end,cancelAtPeriodEnd:row.cancel_at_period_end}:null,
    onboarding:progress.rows.map(step=>({key:step.step_key,status:step.status,completedAt:step.completed_at,updatedAt:step.updated_at})) }
}

export async function listPlatformOperations({ database, limit = 50 }) {
  const safeLimit = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 50))
  const [webhooks, audits] = await Promise.all([
    database.query(`select event.id,event.topic,event.status,event.attempt_count,event.error_message,
      event.received_at,event.last_attempt_at,store.shop_name
      from private.webhook_events event left join public.shopify_stores store on store.id=event.shopify_store_id
      order by event.received_at desc limit $1`, [safeLimit]),
    database.query(`select audit.id,audit.action,audit.target_type,audit.target_id,audit.created_at,
      workspace.name workspace_name,actor.email actor_email
      from private.audit_logs audit left join public.workspaces workspace on workspace.id=audit.workspace_id
      left join auth.users actor on actor.id=audit.actor_user_id order by audit.created_at desc limit $1`, [safeLimit])
  ])
  return {
    webhooks: webhooks.rows.map(row=>({id:row.id,topic:row.topic,status:row.status,attemptCount:row.attempt_count,errorMessage:safeOperationalError(row.error_message),receivedAt:row.received_at,lastAttemptAt:row.last_attempt_at,storeName:row.shop_name})),
    audits: audits.rows.map(row=>({id:row.id,action:row.action,targetType:row.target_type,targetId:row.target_id,createdAt:row.created_at,workspaceName:row.workspace_name,actorEmail:row.actor_email}))
  }
}

export async function readPlatformCatalog({ database }) {
  const [niches,presets]=await Promise.all([
    database.query(`select id,key,name,description,is_active,display_order from public.niches order by display_order,name`),
    database.query(`select preset.id,preset.name,preset.title,preset.is_active,preset.display_order,niche.name niche_name
      from public.banner_presets preset join public.niches niche on niche.id=preset.niche_id order by niche.display_order,preset.display_order,preset.name`)
  ])
  return {niches:niches.rows.map(r=>({id:r.id,key:r.key,name:r.name,description:r.description,isActive:r.is_active,displayOrder:r.display_order})),presets:presets.rows.map(r=>({id:r.id,name:r.name,title:r.title,nicheName:r.niche_name,isActive:r.is_active,displayOrder:r.display_order}))}
}

export async function setPlatformCatalogActive({database,admin,kind,id,active,reason}){
  if(!['owner','admin'].includes(admin?.role))throw new Error('platform_admin_write_denied')
  if(!['niche','banner_preset'].includes(kind)||!UUID.test(String(id||''))||typeof active!=='boolean'||String(reason||'').trim().length<5)throw new Error('invalid_catalog_change')
  const table=kind==='niche'?'niches':'banner_presets',client=await database.connect()
  try{await client.query('begin');const changed=await client.query(`update public.${table} set is_active=$1,updated_at=now() where id=$2 returning id`,[active,id]);if(!changed.rows[0])throw new Error('catalog_item_not_found');await client.query(`insert into private.audit_logs(actor_user_id,action,target_type,target_id,metadata) values($1,'platform_catalog.active_changed',$2,$3,$4)`,[admin.userId,kind,id,{active,reason:String(reason).trim()}]);await client.query('commit');return{kind,id,isActive:active}}catch(error){await client.query('rollback').catch(()=>{});throw error}finally{client.release()}
}

export async function setPlatformStorefrontStatus({database,admin,storeId,status,reason,confirmation}){
  if(!['owner','admin'].includes(admin?.role))throw new Error('platform_admin_write_denied')
  if(!UUID.test(String(storeId||''))||!['active','suspended'].includes(status)||String(reason||'').trim().length<10)throw new Error('invalid_storefront_status_change')
  const client=await database.connect()
  try{await client.query('begin');const target=await client.query(`select store.shop_name,storefront.id,storefront.status from public.shopify_stores store join public.storefronts storefront on storefront.shopify_store_id=store.id where store.id=$1 for update of storefront`,[storeId]);const row=target.rows[0];if(!row)throw new Error('platform_store_not_found');if(confirmation!==row.shop_name)throw new Error('storefront_confirmation_mismatch');await client.query(`update public.storefronts set status=$1,updated_at=now() where id=$2`,[status,row.id]);await client.query(`insert into private.audit_logs(actor_user_id,action,target_type,target_id,metadata) values($1,$2,'storefront',$3,$4)`,[admin.userId,status==='suspended'?'platform_storefront.suspended':'platform_storefront.reactivated',row.id,{storeId,reason:String(reason).trim(),previousStatus:row.status,newStatus:status}]);await client.query('commit');return{id:row.id,status}}catch(error){await client.query('rollback').catch(()=>{});throw error}finally{client.release()}
}

function safeOperationalError(value) {
  if (!value) return null
  return String(value).replace(/(bearer\s+|token[=: ]+|sk_(?:live|test)_)[^\s,;]+/gi, '$1[REDACTED]').slice(0, 300)
}
