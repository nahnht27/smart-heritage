package com.university.backend.integration;

import com.university.backend.dto.CreateInteractionRequest;
import com.university.backend.dto.InteractionCreationResult;
import com.university.backend.dto.InteractionSummaryResponse;
import com.university.backend.entity.Artifact;
import com.university.backend.entity.HeritageSite;
import com.university.backend.entity.Role;
import com.university.backend.entity.User;
import com.university.backend.repository.ArtifactRepository;
import com.university.backend.repository.HeritageSiteRepository;
import com.university.backend.repository.RoleRepository;
import com.university.backend.repository.UserRepository;
import com.university.backend.repository.VisitorInteractionRepository;
import com.university.backend.service.VisitorInteractionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.time.Instant;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("postgres-test")
@EnabledIfEnvironmentVariable(
        named = "SPRING_DATASOURCE_URL",
        matches = "jdbc:postgresql:.*")
class VisitorInteractionPostgresIntegrationTest {
    private static final UUID VISITOR_ONE =
            UUID.fromString("11111111-1111-4111-8111-111111111111");
    private static final UUID VISITOR_TWO =
            UUID.fromString("22222222-2222-4222-8222-222222222222");
    private static final Instant STARTED_AT =
            Instant.parse("2026-10-20T10:00:00Z");

    @Autowired
    private VisitorInteractionService interactionService;

    @Autowired
    private VisitorInteractionRepository interactionRepository;

    @Autowired
    private ArtifactRepository artifactRepository;

    @Autowired
    private HeritageSiteRepository heritageSiteRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private Artifact artifact;
    private User user;

    @BeforeEach
    void setUpPostgresFixtures() {
        interactionRepository.deleteAll();
        artifactRepository.deleteAll();
        heritageSiteRepository.deleteAll();
        userRepository.deleteAll();
        roleRepository.deleteAll();

        HeritageSite site = new HeritageSite();
        site.setName("PostgreSQL integration site");
        site.setDescription("Isolated test data");
        site = heritageSiteRepository.save(site);

        artifact = new Artifact();
        artifact.setHeritageSite(site);
        artifact.setName("PostgreSQL integration artifact");
        artifact.setDescription("Isolated test data");
        artifact = artifactRepository.save(artifact);

        Role role = roleRepository.save(new Role("VISITOR"));
        user = new User();
        user.setUsername("postgres_integration_user");
        user.setEmail("postgres-integration@example.com");
        user.setPasswordHash("not-used-in-this-test");
        user.setRole(role);
        user = userRepository.save(user);
    }

    @Test
    void flywayMigratesFreshPostgresAndHibernateValidatesSchema() {
        Integer nullable = jdbcTemplate.queryForObject("""
                select count(*)
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'user_id'
                  and is_nullable = 'YES'
                """, Integer.class);
        assertEquals(1, nullable);

        String visitorType = jdbcTemplate.queryForObject("""
                select data_type
                from information_schema.columns
                where table_schema = 'public'
                  and table_name = 'visitor_interaction'
                  and column_name = 'visitor_id'
                """, String.class);
        assertEquals("uuid", visitorType);

        Integer appliedV2 = jdbcTemplate.queryForObject("""
                select count(*)
                from flyway_schema_history
                where version = '2' and success = true
                """, Integer.class);
        assertEquals(1, appliedV2);
    }

    @Test
    void anonymousAndAuthenticatedEventsUseDistinctVisitors() {
        InteractionCreationResult anonymous = interactionService.createInteraction(
                null, request(UUID.randomUUID(), VISITOR_ONE, STARTED_AT));
        InteractionCreationResult authenticated = interactionService.createInteraction(
                user.getUsername(),
                request(UUID.randomUUID(), VISITOR_TWO, STARTED_AT.plusSeconds(10)));
        interactionService.createInteraction(
                null, request(UUID.randomUUID(), VISITOR_ONE, STARTED_AT.plusSeconds(20)));

        assertNull(anonymous.interaction().getUser());
        assertEquals(VISITOR_ONE, anonymous.interaction().getVisitorId());
        assertNotNull(authenticated.interaction().getUser());
        assertEquals(user.getUserId(), authenticated.interaction().getUser().getUserId());

        InteractionSummaryResponse summary = interactionService.getSummary(
                STARTED_AT.minusSeconds(1), STARTED_AT.plusSeconds(60));

        assertEquals(3, summary.totalInteractions());
        assertEquals(2, summary.uniqueVisitors());
        assertEquals(1, summary.interactionTypes().size());
        assertEquals("VIEW", summary.interactionTypes().get(0).interactionType());
        assertEquals(1, summary.popularArtifacts().size());
        assertEquals(artifactId(), summary.popularArtifacts().get(0).artifactId());
        assertEquals(3, summary.popularArtifacts().get(0).interactionCount());
    }

    @Test
    void idempotencyIsScopedToVisitorIdentity() {
        UUID eventId = UUID.randomUUID();
        CreateInteractionRequest request = request(eventId, VISITOR_ONE, STARTED_AT);

        InteractionCreationResult first = interactionService.createInteraction(null, request);
        InteractionCreationResult retry = interactionService.createInteraction(null, request);

        assertTrue(first.created());
        assertFalse(retry.created());
        assertEquals(first.interaction().getInteractionId(),
                retry.interaction().getInteractionId());
        assertEquals(1, interactionRepository.count());

        CreateInteractionRequest otherVisitor =
                request(eventId, VISITOR_TWO, STARTED_AT);
        assertThrows(
                com.university.backend.exception.DuplicateResourceException.class,
                () -> interactionService.createInteraction(null, otherVisitor));
    }

    private int artifactId() {
        return artifact.getArtifactId();
    }

    private CreateInteractionRequest request(
            UUID eventId,
            UUID visitorId,
            Instant interactedAt) {
        CreateInteractionRequest request = new CreateInteractionRequest();
        request.setEventId(eventId);
        request.setVisitorId(visitorId);
        request.setArtifactId(artifact.getArtifactId());
        request.setInteractionType("VIEW");
        request.setLanguageCode("vi");
        request.setStartedAt(interactedAt);
        request.setEndedAt(interactedAt.plusSeconds(30));
        request.setInteractedAt(interactedAt);
        return request;
    }
}
