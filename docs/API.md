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
| GET | `/auth/me` | – | `user` |
| PATCH | `/users/me` | `{name?,career_goal?,level?}` | `user` |

`user`: `{id,name,email,career_goal,level,created_at,stats:{xp,current_streak,longest_streak,last_active_date}}`

`career_goal`: `frontend` \| `backend` \| `""`. `level`: `beginner` \| `intermediate` \| `advanced`.

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

## System

| Method | Endpoint | Data |
|---|---|---|
| GET | `/health` | `{status:"ok",time,db:"up"}` |
