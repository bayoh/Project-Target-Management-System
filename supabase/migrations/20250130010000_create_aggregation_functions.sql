-- Function for jobsApi.getActionStatusByCluster
CREATE OR REPLACE FUNCTION get_cluster_action_stats()
RETURNS TABLE (
    id UUID,
    name TEXT,
    total BIGINT,
    completed BIGINT,
    on_going_on BIGINT, -- Matched to jobsApi.ts ActionStats
    on_going_off BIGINT, -- Matched to jobsApi.ts ActionStats
    not_started BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        COUNT(a.id) AS total,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN a.status = 'on_going_on' THEN 1 END) AS on_going_on,
        COUNT(CASE WHEN a.status = 'on_going_off' THEN 1 END) AS on_going_off,
        COUNT(CASE WHEN a.status = 'not_started' THEN 1 END) AS not_started
    FROM
        clusters c
    LEFT JOIN
        pathways pw ON pw.cluster_id = c.id
    LEFT JOIN
        interventions i ON i.pathway_id = pw.id
    LEFT JOIN
        actions a ON a.intervention_id = i.id
    GROUP BY
        c.id, c.name;
END;
$$ LANGUAGE plpgsql;

-- Function for jobsApi.getJobsByCluster
CREATE OR REPLACE FUNCTION get_cluster_job_targets()
RETURNS TABLE (
    id UUID,
    name TEXT,
    total_target_value BIGINT,
    total_current_value BIGINT,
    women_target_value BIGINT,
    women_current_value BIGINT,
    youth_target_value BIGINT,
    youth_current_value BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.name,
        COALESCE(SUM(at.target_value), 0) AS total_target_value,
        COALESCE(SUM(at.current_value), 0) AS total_current_value,
        COALESCE(SUM(at.women_target), 0) AS women_target_value,
        COALESCE(SUM(at.women_current), 0) AS women_current_value,
        COALESCE(SUM(at.youth_target), 0) AS youth_target_value,
        COALESCE(SUM(at.youth_current), 0) AS youth_current_value
    FROM
        clusters c
    LEFT JOIN
        pathways pw ON pw.cluster_id = c.id
    LEFT JOIN
        interventions i ON i.pathway_id = pw.id
    LEFT JOIN
        actions a ON a.intervention_id = i.id
    LEFT JOIN
        action_targets at ON at.action_id = a.id AND at.category = 'jobs'
    GROUP BY
        c.id, c.name;
END;
$$ LANGUAGE plpgsql;

-- Function for jobsApi.getActionStats
CREATE OR REPLACE FUNCTION get_overall_action_stats()
RETURNS TABLE (
    total BIGINT,
    completed BIGINT,
    on_going_on BIGINT, -- Matched to jobsApi.ts ActionStats
    on_going_off BIGINT, -- Matched to jobsApi.ts ActionStats
    not_started BIGINT
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        COUNT(a.id) AS total,
        COUNT(CASE WHEN a.status = 'completed' THEN 1 END) AS completed,
        COUNT(CASE WHEN a.status = 'on_going_on' THEN 1 END) AS on_going_on,
        COUNT(CASE WHEN a.status = 'on_going_off' THEN 1 END) AS on_going_off,
        COUNT(CASE WHEN a.status = 'not_started' THEN 1 END) AS not_started
    FROM
        actions a;
END;
$$ LANGUAGE plpgsql;

-- Function for projectApi.getProjectStats
CREATE OR REPLACE FUNCTION get_project_and_task_stats()
RETURNS JSONB
AS $$
DECLARE
    action_stats JSONB;
    task_stats JSONB;
BEGIN
    SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
    INTO action_stats
    FROM (
        SELECT status, COUNT(*) as count
        FROM actions
        WHERE status IS NOT NULL
        GROUP BY status
    ) AS action_counts;

    SELECT COALESCE(jsonb_object_agg(status, count), '{}'::jsonb)
    INTO task_stats
    FROM (
        SELECT status, COUNT(*) as count
        FROM tasks
        WHERE status IS NOT NULL
        GROUP BY status
    ) AS task_counts;

    RETURN jsonb_build_object(
        'projects', action_stats,
        'tasks', task_stats
    );
END;
$$ LANGUAGE plpgsql;
