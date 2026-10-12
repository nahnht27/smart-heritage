package com.university.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "role")
public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "role_id")
    private Integer roleId;

    @Column(name = "name", nullable = false, unique = true, length = 50)
    private String name;

    public Role() {}
    public Role(String name) { this.name = name; }

    public Integer getRoleId() { return roleId; }
    public void setRoleId(Integer roleId) { this.roleId = roleId; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
}
