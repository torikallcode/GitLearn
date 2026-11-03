# GitLearn API Contract (v1)

Base URL: `/api/v1`. All responses use the envelope:

```json
{ "success": true, "message": "OK", "data": {}, "error": null }
```

Error envelope:

```json
{
  "success": false,
  "message": "Validation failed",
  "data": null,
  "error": { "code": "VALIDATION_ERROR", "details": [{ "field": "email", "message": "invalid" }] }
}
```

Auth: `Authorization: Bearer <access_token>`.

## Auth

| Method | Endpoint | Body | Data |
|---|---|---|---|
| POST | `/auth/register` | `{name,email,password,career_goal?,level?}` | `{user,access_token,refresh_token}` |
| POST | `/auth/login` | `{email,password}` | `{user,access_token,refresh_token}` |
| POST | `/auth/refresh` | `{refresh_token}` | `{access_token,refresh_token}` |
| GET | `/auth/github` | – | redirect ke GitHub (501 bila belum dikonfigurasi) |
| GET | `/auth/github/callback` | – | redirect ke `${FRONTEND_URL}/oauth/callback#access_token=…&refresh_token=…` |
| GET | `/auth/me` | – | `user` |
| PATCH | `/users/me` | `{name?,career_goal?,level?}` | `user` |

`user`: `{id,name,email,career_goal,level,role,created_at,stats:{xp,current_streak,longest_streak,last_active_date}}`

`career_goal`: `frontend` \| `backend` \| `""`. `level`: `beginner` \| `intermediate` \| `advanced`.
`role`: `learner` \| `admin`.

## Content

| Method | Endpoint | Data |
|---|---|---|
| GET | `/paths` | `[pathSummary]` |
| GET | `/paths/:slug` | `{path,modules}` |
| GET | `/lessons/:slug` | `lessonDetail` |
| GET | `/lessons/:slug/quizzes` | `[{id,question,options:[{id,option_text}]}]` |
| GET | `/cheatsheet?q=` | `[{id,category,command,description,example}]` |
| GET | `/search?q=` | `{lessons:[{slug,title,path_title,module_title}],cheatsheet:[cheatsheetItem]}` |

`pathSummary`: `{id,slug,title,description,order_no,track,module_count,lesson_count,completed_lessons,progress_percent}`

`modules[]`: `{id,title,description,order_no,lesson_count,completed_lessons,progress_percent,lessons:[lessonSummary]}`

`lessonSummary`: `{id,slug,title,estimated_minutes,order_no,status,practice_done,quiz_score,quiz_total,locked}`
`status`: `not_started` \| `in_progress` \| `completed`.

`lessonDetail`: `{id,slug,title,content_md,estimated_minutes,order_no,module:{id,title,path:{slug,title}},practice_config,status,practice_done,quiz_score,quiz_total,prev_slug,next_slug,locked}`

## Progress, quiz & practice

| Method | Endpoint | Body | Data |
|---|---|---|---|
| POST | `/lessons/:slug/practice/complete` | – | `{status,practice_done}` |
| POST | `/quizzes/:id/answer` | `{option_id}` | `{is_correct,correct_option_id,explanation,selected_option_id,quiz_score,quiz_total}` |
| POST | `/lessons/:slug/complete` | `{quiz_score?,quiz_total?}` | `{status,xp_earned,badges:[badge],next_lesson_slug}` |
| GET | `/progress` | – | `{completion_percent,lessons_completed,lessons_total,modules:[moduleProgress],next_lesson,stats,badges}` |
| GET | `/progress/next` | – | `lessonRef \| null` |

`moduleProgress`: `{path_slug,path_title,module_title,lesson_count,completed_lessons,progress_percent}`
`lessonRef`: `{slug,title,path_slug,path_title,module_title}`
`badge`: `{code,name,description,earned_at?}`

## Engagement

| Method | Endpoint | Body | Data |
|---|---|---|---|
| GET | `/reviews/today` | – | `[{id,quiz_id,question,options:[{id,option_text}],lesson_slug,lesson_title,next_review_at,interval_days}]` |
| POST | `/reviews/:id/answer` | `{option_id}` | same as quiz answer + `review_id` |
| GET | `/stats` | – | `stats` |
| GET | `/certificate` | – | `{available,name,completion_percent,completed_lessons,lessons_total,issued_at,certificate_code}` |
| GET | `/certificates/:code` | – | Public certificate document for a shared `certificate_code` (no auth). |

## System

| Method | Endpoint | Data |
|---|---|---|
| GET | `/health` | `{status:"ok",time,db:"up"}` |

## Community

| Method | Endpoint | Body | Data |
|---|---|---|---|
| GET | `/lessons/:slug/comments` | – | `[comment]` |
| POST | `/lessons/:slug/comments` | `{content}` | `comment` |
| DELETE | `/comments/:id` | – | `{deleted:true}` (author or admin) |

`comment`: `{id,lesson_id,lesson_slug,user_id,user_name,content,created_at}`.

## Leaderboard

| Method | Endpoint | Data |
|---|---|---|
| GET | `/leaderboard?limit=20` | `[{rank,user_id,name,xp,current_streak,longest_streak}]` |

## Admin (role `admin`)

| Method | Endpoint | Body | Data |
|---|---|---|---|
| GET | `/admin/lessons` | – | `[admin_lesson]` |
| GET | `/admin/lessons/:id` | – | `admin_lesson` |
| PATCH | `/admin/lessons/:id` | `{title?,content_md?,estimated_minutes?,order_no?,is_published?}` | `admin_lesson` |
| GET | `/admin/lessons/:id/quizzes` | – | `[admin_quiz]` |
| POST | `/admin/lessons/:id/quizzes` | `{question,explanation,order_no,options:[{option_text,is_correct}]}` | `admin_quiz` |
| PATCH | `/admin/quizzes/:id` | same as create | `admin_quiz` |
| DELETE | `/admin/quizzes/:id` | – | `{deleted:true}` |

`admin_lesson`: `{id,module_id,slug,title,content_md,estimated_minutes,order_no,is_published,module_title,path_slug,path_title,quiz_count}`.
`admin_quiz`: `{id,lesson_id,question,explanation,order_no,options:[{id,option_text,is_correct,order_no}]}`.
Exactly one option must have `is_correct: true`.

Bootstrap an admin account by setting `ADMIN_EMAIL` and `ADMIN_PASSWORD` before running `go run ./cmd/seed`.
