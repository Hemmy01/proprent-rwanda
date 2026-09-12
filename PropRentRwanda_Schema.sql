-- ============================================================
-- PropRent Rwanda – Database Schema
-- SQL Server / T-SQL
-- Run this entire file in SSMS against your SQL Server instance
-- ============================================================

-- Drop and recreate cleanly
IF EXISTS (SELECT name FROM sys.databases WHERE name = 'PropRentRwanda')
BEGIN
    ALTER DATABASE PropRentRwanda SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE PropRentRwanda;
END
GO

CREATE DATABASE PropRentRwanda;
GO

USE PropRentRwanda;
GO

-- ============================================================
-- USERS
-- ============================================================
CREATE TABLE Users (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    FullName     NVARCHAR(100)  NOT NULL,
    Email        NVARCHAR(150)  NOT NULL UNIQUE,
    Phone        NVARCHAR(20)   NULL,
    PasswordHash NVARCHAR(256)  NOT NULL,
    Role         NVARCHAR(20)   NOT NULL DEFAULT 'tenant',  -- 'tenant' | 'admin'
    IsActive     BIT            NOT NULL DEFAULT 1,
    CreatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE()
);

-- ============================================================
-- USER PREFERENCES  (AI matching)
-- ============================================================
CREATE TABLE UserPreferences (
    Id                INT IDENTITY(1,1) PRIMARY KEY,
    UserId            INT            NOT NULL UNIQUE,
    ListingType       NVARCHAR(10)   NULL,   -- 'rent' | 'sale'
    PropertyType      NVARCHAR(30)   NULL,
    MaxPrice          DECIMAL(18,2)  NULL,
    MinBedrooms       INT            NULL,
    PreferredLocation NVARCHAR(100)  NULL,
    UpdatedAt         DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_UserPreferences_Users FOREIGN KEY (UserId)
        REFERENCES Users(Id) ON DELETE CASCADE
);

-- ============================================================
-- AGENTS
-- ============================================================
CREATE TABLE Agents (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT            NULL,
    FullName  NVARCHAR(100)  NOT NULL,
    Role      NVARCHAR(50)   NOT NULL DEFAULT 'Property Agent',
    AvatarUrl NVARCHAR(500)  NULL,
    Phone     NVARCHAR(20)   NULL,
    Email     NVARCHAR(150)  NULL,
    IsActive  BIT            NOT NULL DEFAULT 1,
    CreatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Agents_Users FOREIGN KEY (UserId)
        REFERENCES Users(Id) ON DELETE SET NULL
);

-- ============================================================
-- PROPERTIES
-- ============================================================
CREATE TABLE Properties (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    Title        NVARCHAR(200)  NOT NULL,
    Location     NVARCHAR(200)  NOT NULL,
    PropertyType NVARCHAR(30)   NOT NULL,  -- Apartment | House | Studio | Townhouse | Commercial
    ListingType  NVARCHAR(10)   NOT NULL,  -- 'rent' | 'sale'
    Price        DECIMAL(18,2)  NOT NULL,
    Bedrooms     INT            NOT NULL DEFAULT 0,
    Bathrooms    INT            NOT NULL DEFAULT 1,
    Parking      INT            NOT NULL DEFAULT 0,
    SizeM2       DECIMAL(10,2)  NOT NULL,
    Description  NVARCHAR(MAX)  NULL,
    IsFeatured   BIT            NOT NULL DEFAULT 0,
    IsAvailable  BIT            NOT NULL DEFAULT 1,
    AgentId      INT            NULL,
    CreatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Properties_Agents FOREIGN KEY (AgentId)
        REFERENCES Agents(Id) ON DELETE SET NULL
);

-- ============================================================
-- PROPERTY IMAGES
-- ============================================================
CREATE TABLE PropertyImages (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    PropertyId INT            NOT NULL,
    ImageUrl   NVARCHAR(500)  NOT NULL,
    IsPrimary  BIT            NOT NULL DEFAULT 0,
    SortOrder  INT            NOT NULL DEFAULT 0,

    CONSTRAINT FK_PropertyImages_Properties FOREIGN KEY (PropertyId)
        REFERENCES Properties(Id) ON DELETE CASCADE
);

-- ============================================================
-- PROPERTY AMENITIES
-- ============================================================
CREATE TABLE PropertyAmenities (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    PropertyId INT            NOT NULL,
    Amenity    NVARCHAR(100)  NOT NULL,

    CONSTRAINT FK_PropertyAmenities_Properties FOREIGN KEY (PropertyId)
        REFERENCES Properties(Id) ON DELETE CASCADE
);

-- ============================================================
-- APPLICATIONS
-- ============================================================
CREATE TABLE Applications (
    Id          INT IDENTITY(1,1) PRIMARY KEY,
    PropertyId  INT            NOT NULL,
    TenantId    INT            NOT NULL,
    Message     NVARCHAR(MAX)  NULL,
    Status      NVARCHAR(20)   NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
    ViewingDate DATE           NULL,
    CreatedAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Applications_Properties FOREIGN KEY (PropertyId)
        REFERENCES Properties(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Applications_Users FOREIGN KEY (TenantId)
        REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_Applications_PropertyTenant UNIQUE (PropertyId, TenantId)
);

-- ============================================================
-- WISHLIST
-- FIX: Properties side uses NO ACTION to avoid multiple cascade
--      paths through Users -> Applications -> Properties
-- ============================================================
CREATE TABLE Wishlist (
    Id         INT IDENTITY(1,1) PRIMARY KEY,
    UserId     INT            NOT NULL,
    PropertyId INT            NOT NULL,
    SavedAt    DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Wishlist_Users FOREIGN KEY (UserId)
        REFERENCES Users(Id) ON DELETE CASCADE,
    CONSTRAINT FK_Wishlist_Properties FOREIGN KEY (PropertyId)
        REFERENCES Properties(Id) ON DELETE NO ACTION,
    CONSTRAINT UQ_Wishlist_UserProperty UNIQUE (UserId, PropertyId)
);

-- ============================================================
-- REFRESH TOKENS
-- ============================================================
CREATE TABLE RefreshTokens (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    UserId    INT            NOT NULL,
    Token     NVARCHAR(500)  NOT NULL UNIQUE,
    ExpiresAt DATETIME2      NOT NULL,
    IsRevoked BIT            NOT NULL DEFAULT 0,
    CreatedAt DATETIME2      NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_RefreshTokens_Users FOREIGN KEY (UserId)
        REFERENCES Users(Id) ON DELETE CASCADE
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IX_Properties_ListingType  ON Properties(ListingType);
CREATE INDEX IX_Properties_PropertyType ON Properties(PropertyType);
CREATE INDEX IX_Properties_IsAvailable  ON Properties(IsAvailable);
CREATE INDEX IX_Applications_TenantId   ON Applications(TenantId);
CREATE INDEX IX_Applications_Status     ON Applications(Status);
CREATE INDEX IX_Wishlist_UserId         ON Wishlist(UserId);

-- ============================================================
-- SEED DATA
-- ============================================================

-- Agents
INSERT INTO Agents (FullName, Role, AvatarUrl, Phone, Email) VALUES
('Amina Uwase',          'Senior Agent',      'https://i.pravatar.cc/48?img=47', '+250 788 111 001', 'amina@proprent.rw'),
('Jean-Pierre Habimana', 'Property Agent',    'https://i.pravatar.cc/48?img=12', '+250 788 111 002', 'jp@proprent.rw'),
('Grace Mukamana',       'Luxury Specialist', 'https://i.pravatar.cc/48?img=32', '+250 788 111 003', 'grace@proprent.rw'),
('Eric Nshimiyimana',    'Property Agent',    'https://i.pravatar.cc/48?img=15', '+250 788 111 004', 'eric@proprent.rw');

-- ============================================================
-- DEMO USERS
-- Passwords hashed with BCrypt.Net cost factor 11
-- admin@proprent.rw   → admin123
-- tenant@proprent.rw  → tenant123
-- ============================================================
INSERT INTO Users (FullName, Email, Phone, PasswordHash, Role) VALUES
('Admin User',        'admin@proprent.rw',  '+250 788 000 000', '$2a$11$nFj2/1skmq7Ww/xzP5yXhuPVVPN.JcAdZhZfw438.xWRoNl6d1uDS', 'admin'),
('Olivier Nkurunziza','tenant@proprent.rw', '+250 788 123 456', '$2a$11$NwH9YgEUY3dvTEoGWZL36u/lYxIVPFTrpybCTb3.w8EGP2WqEj7q.', 'tenant');

-- Properties
INSERT INTO Properties (Title, Location, PropertyType, ListingType, Price, Bedrooms, Bathrooms, Parking, SizeM2, Description, IsFeatured, IsAvailable, AgentId) VALUES
('Modern 3-Bedroom Apartment', 'Kiyovu, Kigali',            'Apartment',  'rent',  450000,   3, 2, 1, 120, 'Spacious modern apartment in the heart of Kiyovu with stunning city views.',  1, 1, 1),
('Cozy Studio in Nyamirambo',  'Nyamirambo, Kigali',        'Studio',     'rent',  180000,   1, 1, 0,  45, 'Charming studio apartment perfectly located in vibrant Nyamirambo.',         0, 1, 2),
('Luxury 4-Bedroom Villa',     'Kimihurura, Kigali',        'House',      'sale',  85000000, 4, 3, 2, 280, 'Stunning luxury villa in the prestigious Kimihurura area.',                  1, 1, 3),
('2-Bedroom Townhouse',        'Remera, Kigali',            'Townhouse',  'rent',  320000,   2, 2, 1,  95, 'Well-maintained townhouse in a secure complex close to schools.',            0, 1, 4),
('Lakefront 2-Bedroom Flat',   'Rubavu, Western Province',  'Apartment',  'sale',  42000000, 2, 1, 1,  85, 'Breathtaking lakefront property with unobstructed views of Lake Kivu.',     1, 1, 1),
('Bachelor Apartment',         'Gikondo, Kigali',           'Studio',     'rent',  120000,   1, 1, 0,  35, 'Affordable bachelor apartment in Gikondo close to the bus station.',        0, 0, 2),
('Family Home with Garden',    'Musanze, Northern Province','House',      'sale',  38000000, 3, 2, 2, 210, 'Lovely family home near Volcanoes National Park with large garden.',         0, 1, 3),
('Modern Office Space',        'CBD, Kigali',               'Commercial', 'rent',  950000,   0, 2, 4, 180, 'Premium office space in Kigali CBD with meeting rooms and fibre internet.', 0, 1, 4),
('Hillside 3-Bedroom House',   'Nyarutarama, Kigali',       'House',      'rent',  580000,   3, 2, 2, 160, 'Beautiful hillside home in upscale Nyarutarama with panoramic city views.',  1, 1, 1),
('Affordable 1-Bedroom Flat',  'Muhima, Kigali',            'Apartment',  'rent',  150000,   1, 1, 0,  50, 'Clean and affordable apartment in Muhima, great for young professionals.',  0, 1, 2);

-- Property Images
INSERT INTO PropertyImages (PropertyId, ImageUrl, IsPrimary, SortOrder) VALUES
(1,  'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80', 1, 0),
(2,  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80', 1, 0),
(3,  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80', 1, 0),
(4,  'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=600&q=80', 1, 0),
(5,  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80', 1, 0),
(6,  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80', 1, 0),
(7,  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&q=80', 1, 0),
(8,  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&q=80', 1, 0),
(9,  'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=600&q=80', 1, 0),
(10, 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80', 1, 0);

-- Amenities
INSERT INTO PropertyAmenities (PropertyId, Amenity) VALUES
(1,'WiFi'),(1,'Pool'),(1,'Gym'),(1,'Security'),(1,'Parking'),(1,'Balcony'),
(2,'WiFi'),(2,'Security'),(2,'Laundry'),
(3,'Pool'),(3,'Garden'),(3,'Security'),(3,'Parking'),(3,'Garage'),(3,'Solar'),
(4,'Security'),(4,'Parking'),(4,'Garden'),(4,'Pet Friendly'),
(5,'Lake View'),(5,'Parking'),(5,'Security'),(5,'Balcony'),
(6,'WiFi'),(6,'Security'),(6,'Laundry'),
(7,'Garden'),(7,'Garage'),(7,'Security'),(7,'Solar'),
(8,'WiFi'),(8,'Parking'),(8,'Security'),(8,'Reception'),(8,'Meeting Rooms'),
(9,'Garden'),(9,'Security'),(9,'Parking'),(9,'Solar'),(9,'WiFi'),
(10,'Security'),(10,'WiFi');

-- Sample application from tenant
INSERT INTO Applications (PropertyId, TenantId, Message, Status) VALUES
(1, 2, 'I am very interested in this property, available to view anytime.', 'pending'),
(4, 2, 'This looks perfect for my family, please approve.', 'approved');

-- Sample wishlist for tenant
INSERT INTO Wishlist (UserId, PropertyId) VALUES
(2, 1),
(2, 5);
