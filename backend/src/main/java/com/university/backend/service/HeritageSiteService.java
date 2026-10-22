package com.university.backend.service;

import com.university.backend.entity.HeritageSite;
import com.university.backend.exception.ResourceNotFoundException;
import com.university.backend.repository.HeritageSiteRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HeritageSiteService {

    private final HeritageSiteRepository heritageSiteRepository;

    public HeritageSiteService(
            HeritageSiteRepository heritageSiteRepository) {
        this.heritageSiteRepository = heritageSiteRepository;
    }

    @Transactional(readOnly = true)
    public List<HeritageSite> getAllHeritageSites() {
        return heritageSiteRepository.findAll();
    }

    @Transactional(readOnly = true)
    public HeritageSite getHeritageSiteById(Integer siteId) {
        return heritageSiteRepository.findById(siteId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Heritage site not found with ID: " + siteId));
    }

    @Transactional
    public HeritageSite createHeritageSite(HeritageSite heritageSite) {
        heritageSite.setSiteId(null);
        return heritageSiteRepository.save(heritageSite);
    }

    @Transactional
    public HeritageSite updateHeritageSite(
            Integer siteId,
            HeritageSite updatedHeritageSite) {

        HeritageSite existingSite = getHeritageSiteById(siteId);

        existingSite.setName(updatedHeritageSite.getName());
        existingSite.setDescription(updatedHeritageSite.getDescription());
        existingSite.setAddress(updatedHeritageSite.getAddress());
        existingSite.setLatitude(updatedHeritageSite.getLatitude());
        existingSite.setLongitude(updatedHeritageSite.getLongitude());

        return heritageSiteRepository.save(existingSite);
    }

    @Transactional
    public void deleteHeritageSite(Integer siteId) {
        HeritageSite existingSite = getHeritageSiteById(siteId);
        heritageSiteRepository.delete(existingSite);
    }
}
