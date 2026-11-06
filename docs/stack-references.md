# Alternative stack references (templates, not runnable apps)

All keep the same REST contract and envelope as the Node API, so the React client works unchanged.

## Java Spring Boot (+ JPA, PostgreSQL/MySQL)
```java
@Entity class Flight { @Id @GeneratedValue UUID id; @Column(unique=true) String flightNumber; /* ... */ }
record FlightRequest(@NotBlank String flightNumber, @Size(min=3,max=3) String origin, @Positive int capacity) {}
interface FlightRepository extends JpaRepository<Flight, UUID> {
  Page<Flight> findByFlightNumberContainingIgnoreCase(String q, Pageable p); }
@Service class FlightService { /* @Transactional business rules */ }
@RestController @RequestMapping("/api/v1/flights") class FlightController {
  @GetMapping Page<Flight> list(@RequestParam(defaultValue="") String search, Pageable p) {...}
  @PostMapping @ResponseStatus(CREATED) Flight create(@Valid @RequestBody FlightRequest r) {...} }
@RestControllerAdvice class GlobalExceptionHandler {
  @ExceptionHandler(MethodArgumentNotValidException.class) ResponseEntity<?> invalid(...) {/* {success:false,errors:[..]} */} }
```
Config: `spring.jpa.hibernate.ddl-auto=validate` with Flyway migrations. Note: this machine has Java 8 only; Spring Boot 3 needs Java 17+.

## Python FastAPI (+ SQLAlchemy, Pydantic)
```python
class FlightIn(BaseModel):
    flight_number: str = Field(min_length=2, max_length=10)
    origin: constr(min_length=3, max_length=3)
router = APIRouter(prefix="/api/v1/flights")
def get_db():
    with SessionLocal() as db: yield db
@router.post("", status_code=201)
def create(body: FlightIn, db: Session = Depends(get_db)): return flight_service.create(db, body)
@app.exception_handler(RequestValidationError)
async def invalid(_, exc): return JSONResponse(status_code=400, content={"success": False, "message": "Validation failed", "errors": exc.errors()})
```
Layers: routers -> services -> models (SQLAlchemy) with Alembic migrations.

## Node + MongoDB (Mongoose)
```js
const flightSchema = new Schema({ flightNumber: { type: String, unique: true, required: true } }, { timestamps: true });
export const Flight = model('Flight', flightSchema);
// repository: Flight.find(filter).sort(sort).skip(skip).limit(limit).lean(); service/controller/routes unchanged
```

## Mobile (React Native / Flutter)
Same endpoints. Cookies are awkward on mobile: add a `POST /auth/login` variant returning a bearer token (the middleware already accepts `Authorization: Bearer`) and store it in Keychain/Keystore (`expo-secure-store` / `flutter_secure_storage`), never AsyncStorage. Reuse the zod/Pydantic contract as DTOs.

## AI integration pattern (optional, not implemented)
Use only with a real use case. Backend endpoint `POST /api/v1/assistant`: build a prompt template, call the LLM API server-side (key in env, never the browser), request structured JSON and validate it with Zod/Pydantic before use. RAG: chunk documents -> embeddings -> store in pgvector (`CREATE EXTENSION vector`) -> top-k similarity search -> put chunks in the prompt with source ids. Prefer FastAPI when Python ML libraries are needed. Notification Center is also not implemented.
