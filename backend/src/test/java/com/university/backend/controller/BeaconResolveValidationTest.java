package com.university.backend.controller;

import com.university.backend.dto.BeaconResponse;
import com.university.backend.exception.GlobalExceptionHandler;
import com.university.backend.security.JwtAuthenticationFilter;
import com.university.backend.security.SecurityErrorHandler;
import com.university.backend.service.BeaconService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;
import java.util.stream.Stream;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BeaconController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
class BeaconResolveValidationTest {

    private static final UUID BEACON_UUID =
            UUID.fromString("e2c56db5-dffb-48d2-b060-d0f5a71096e0");

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private BeaconService beaconService;

    @MockBean
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @MockBean
    private SecurityErrorHandler securityErrorHandler;

    @BeforeEach
    void resetService() {
        reset(beaconService);
    }

    @ParameterizedTest(name = "major={0}, minor={1} is rejected")
    @MethodSource("invalidRanges")
    void rejectsOutOfRangeOrMalformedValuesWithoutCallingTheService(
            String major,
            String minor) throws Exception {

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", major)
                        .param("minor", minor))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(beaconService);
    }

    @Test
    void rejectsMissingParametersWithoutCallingTheService() throws Exception {
        mockMvc.perform(get("/api/beacons/resolve"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("minor", "1"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", "1"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("major", "1")
                        .param("minor", "1"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(beaconService);
    }

    @Test
    void rejectsMalformedUuidWithoutCallingTheService() throws Exception {
        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", "not-a-uuid")
                        .param("major", "1")
                        .param("minor", "1"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verifyNoInteractions(beaconService);
    }

    @ParameterizedTest(name = "major={0}, minor={1} is accepted")
    @CsvSource({
            "0, 0",
            "0, 65535",
            "65535, 0",
            "65535, 65535"
    })
    void acceptsInclusiveBoundaryValues(int major, int minor) throws Exception {
        when(beaconService.resolveBeacon(any(), any(), any()))
                .thenReturn(new BeaconResponse(
                        1,
                        "Boundary Beacon",
                        BEACON_UUID,
                        major,
                        minor,
                        true,
                        null,
                        null,
                        null,
                        null));

        mockMvc.perform(get("/api/beacons/resolve")
                        .param("uuid", BEACON_UUID.toString())
                        .param("major", String.valueOf(major))
                        .param("minor", String.valueOf(minor)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.major").value(major))
                .andExpect(jsonPath("$.data.minor").value(minor));

        verify(beaconService).resolveBeacon(BEACON_UUID, major, minor);
    }

    private static Stream<Arguments> invalidRanges() {
        return Stream.of(
                Arguments.of("70000", "1"),
                Arguments.of("-1", "1"),
                Arguments.of("65536", "1"),
                Arguments.of("1", "70000"),
                Arguments.of("1", "-1"),
                Arguments.of("1", "65536"),
                Arguments.of("abc", "1"),
                Arguments.of("1", "abc"),
                Arguments.of("1.5", "1"),
                Arguments.of("1", "1.5"),
                Arguments.of("", "1"),
                Arguments.of("1", ""));
    }
}
