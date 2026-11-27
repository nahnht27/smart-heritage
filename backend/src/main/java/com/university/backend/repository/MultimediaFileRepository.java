package com.university.backend.repository;

import com.university.backend.dto.MultimediaFileInfo;
import com.university.backend.entity.MultimediaFile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;

public interface MultimediaFileRepository
        extends JpaRepository<MultimediaFile, Integer> {

    @Query("""
            select new com.university.backend.dto.MultimediaFileInfo(
                f.multimediaId, f.fileName, f.contentType, f.fileSize, f.sha256)
            from MultimediaFile f
            where f.multimediaId in :ids
            """)
    List<MultimediaFileInfo> findInfoByIds(@Param("ids") Collection<Integer> ids);
}
