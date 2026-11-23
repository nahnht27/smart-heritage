
#requires -Version 5.1
<#
.SYNOPSIS
    Smart Heritage - Demo Dataset Seed

.DESCRIPTION
    -Seed       Create missing demo data. Re-running is idempotent.
    -Verify     Verify API records, media URLs and PostgreSQL interactions.
    -Cleanup    Delete only records owned by this seed manifest.

    No mode             : Show usage only.
    -Seed -WhatIf       : Dry run. No API calls or database writes.
    -Seed               : Execute seed.
    -Verify             : Verify seeded data.
    -Cleanup -Confirm   : Delete seed-owned records.

    Credentials are read at runtime and never saved to the manifest.
    This script must only be used with a local/demo environment.
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Medium')]
param(
    [switch]$Seed,
    [switch]$Verify,
    [switch]$Cleanup,
    [switch]$Force,
    [string]$BaseUrl = 'http://localhost:8080',
    [string]$ManifestPath = (
        Join-Path $PSScriptRoot 'demo-seed-manifest.json'
    ),
    [ValidateSet('DockerCompose', 'Local')]
    [string]$PostgresMode = 'DockerCompose',
    [string]$PostgresDatabase = 'smart_heritage',
    [string]$PostgresUser = 'postgres'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# 1 CONFIGURATION
Import-Module (
    Join-Path $PSScriptRoot 'lib/DemoSeed.Common.psm1'
) -Force

$BaseUrl = Resolve-DemoSeedBaseUrl -BaseUrl $BaseUrl

$script:Headers = @{}
$script:Manifest = $null
$script:PSCmdlet = $PSCmdlet

$script:RepoRoot = Split-Path -Parent (
    Split-Path -Parent $PSScriptRoot
)

$modeCount = (
    [int]($Seed.IsPresent) +
    [int]($Verify.IsPresent) +
    [int]($Cleanup.IsPresent)
)

if ($modeCount -gt 1) {
    throw 'Chỉ được chọn một chế độ: -Seed, -Verify hoặc -Cleanup.'
}

if ($modeCount -eq 0) {
    Write-Host ''
    Write-Host 'SMART HERITAGE DEMO SEED'
    Write-Host '------------------------'
    Write-Host 'No database changes have been made.'
    Write-Host ''
    Write-Host 'Examples:'
    Write-Host '.\seed-demo-data.ps1 -Seed -WhatIf'
    Write-Host '.\seed-demo-data.ps1 -Seed'
    Write-Host '.\seed-demo-data.ps1 -Verify'
    Write-Host '.\seed-demo-data.ps1 -Cleanup -Confirm'
    return
}

if ($Cleanup) {
    $confirmWasExplicitlyEnabled = (
        $PSCmdlet.MyInvocation.BoundParameters.ContainsKey('Confirm') -and
        [bool]$PSCmdlet.MyInvocation.BoundParameters['Confirm']
    )

    if (-not $confirmWasExplicitlyEnabled -and -not $Force) {
        throw (
            'Cleanup yêu cầu xác nhận. ' +
            'Hãy sử dụng -Cleanup -Confirm hoặc -Force trong CI.'
        )
    }
}

# 2. DEMO DATA

$Sites = @(
    # Site 1: Hoàng thành Thăng Long
    @{
        Key = 'site-thang-long'
        Name = 'Hoàng thành Thăng Long'
        Address = '18 Hoàng Diệu, Ba Đình, Hà Nội, Việt Nam'
        Latitude = 21.0359
        Longitude = 105.8412

        Description = @'
Hoàng thành Thăng Long là quần thể di sản văn hóa gắn với lịch sử hình thành và phát triển của kinh đô Thăng Long qua nhiều triều đại, từ thời Đại La, Lý, Trần, Lê đến thời Nguyễn. Khu di sản lưu giữ hệ thống dấu tích kiến trúc, nền móng cung điện và nhiều hiện vật khảo cổ phản ánh đời sống chính trị, văn hóa và nghệ thuật cung đình Việt Nam. Đây là không gian tiêu biểu để tìm hiểu lịch sử kinh đô Thăng Long và sự tiếp nối của các lớp văn hóa qua hơn một nghìn năm.
'@
    },
    # Site 2: Đại Nội Huế 
    @{
        Key = 'site-hue'
        Name = 'Đại Nội Huế'
        Address = 'Đại Nội, thành phố Huế, Việt Nam'
        Latitude = 16.4698
        Longitude = 107.5786

        Description = @'
Đại Nội Huế là trung tâm quyền lực chính trị và nghi lễ của triều Nguyễn, nằm trong quần thể di tích Cố đô Huế. Công trình bao gồm Hoàng thành và Tử Cấm thành, với hệ thống cung điện, miếu thờ, cổng thành và các công trình kiến trúc cung đình. Không gian di tích lưu giữ nhiều dấu ấn về tổ chức triều chính, nghi lễ hoàng gia, nghệ thuật kiến trúc và kỹ nghệ thủ công dưới triều Nguyễn.
'@
    },
    # Site 3: Văn Miếu – Quốc Tử Giám
    @{
        Key = 'site-van-mieu'
        Name = 'Văn Miếu – Quốc Tử Giám'
        Address = '58 Quốc Tử Giám, Đống Đa, Hà Nội, Việt Nam'
        Latitude = 21.0277
        Longitude = 105.8355

        Description = @'
Văn Miếu được xây dựng năm 1070 dưới triều vua Lý Thánh Tông. Năm 1076, Quốc Tử Giám được thành lập bên cạnh Văn Miếu, trở thành cơ sở giáo dục cấp cao của nhà nước phong kiến Việt Nam. Quần thể di tích lưu giữ các công trình kiến trúc, không gian thờ tự và 82 bia Tiến sĩ, phản ánh lịch sử giáo dục, khoa cử và truyền thống trọng dụng nhân tài của Việt Nam.
'@
    },
    # Site 4: Thành nhà Hồ
    @{
        Key = 'site-ho-citadel'
        Name = 'Thành nhà Hồ'
        Address = 'Khu di sản Thành nhà Hồ, xã Tây Đô, tỉnh Thanh Hóa, Việt Nam'
        Latitude = 20.0700
        Longitude = 105.6000

        Description = @'
Thành nhà Hồ được xây dựng năm 1397 dưới triều Hồ Quý Ly, từng giữ vai trò kinh đô của nước Đại Ngu. Di sản nổi bật với thành nội có mặt bằng gần hình vuông, hệ thống cổng thành và tường thành được xây dựng bằng những khối đá lớn. Quần thể di sản còn bao gồm các thành phần như La Thành và Đàn tế Nam Giao, phản ánh quy hoạch, kỹ thuật xây dựng và tổ chức không gian chính trị, nghi lễ cuối thế kỷ XIV đầu thế kỷ XV.
'@
    }
)

$Artifacts = @(
    # Artifact khu vực Hoàng thành Thăng Long
    @{
        Key = 'tl-01'
        SiteKey = 'site-thang-long'
        Name = 'Rồng đá thềm điện Kính Thiên'
        Image = 'artifact_01_01_kinh_thien_stone_dragon.jpg'

        Description = @'
Thành bậc rồng Điện Kính Thiên là dấu tích kiến trúc đá tiêu biểu của chính điện quan trọng bậc nhất trong Cấm thành Thăng Long thời Lê sơ. Bộ thành bậc được dựng năm 1467 dưới triều vua Lê Thánh Tông, gồm các cấu kiện đá chạm hình rồng và mây với kỹ thuật điêu khắc tinh xảo. Hình tượng rồng năm móng thể hiện biểu tượng quyền lực hoàng gia, đồng thời phản ánh trình độ nghệ thuật đá và quan niệm thẩm mỹ cung đình Việt Nam thế kỷ XV.
'@
    },

    @{
        Key = 'tl-02'
        SiteKey = 'site-thang-long'
        Name = 'Đồ gốm khai quật tại Hoàng thành Thăng Long'
        Image = 'artifact_01_02_thang_long_ancient_ceramics.jpg'

        Description = @'
Gốm cổ Thăng Long phản ánh hoạt động sản xuất, sử dụng đồ gốm và đời sống vật chất trong không gian kinh đô xưa. Qua chất liệu, kỹ thuật tạo hình, lớp men và hoa văn trang trí, các hiện vật gốm cung cấp tư liệu để tìm hiểu trình độ thủ công, thị hiếu thẩm mỹ và sinh hoạt của cư dân cũng như tầng lớp cung đình qua các thời kỳ lịch sử. Đây là nhóm hiện vật khảo cổ có giá trị trong việc nghiên cứu sự phát triển liên tục của Thăng Long.
'@
    },

    @{
        Key = 'tl-03'
        SiteKey = 'site-thang-long'
        Name = 'Hình tượng phượng trên lá đề'
        Image = 'artifact_01_03_ly_phoenix_bodhi_leaf.jpg'

        Description = @'
Lá đề trang trí hình chim phượng là mô típ nghệ thuật gắn với kiến trúc và mỹ thuật tôn giáo trong lịch sử Việt Nam. Hình lá đề kết hợp với hình tượng chim phượng thể hiện sự giao thoa giữa biểu tượng linh thiêng, quan niệm về sự cao quý và kỹ thuật trang trí kiến trúc truyền thống. Hiện vật giúp người xem tìm hiểu ngôn ngữ tạo hình, hoa văn trang trí và dấu ấn văn hóa Phật giáo trong nghệ thuật Việt Nam thời trung đại.
'@
    },

    @{
        Key = 'tl-04'
        SiteKey = 'site-thang-long'
        Name = 'Bát gốm men trắng'
        Image = 'artifact_01_04_early_le_white_dragon_bowl.jpg'

        Description = @'
Bát gốm men trắng trang trí hình rồng đại diện cho dòng đồ gốm có kỹ thuật chế tác và trang trí phát triển trong thời kỳ Lê sơ. Hình tượng rồng trên đồ gốm không chỉ mang giá trị thẩm mỹ mà còn gắn với biểu tượng quyền lực và văn hóa cung đình. Lớp men trắng, hình dáng vật dụng và họa tiết trang trí giúp người xem hình dung kỹ thuật sản xuất gốm cũng như nhu cầu sử dụng đồ gốm trong xã hội Đại Việt thời kỳ này.
'@
    },

    @{
        Key = 'tl-05'
        SiteKey = 'site-thang-long'
        Name = 'Cổng Đoan Môn'
        Image = 'artifact_01_05_thang_long_doan_mon.jpg'

        Description = @'
Đoan Môn là cổng phía Nam dẫn vào khu vực Cấm thành của Hoàng thành Thăng Long. Công trình nằm trên trục không gian chính dẫn đến khu vực điện Kính Thiên, thể hiện cách tổ chức không gian và hệ thống cổng trong kiến trúc hoàng cung xưa. Đoan Môn có kết cấu cổng thành với các cửa vòm cuốn và phần tường xây bằng gạch. Công trình là dấu tích quan trọng giúp tìm hiểu lịch sử kiến trúc cung đình và sự phát triển của kinh đô Thăng Long qua các triều đại.
'@
    },
# Artifact khu vực Đại Nội Huế  
    @{
        Key = 'hue-01'
        SiteKey = 'site-hue'
        Name = 'Cửu Đỉnh triều Nguyễn'
        Image = 'artifact_02_01_hue_nine_dynastic_urns.jpg'

        Description = @'
Cửu Đỉnh là bộ chín đỉnh đồng được vua Minh Mạng cho đúc từ năm 1835 đến năm 1837 và đặt tại sân Thế Miếu trong Hoàng thành Huế. Mỗi đỉnh mang tên riêng, được trang trí bằng các hình chạm nổi về núi sông, động thực vật, sản vật và những hình ảnh tiêu biểu của đất nước. Bộ hiện vật được xem như một bức tranh khái quát về giang sơn Việt Nam thế kỷ XIX, đồng thời thể hiện kỹ thuật đúc đồng và quan niệm về sự chính thống, trường tồn của vương triều Nguyễn.
'@
    },

    @{
        Key = 'hue-02'
        SiteKey = 'site-hue'
        Name = 'Cửu vị thần công'
        Image = 'artifact_02_02_nguyen_dynasty_nine_holy_cannons.jpg'

        Description = @'
Cửu vị thần công là bộ chín khẩu đại bác bằng đồng được đúc dưới triều vua Gia Long trong giai đoạn 1803–1804. Bộ súng gồm hai nhóm: Tứ thời với Xuân, Hạ, Thu, Đông và Ngũ hành với Kim, Mộc, Thủy, Hỏa, Thổ. Các khẩu súng được chế tác với kích thước lớn, trang trí hoa văn và khắc thông tin trên thân súng. Chúng không được tạo ra để sử dụng trong chiến đấu mà mang ý nghĩa biểu tượng cho uy quyền và sức mạnh của triều Nguyễn.
'@
    },

    @{
        Key = 'hue-03'
        SiteKey = 'site-hue'
        Name = 'Chuông đồng tại khu vực Ngọ Môn'
        Image = 'artifact_02_03_minh_mang_ngo_mon_bell.jpg'

        Description = @'
Chuông Ngọ Môn là hiện vật bằng đồng gắn với không gian kiến trúc Ngọ Môn của Hoàng thành Huế. Chuông được đúc dưới triều vua Minh Mạng và gắn với các hoạt động nghi lễ, sinh hoạt cung đình của triều Nguyễn. Các chi tiết tạo hình, hoa văn và thông tin khắc trên thân chuông phản ánh kỹ thuật đúc đồng cũng như vai trò của âm thanh trong không gian nghi lễ hoàng gia. Hiện vật góp phần làm rõ giá trị lịch sử và nghệ thuật của các di sản cung đình Huế.
'@
    },

    @{
        Key = 'hue-04'
        SiteKey = 'site-hue'
        Name = 'Phù điêu đá trang trí kiến trúc'
        Image = 'artifact_02_04_minh_mang_stone_relief.jpg'

        Description = @'
Phù điêu đá thời Minh Mạng là hiện vật điêu khắc cung đình phản ánh kỹ thuật chế tác đá và nghệ thuật trang trí dưới triều Nguyễn. Các đường nét chạm khắc, bố cục hình ảnh và hoa văn trang trí thể hiện quan niệm thẩm mỹ cũng như những biểu tượng văn hóa được sử dụng trong không gian hoàng gia. Hiện vật hiện được bảo quản và trưng bày tại Bảo tàng Cổ vật Cung đình Huế, góp phần giới thiệu giá trị nghệ thuật tạo hình thời Nguyễn.
'@
    }, 

    @{
        Key = 'hue-05'
        SiteKey = 'site-hue'
        Name = 'Ngọ Môn – Cổng chính Hoàng thành Huế'
        Image = 'artifact_02_05_hue_ngo_mon_gate.jpg'

        Description = @'
Ngọ Môn là cổng chính phía Nam của Hoàng thành Huế, nằm trên trục thần đạo dẫn vào khu vực cung điện. Công trình gồm phần nền đài đồ sộ với các lối cửa vòm và lầu Ngũ Phụng ở phía trên. Kiến trúc kết hợp vật liệu đá, gạch, gỗ và hệ mái ngói trang trí theo phong cách cung đình triều Nguyễn. Ngọ Môn vừa có chức năng kiểm soát lối ra vào Hoàng thành vừa gắn với các hoạt động nghi lễ và sự kiện quan trọng của triều đình.
'@
    },

    # Artifact khu vực Văn Miếu – Quốc Tử Giám
    @{
        Key = 'vm-01'
        SiteKey = 'site-van-mieu'
        Name = 'Khuê Văn Các'
        Image = 'artifact_03_01_van_mieu_khue_van_cac.jpg'

        Description = @'
Khuê Văn Các được xây dựng năm 1805 dưới triều Nguyễn, là một công trình kiến trúc nổi bật trong quần thể Văn Miếu – Quốc Tử Giám. Công trình có tầng dưới gồm bốn trụ gạch tạo thành không gian thông thoáng, tầng trên là kiến trúc gỗ với hệ mái và các cửa sổ hình tròn đặc trưng. Khuê Văn Các thể hiện sự kết hợp giữa kết cấu gạch, gỗ và nghệ thuật kiến trúc truyền thống. Công trình trở thành biểu tượng gắn với truyền thống hiếu học và văn hóa Thăng Long.
'@
    },

    @{
        Key = 'vm-02'
        SiteKey = 'site-van-mieu'
        Name = '82 bia Tiến sĩ'
        Image = 'artifact_03_02_van_mieu_doctoral_steles.jpg'

        Description = @'
Vườn bia Tiến sĩ tại Văn Miếu – Quốc Tử Giám hiện lưu giữ 82 bia đá ghi danh những người đỗ Tiến sĩ trong các khoa thi từ năm 1442 đến năm 1779. Các bia được đặt trên lưng rùa đá, khắc thông tin về khoa thi và những người đạt học vị. Hệ thống bia phản ánh lịch sử khoa cử, việc tuyển chọn nhân tài và truyền thống tôn vinh người có học trong xã hội Việt Nam thời quân chủ. Đây là tư liệu lịch sử quan trọng về nền giáo dục và hành chính của các triều đại phong kiến.
'@
    },

    @{
        Key = 'vm-03'
        SiteKey = 'site-van-mieu'
        Name = 'Giếng Thiên Quang'
        Image = 'artifact_03_03_van_mieu_thien_quang_well.jpg'

        Description = @'
Giếng Thiên Quang, còn gọi là Thiên Quang Tỉnh, nằm trong khu vực trung tâm của quần thể Văn Miếu – Quốc Tử Giám. Giếng có mặt bằng hình vuông, tạo thành điểm nhấn cảnh quan giữa Khuê Văn Các và khu vực bia Tiến sĩ. Không gian giếng gắn với cách tổ chức cảnh quan và bố cục kiến trúc của di tích. Công trình góp phần thể hiện quan niệm thẩm mỹ, tư tưởng văn hóa và sự hài hòa giữa kiến trúc với thiên nhiên trong không gian truyền thống.
'@
    },

    @{
        Key = 'vm-04'
        SiteKey = 'site-van-mieu'
        Name = 'Điện Đại Thành'
        Image = 'artifact_03_04_van_mieu_dai_thanh_hall.jpg'

        Description = @'
Điện Đại Thành nằm trong khu Đại Thành của Văn Miếu – Quốc Tử Giám, là không gian thờ Khổng Tử và các bậc tiên hiền Nho học. Công trình có kiến trúc truyền thống với hệ cột, kết cấu gỗ, mái ngói và không gian thờ tự được bố trí theo trục chính. Điện Đại Thành thể hiện vai trò của Nho giáo trong đời sống tư tưởng, giáo dục và khoa cử Việt Nam thời quân chủ. Đây cũng là một trong những khu vực quan trọng trong hành trình tìm hiểu chức năng văn hóa và giáo dục của Văn Miếu.
'@
    },

    @{
        Key = 'vm-05'
        SiteKey = 'site-van-mieu'
        Name = 'Nhà Thái Học'
        Image = 'artifact_03_05_van_mieu_thai_hoc_house.jpg'

        Description = @'
Khu Thái Học gắn với lịch sử Quốc Tử Giám, cơ sở giáo dục cấp cao được thành lập năm 1076 dưới triều vua Lý Nhân Tông. Đây là nơi gắn với hoạt động học tập và đào tạo nhân tài của nhà nước phong kiến Việt Nam. Công trình Nhà Thái Học hiện nay được phục dựng trong quá trình bảo tồn và phát huy giá trị di tích. Không gian này giúp giới thiệu lịch sử giáo dục, vai trò của Quốc Tử Giám và truyền thống đào tạo nhân tài trong lịch sử dân tộc.
'@
    },

    # Artifact khu vực Thành nhà Hồ
    @{
        Key = 'hc-01'
        SiteKey = 'site-ho-citadel'
        Name = 'Cổng Nam Thành nhà Hồ'
        Image = 'artifact_04_01_ho_citadel_south_gate.jpg'

        Description = @'
Cổng Nam là cổng chính ở phía Nam của thành nội Thành nhà Hồ. Công trình nổi bật với ba lối đi dạng vòm cuốn được xây dựng bằng các khối đá lớn. Các khối đá được gia công và ghép nối tạo thành kết cấu cổng có quy mô lớn, thể hiện kỹ thuật xây dựng thành lũy đặc trưng cuối thế kỷ XIV. Cổng Nam là điểm tham quan tiêu biểu để tìm hiểu cấu trúc thành nội và kỹ thuật kiến trúc đá của di sản.
'@
    },

    @{
        Key = 'hc-02'
        SiteKey = 'site-ho-citadel'
        Name = 'Cổng Bắc Thành nhà Hồ'
        Image = 'artifact_04_02_ho_citadel_north_gate.jpg'

        Description = @'
Cổng Bắc là một trong bốn cổng chính của thành nội Thành nhà Hồ. Công trình có một lối đi dạng vòm cuốn, được tạo thành từ những khối đá lớn ghép nối với nhau. Kết cấu cổng thể hiện kỹ thuật chế tác đá và khả năng tổ chức công trình thành lũy của người thợ thời Hồ. Cổng Bắc góp phần giúp người tham quan nhận biết bố cục bốn mặt thành và hệ thống giao thông ra vào khu vực thành nội.
'@
    },

    @{
        Key = 'hc-03'
        SiteKey = 'site-ho-citadel'
        Name = 'Cổng Đông Thành nhà Hồ'
        Image = 'artifact_04_03_ho_citadel_east_gate.jpg'

        Description = @'
Cổng Đông là cổng nằm ở phía Đông của thành nội Thành nhà Hồ, thuộc hệ thống bốn cổng đá của công trình. Cổng có lối đi dạng vòm cuốn với các khối đá lớn được gia công và lắp ghép thành thân cổng. Cùng với các cổng còn lại, Cổng Đông thể hiện quy hoạch thành nội gần hình vuông và kỹ thuật xây dựng bằng đá quy mô lớn. Hình ảnh công trình giúp người tham quan tìm hiểu cấu trúc cổng và sự liên kết giữa cổng thành với hệ thống tường thành.
'@
    },

    @{
        Key = 'hc-04'
        SiteKey = 'site-ho-citadel'
        Name = 'Cổng Tây Thành nhà Hồ'
        Image = 'artifact_04_04_ho_citadel_west_gate.jpg'

        Description = @'
Cổng Tây nằm ở phía Tây của thành nội Thành nhà Hồ và là một trong bốn cổng chính của di tích. Công trình có một lối đi dạng vòm cuốn, được xây dựng bằng những khối đá lớn. Kết cấu cổng và phần tường thành liền kề thể hiện kỹ thuật chế tác, vận chuyển và lắp ghép đá trong kiến trúc quân sự thời Hồ. Cổng Tây góp phần hoàn thiện bố cục không gian của thành nội và là dấu tích quan trọng trong nghiên cứu kiến trúc thành lũy cuối thế kỷ XIV.
'@
    },

    @{
        Key = 'hc-05'
        SiteKey = 'site-ho-citadel'
        Name = 'Tường thành đá Thành nhà Hồ'
        Image = 'artifact_04_05_ho_citadel_stone_walls.jpg'

        Description = @'
Tường thành nội Thành nhà Hồ được xây dựng từ những khối đá vôi lớn, được gia công và ghép nối tạo thành hệ thống tường bao quanh khu vực trung tâm. Thành nội có mặt bằng gần hình vuông, với bốn cổng chính nằm ở bốn hướng. Những khối đá có kích thước lớn cùng cách sắp xếp và liên kết giữa các cấu kiện phản ánh kỹ thuật xây dựng thành lũy đặc biệt của thời Hồ. Tường thành là thành phần kiến trúc tiêu biểu thể hiện giá trị kỹ thuật và lịch sử của di sản.
'@
    }
)

$Beacons = @(
    @{
        Key = 'beacon-tl-01'
        Name = 'Thăng Long - Điểm tương tác 01'
        ArtifactKey = 'tl-01'
        UUID = '10000000-0000-4000-8000-000000000001'
        Major = 100
        Minor = 1
    },

    @{
        Key = 'beacon-tl-02'
        Name = 'Thăng Long - Điểm tương tác 02'
        ArtifactKey = 'tl-03'
        UUID = '10000000-0000-4000-8000-000000000002'
        Major = 100
        Minor = 2
    },

    @{
        Key = 'beacon-hue-01'
        Name = 'Đại Nội Huế - Điểm tương tác 01'
        ArtifactKey = 'hue-01'
        UUID = '10000000-0000-4000-8000-000000000003'
        Major = 200
        Minor = 1
    },

    @{
        Key = 'beacon-hue-02'
        Name = 'Đại Nội Huế - Điểm tương tác 02'
        ArtifactKey = 'hue-02'
        UUID = '10000000-0000-4000-8000-000000000004'
        Major = 200
        Minor = 2
    }
)

$VisitorIds = @(
    '20000000-0000-4000-8000-000000000001'
    '20000000-0000-4000-8000-000000000002'
    '20000000-0000-4000-8000-000000000003'
    '20000000-0000-4000-8000-000000000004'
    '20000000-0000-4000-8000-000000000005'
    '20000000-0000-4000-8000-000000000006'
    '20000000-0000-4000-8000-000000000007'
    '20000000-0000-4000-8000-000000000008'
)

if ($Seed -and $WhatIfPreference) {
    $expectedSiteCount = @($Sites).Count
    $expectedArtifactCount = @($Artifacts).Count
    $expectedMultimediaCount = @(
        $Artifacts | Where-Object {
            -not [string]::IsNullOrWhiteSpace($_.Image)
        }
    ).Count
    $expectedBeaconCount = @($Beacons).Count
    $expectedInteractionCount = $expectedArtifactCount * 3

    Write-Host ''
    Write-Host 'DRY RUN - không gọi API và không ghi database.'
    Write-Host "$expectedSiteCount HeritageSite"
    Write-Host "$expectedArtifactCount Artifact"
    Write-Host "$expectedMultimediaCount Multimedia"
    Write-Host "$expectedBeaconCount Beacon"
    Write-Host "$expectedInteractionCount VisitorInteraction"
    Write-Host ''
    Write-Host 'DRY RUN COMPLETE.'
    return
}

# ============================================================
# 3. AUTHENTICATION
# ============================================================

function Set-AdminHeaders {
    $token = $env:SMART_HERITAGE_ADMIN_TOKEN

    if ([string]::IsNullOrWhiteSpace($token)) {
        $secureToken = Read-Host `
            'Nhập ADMIN Bearer token (không lưu vào file)' `
            -AsSecureString

        $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR(
            $secureToken
        )

        try {
            $token = [Runtime.InteropServices.Marshal]::PtrToStringBSTR(
                $pointer
            )
        }
        finally {
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
            $secureToken.Dispose()
        }
    }

    if ([string]::IsNullOrWhiteSpace($token)) {
        throw 'ADMIN token không được để trống.'
    }

    $script:Headers = @{
        Authorization = "Bearer $token"
        Accept = 'application/json'
    }

    $token = $null
}

# ============================================================
# 4. HTTP HELPERS
# ============================================================

function Invoke-Api {
    param(
        [Parameter(Mandatory)]
        [ValidateSet('GET', 'POST', 'DELETE')]
        [string]$Method,

        [Parameter(Mandatory)]
        [string]$Path,

        [object]$Body,

        [switch]$Anonymous,

        [int[]]$AllowedStatus = @(200, 201)
    )

    $headers = $script:Headers

    if ($Anonymous) {
        $headers = @{ Accept = 'application/json' }
    }

    $request = @{
        Method = $Method
        Uri = "$BaseUrl$Path"
        Headers = $headers
        TimeoutSec = 30
        UseBasicParsing = $true
        ErrorAction = 'Stop'
    }

    if ($Method -eq 'POST') {
        $json = $Body | ConvertTo-Json -Depth 12

        $request.ContentType = 'application/json; charset=utf-8'
        $request.Body = [Text.Encoding]::UTF8.GetBytes($json)
    }

    try {
        $response = Invoke-WebRequest @request
        $statusCode = [int]$response.StatusCode
        $stream = $response.RawContentStream
        $content = ""

        if ($null -ne $stream) {
            if ($stream.CanSeek) {
                $stream.Position = 0
            }

            $reader = New-Object System.IO.StreamReader(
                $stream,
                [System.Text.Encoding]::UTF8,
                $true
            )

            try {
                $content = $reader.ReadToEnd()
            }
            finally {
                $reader.Dispose()
            }
        }
    }
    catch {
        $statusCode = 0
        $content = ''

        $responseProperty = $_.Exception.PSObject.Properties[
            'Response'
        ]
        $errorResponse = $null

        if (
            $null -ne $responseProperty -and
            $null -ne $responseProperty.Value
        ) {
            $errorResponse = $responseProperty.Value
        }

        if ($null -ne $errorResponse) {
            try {
                $statusCode = [int]$errorResponse.StatusCode
            }
            catch {}

            try {
                $stream = $errorResponse.GetResponseStream()

                if ($stream) {
                    $reader = New-Object System.IO.StreamReader(
                        $stream,
                        [System.Text.Encoding]::UTF8,
                        $true
                    )

                    try {
                        $content = $reader.ReadToEnd()
                    }
                    finally {
                        $reader.Dispose()
                    }
                }
            }
            catch {}
        }

        throw (
            "API $Method $Path thất bại. " +
            "HTTP=$statusCode. $content"
        )
    }

    if ($AllowedStatus -notcontains $statusCode) {
        throw "API $Method $Path trả HTTP $statusCode."
    }

    $data = $null

    if (-not [string]::IsNullOrWhiteSpace($content)) {
        try {
            $apiResponse = $content | ConvertFrom-Json
        }
        catch {
            throw "API $Method $Path không trả JSON hợp lệ."
        }

        if ($apiResponse.PSObject.Properties.Name -contains 'success') {
            if ($apiResponse.success -ne $true) {
                throw "API $Method $Path trả success=false."
            }

            $data = $apiResponse.data
        }
        else {
            $data = $apiResponse
        }
    }

    return [pscustomobject]@{
        StatusCode = $statusCode
        Data = $data
    }
}

function Get-ApiList {
    param([Parameter(Mandatory)][string]$Path)

    $response = Invoke-Api -Method GET -Path $Path `
        -AllowedStatus @(200)

    $data = $response.Data

    if ($null -eq $data) {
        return
    }

    if ($data -is [System.Array]) {
        return $data
    }

    if ($data.PSObject.Properties.Name -contains 'content') {
        return $data.content
    }

    throw "API $Path không trả về danh sách."
}

# ============================================================
# 5. DATA VALIDATION HELPERS
# ============================================================

function Assert-Equal {
    param(
        [object]$Actual,
        [object]$Expected,
        [string]$Field
    )

    if ($null -eq $Actual -and $null -eq $Expected) {
        return
    }

    if ($null -eq $Actual -or $null -eq $Expected) {
        throw "Dữ liệu không khớp tại $Field."
    }

    if ($Expected -is [bool]) {
        if ([bool]$Actual -ne [bool]$Expected) {
            throw "Dữ liệu không khớp tại $Field."
        }

        return
    }

    if (
        $Expected -is [int] -or
        $Expected -is [double] -or
        $Expected -is [decimal]
    ) {
        $difference = [Math]::Abs(
            ([double]$Actual) - ([double]$Expected)
        )

        if ($difference -gt 0.000001) {
            throw "Dữ liệu số không khớp tại $Field."
        }

        return
    }

    if ([string]$Actual -cne [string]$Expected) {
        throw "Dữ liệu không khớp tại $Field."
    }
}

function Find-UniqueByProperty {
    param(
        [object[]]$Items,
        [string]$Property,
        [string]$Value
    )

    $matches = @(
        $Items | Where-Object {
            if ($null -eq $_) {
                return $false
            }

            $propertyInfo = $_.PSObject.Properties[$Property]

            if ($null -eq $propertyInfo) {
                return $false
            }

            [string]$propertyInfo.Value -ceq $Value
        }
    )

    if ($matches.Count -gt 1) {
        throw "Phát hiện nhiều bản ghi có $Property='$Value'."
    }

    if ($matches.Count -eq 1) {
        return $matches[0]
    }

    return $null
}

function Set-ManifestEntry {
    param(
        [string]$Collection,
        [object]$Entry
    )

    $current = @(
        $script:Manifest.$Collection |
        Where-Object { $_.key -cne $Entry.key }
    )

    $script:Manifest.$Collection = $current + @($Entry)
    $script:Manifest.updatedAtUtc = [DateTime]::UtcNow.ToString('o')

    Save-Manifest
}

function Get-PreviousOwnership {
    param(
        [string]$Collection,
        [string]$Key,
        [int]$Id
    )

    if ($null -eq $script:Manifest) {
        return $false
    }

    $previous = @(
        $script:Manifest.$Collection |
        Where-Object {
            $_.key -ceq $Key -and
            [int]$_.id -eq $Id
        }
    )

    return (
        $previous.Count -eq 1 -and
        [bool]$previous[0].createdBySeed
    )
}

# ============================================================
# 6. MANIFEST
# ============================================================

function Save-Manifest {
    $directory = Split-Path -Parent $ManifestPath

    if (-not (Test-Path -LiteralPath $directory)) {
        New-Item -ItemType Directory -Path $directory -Force |
            Out-Null
    }

    $temporaryPath = "$ManifestPath.tmp"

    $script:Manifest |
        ConvertTo-Json -Depth 20 |
        Set-Content -LiteralPath $temporaryPath -Encoding UTF8

    Move-Item -LiteralPath $temporaryPath `
        -Destination $ManifestPath -Force
}

function Set-ManifestProperty {
    param(
        [Parameter(Mandatory)]
        [string]$Name,

        [AllowNull()]
        [object]$Value
    )

    if ($script:Manifest -is [System.Collections.IDictionary]) {
        $script:Manifest[$Name] = $Value
        return
    }

    $script:Manifest |
        Add-Member `
            -MemberType NoteProperty `
            -Name $Name `
            -Value $Value `
            -Force |
        Out-Null
}

function Load-Manifest {
    if (-not (Test-Path -LiteralPath $ManifestPath)) {
        return $null
    }

    $manifestJson = [System.IO.File]::ReadAllText(
    	$ManifestPath,
    	[System.Text.Encoding]::UTF8
    )

    $manifest = $manifestJson | ConvertFrom-Json

    if ([int]$manifest.version -ne 2) {
        throw 'Manifest không đúng version 2.'
    }

    if ($manifest.baseUrl -cne $BaseUrl) {
        throw 'Manifest thuộc một BaseUrl khác.'
    }

    if ($manifest.seedName -cne 'smart-heritage-demo') {
        throw 'Manifest không thuộc bộ seed này.'
    }

    foreach ($collection in @(
        'sites',
        'artifacts',
        'multimedia',
        'beacons',
        'interactions'
    )) {
        if ($null -eq $manifest.$collection) {
            throw "Manifest thiếu collection $collection."
        }
    }

    return $manifest
}

# ============================================================
# 7. POSTGRESQL HELPERS
# ============================================================

function Invoke-PostgresSql {
    param(
        [Parameter(Mandatory)]
        [string]$Sql,

        [switch]$AllowEmpty
    )

    Push-Location $script:RepoRoot

    try {
        $previousPreference = $ErrorActionPreference
        $stderrPath = [System.IO.Path]::GetTempFileName()
        try {
            $ErrorActionPreference = 'Continue'

            if ($PostgresMode -eq 'Local') {
                $output = & psql `
                    -U $PostgresUser `
                    -d $PostgresDatabase `
                    -X -q -A -t `
                    -v ON_ERROR_STOP=1 `
                    -c $Sql 2> $stderrPath
            }
            else {
                $output = & docker compose exec -T postgres `
                    psql -U $PostgresUser -d $PostgresDatabase `
                    -X -q -A -t `
                    -v ON_ERROR_STOP=1 `
                    -c $Sql 2> $stderrPath
            }

            $commandExitCode = $LASTEXITCODE
            $commandError = [System.IO.File]::ReadAllText($stderrPath)
        }
        finally {
            $ErrorActionPreference = $previousPreference
            Remove-Item -LiteralPath $stderrPath -Force -ErrorAction SilentlyContinue
        }

        if ($commandExitCode -ne 0) {
            throw (
                'PostgreSQL command thất bại. ExitCode=' +
                $commandExitCode + ': ' + $commandError
            )
        }

        $lines = @(
            $output |
            ForEach-Object { [string]$_ } |
            Where-Object {
                -not [string]::IsNullOrWhiteSpace($_)
            }
        )

        if (-not $AllowEmpty -and $lines.Count -eq 0) {
            throw 'PostgreSQL không trả kết quả.'
        }

        return ($lines -join "`n").Trim()
    }
    finally {
        Pop-Location
    }
}

# ============================================================
# 8. MEDIA VALIDATION
# ============================================================

function Assert-MediaAvailable {
    param([Parameter(Mandatory)][string]$Url)

    $response = Invoke-WebRequest `
        -Method GET `
        -Uri "$BaseUrl$Url" `
        -UseBasicParsing `
        -TimeoutSec 30 `
        -ErrorAction Stop

    if ([int]$response.StatusCode -ne 200) {
        throw "Media không truy cập được: $Url."
    }

    if ($response.Headers['Content-Type'] -notlike 'image/*') {
        throw "Media không có Content-Type ảnh hợp lệ: $Url."
    }
}

# ============================================================
# 9. ENSURE SITE / ARTIFACT / MULTIMEDIA
# ============================================================

function Ensure-Record {
    param(
        [string]$Kind,
        [string]$Path,
        [object]$Payload,
        [object[]]$Existing,
        [string]$MatchProperty,
        [string]$MatchValue,
        [string[]]$CompareProperties,
        [string]$IdProperty,
        [string]$ManifestCollection,
        [string]$ManifestKey
    )

    $found = Find-UniqueByProperty `
        -Items $Existing `
        -Property $MatchProperty `
        -Value $MatchValue

    if ($found) {
        foreach ($property in $CompareProperties) {
            Assert-Equal `
                -Actual $found.$property `
                -Expected $Payload.$property `
                -Field "$Kind.$property"
        }

        $id = [int]$found.$IdProperty

        $owned = Get-PreviousOwnership `
            -Collection $ManifestCollection `
            -Key $ManifestKey `
            -Id $id

        Write-Host "EXISTS  $Kind - $MatchValue (ID=$id)"

        return [pscustomobject]@{
            Data = $found
            CreatedBySeed = $owned
        }
    }

    if (-not $script:PSCmdlet.ShouldProcess(
        "$Kind - $MatchValue",
        "POST $Path"
    )) {
        throw "Đã hủy thao tác tạo $Kind."
    }

    $response = Invoke-Api `
        -Method POST `
        -Path $Path `
        -Body $Payload `
        -AllowedStatus @(201)

    if ($null -eq $response.Data) {
        throw "POST $Path không trả về data."
    }

    foreach ($property in $CompareProperties) {
        Assert-Equal `
            -Actual $response.Data.$property `
            -Expected $Payload.$property `
            -Field "$Kind.response.$property"
    }

    Write-Host "CREATED $Kind - $MatchValue"

    return [pscustomobject]@{
        Data = $response.Data
        CreatedBySeed = $true
    }
}

# ============================================================
# 10. BEACON HELPER
# ============================================================

function Ensure-Beacon {
    param(
        [hashtable]$Definition,
        [int]$ArtifactId,
        [object[]]$Existing
    )

    $matches = @(
        $Existing | Where-Object {
            if ($null -eq $_) {
                return $false
            }

            $uuidProperty = $_.PSObject.Properties['uuid']
            $majorProperty = $_.PSObject.Properties['major']
            $minorProperty = $_.PSObject.Properties['minor']

            if (
                $null -eq $uuidProperty -or
                $null -eq $majorProperty -or
                $null -eq $minorProperty
            ) {
                return $false
            }

            ([string]$uuidProperty.Value).ToLowerInvariant() -eq
                $Definition.UUID.ToLowerInvariant() -and
            [int]$majorProperty.Value -eq $Definition.Major -and
            [int]$minorProperty.Value -eq $Definition.Minor
        }
    )

    if ($matches.Count -gt 1) {
        throw "Beacon identity bị trùng: $($Definition.Key)."
    }

    $payload = @{
        name = $Definition.Name
        uuid = $Definition.UUID
        major = $Definition.Major
        minor = $Definition.Minor
        enabled = $true
        artifactId = $ArtifactId
    }

    if ($matches.Count -eq 1) {
        $found = $matches[0]

        foreach ($property in @(
            'name',
            'major',
            'minor',
            'enabled',
            'artifactId'
        )) {
            Assert-Equal `
                -Actual $found.$property `
                -Expected $payload.$property `
                -Field "Beacon.$property"
        }

        $id = [int]$found.beaconId

        $owned = Get-PreviousOwnership `
            -Collection 'beacons' `
            -Key $Definition.Key `
            -Id $id

        Write-Host "EXISTS  Beacon - $($Definition.Name) (ID=$id)"

        return [pscustomobject]@{
            Data = $found
            CreatedBySeed = $owned
        }
    }

    if (-not $script:PSCmdlet.ShouldProcess(
        $Definition.Name,
        'POST /api/admin/beacons'
    )) {
        throw 'Đã hủy thao tác tạo Beacon.'
    }

    $response = Invoke-Api `
        -Method POST `
        -Path '/api/admin/beacons' `
        -Body $payload `
        -AllowedStatus @(201)

    Write-Host "CREATED Beacon - $($Definition.Name)"

    return [pscustomobject]@{
        Data = $response.Data
        CreatedBySeed = $true
    }
}

# 11. LOAD AUTH AND MANIFEST

Set-AdminHeaders
$script:Manifest = Load-Manifest

# 13. VERIFY MODE
if ($Verify) {
    if ($null -eq $script:Manifest) {
        throw "Không tìm thấy manifest: $ManifestPath."
    }

    # ---------------------------------------------------------
    # 13.1. Expected counts from current demo definitions
    # ---------------------------------------------------------

    $expectedSiteCount = @($Sites).Count
    $expectedArtifactCount = @($Artifacts).Count

    $expectedMultimediaCount = @(
        $Artifacts |
            Where-Object {
                -not [string]::IsNullOrWhiteSpace($_.Image)
            }
    ).Count

    $expectedBeaconCount = @($Beacons).Count

    # Mỗi Artifact có 3 interaction:
    # VIEW + SCAN + BEACON_TRIGGER hoặc AUDIO_PLAY.
    $expectedInteractionCount = $expectedArtifactCount * 3

    # ---------------------------------------------------------
    # 13.2. Load API data
    # ---------------------------------------------------------

    $siteList = Get-ApiList '/api/heritage-sites'
    $artifactList = Get-ApiList '/api/artifacts'
    $mediaList = Get-ApiList '/api/multimedia'
    $beaconList = Get-ApiList '/api/admin/beacons'

    # ---------------------------------------------------------
    # 13.3. Verify Heritage Sites
    # ---------------------------------------------------------

    foreach ($entry in $script:Manifest.sites) {
        $record = @(
            $siteList |
                Where-Object {
                    [int]$_.siteId -eq [int]$entry.id
                }
        )

        if (
            $record.Count -ne 1 -or
            $record[0].name -cne $entry.name
        ) {
            throw "Verify Site thất bại: $($entry.key)."
        }
    }

    # ---------------------------------------------------------
    # 13.4. Verify Artifacts
    # ---------------------------------------------------------

    foreach ($entry in $script:Manifest.artifacts) {
        $record = @(
            $artifactList |
                Where-Object {
                    [int]$_.artifactId -eq [int]$entry.id
                }
        )

        if (
            $record.Count -ne 1 -or
            $record[0].name -cne $entry.name -or
            [int]$record[0].siteId -ne [int]$entry.siteId
        ) {
            throw "Verify Artifact thất bại: $($entry.key)."
        }
    }

    # ---------------------------------------------------------
    # 13.5. Verify Multimedia and physical media files
    # ---------------------------------------------------------

    foreach ($entry in $script:Manifest.multimedia) {
        $record = @(
            $mediaList |
                Where-Object {
                    [int]$_.multimediaId -eq [int]$entry.id
                }
        )

        if (
            $record.Count -ne 1 -or
            $record[0].url -cne $entry.url -or
            [int]$record[0].artifactId -ne [int]$entry.artifactId
        ) {
            throw "Verify Multimedia thất bại: $($entry.key)."
        }

        Assert-MediaAvailable -Url $entry.url
    }

    # ---------------------------------------------------------
    # 13.6. Verify Beacons
    # ---------------------------------------------------------

    foreach ($entry in $script:Manifest.beacons) {
        $record = @(
            $beaconList |
                Where-Object {
                    [int]$_.beaconId -eq [int]$entry.id
                }
        )

        if (
            $record.Count -ne 1 -or
            [int]$record[0].major -ne [int]$entry.major -or
            [int]$record[0].minor -ne [int]$entry.minor -or
            [int]$record[0].artifactId -ne [int]$entry.artifactId -or
            -not [bool]$record[0].enabled
        ) {
            throw "Verify Beacon thất bại: $($entry.key)."
        }

        if (
            ([string]$record[0].uuid).ToLowerInvariant() -ne
            ([string]$entry.uuid).ToLowerInvariant()
        ) {
            throw "Beacon UUID không khớp: $($entry.key)."
        }
    }

    # ---------------------------------------------------------
    # 13.7. Verify manifest collection counts
    # ---------------------------------------------------------

    $expectedCounts = @{
        sites = $expectedSiteCount
        artifacts = $expectedArtifactCount
        multimedia = $expectedMultimediaCount
        beacons = $expectedBeaconCount
        interactions = $expectedInteractionCount
    }

    foreach ($collection in $expectedCounts.Keys) {
        $actual = @($script:Manifest.$collection).Count
        $expected = [int]$expectedCounts[$collection]

        if ($actual -ne $expected) {
            throw (
                "Manifest $collection không hợp lệ. " +
                "Actual=$actual Expected=$expected"
            )
        }
    }

    # ---------------------------------------------------------
    # 13.8. Verify interaction anchor and analytics windows
    # ---------------------------------------------------------

    $anchorProperty = $script:Manifest.PSObject.Properties[
        'interactionAnchorAtUtc'
    ]

    if (
        $null -eq $anchorProperty -or
        [string]::IsNullOrWhiteSpace([string]$anchorProperty.Value)
    ) {
        throw (
            'Manifest thiếu interactionAnchorAtUtc. ' +
            'Chạy Seed một lần để lưu anchor trước khi Verify.'
        )
    }

    $verifyNow = [DateTimeOffset]::UtcNow
    $verifyAnchor = Resolve-DemoSeedInteractionAnchor `
        -Manifest $script:Manifest `
        -Now $verifyNow

    $interactionTimes = @()

    foreach ($entry in $script:Manifest.interactions) {
        $interactedAt = [DateTimeOffset]::MinValue

        if (-not [DateTimeOffset]::TryParse(
            [string]$entry.interactedAt,
            [ref]$interactedAt
        )) {
            throw "Interaction có interactedAt không hợp lệ: $($entry.eventId)."
        }

        $interactionTimes += $interactedAt.ToUniversalTime()
    }

    $analyticsWindows = @(
        @{
            Name = '7 ngày'
            From = $verifyNow.AddDays(-7)
        },
        @{
            Name = '30 ngày'
            From = $verifyNow.AddDays(-30)
        },
        @{
            Name = '90 ngày'
            From = $verifyNow.AddDays(-90)
        }
    )

    $analyticsCounts = [ordered]@{}

    foreach ($window in $analyticsWindows) {
        $count = @(
            $interactionTimes |
                Where-Object {
                    $_ -ge $window.From -and
                    $_ -lt $verifyNow
                }
        ).Count

        if ($count -le 0) {
            throw (
                "Analytics $($window.Name) không có dữ liệu. " +
                'Chạy Cleanup rồi Seed lại trên môi trường demo.'
            )
        }

        $analyticsCounts[$window.Name] = $count
    }

    $allTimeCount = @(
        $interactionTimes |
            Where-Object { $_ -lt $verifyNow }
    ).Count

    if ($allTimeCount -le 0) {
        throw 'Analytics All Time không có dữ liệu.'
    }

    $analyticsCounts['All Time'] = $allTimeCount

    # ---------------------------------------------------------
    # 13.9. Prepare SQL expected interaction rows
    # ---------------------------------------------------------

    $expectedRows = @()
    $seenEventIds = @{}
    $seenVisitorIds = @{}

    function ConvertTo-SqlLiteral {
        param(
            [AllowNull()]
            [string]$Value
        )

        if ($null -eq $Value) {
            return 'NULL'
        }

        return "'" + $Value.Replace("'", "''") + "'"
    }

    foreach ($entry in $script:Manifest.interactions) {
        $eventGuid = [guid]::Empty
        $visitorGuid = [guid]::Empty

        if (
            -not [guid]::TryParse(
                [string]$entry.eventId,
                [ref]$eventGuid
            )
        ) {
            throw 'Interaction có eventId không hợp lệ.'
        }

        if (
            -not [guid]::TryParse(
                [string]$entry.visitorId,
                [ref]$visitorGuid
            )
        ) {
            throw "visitorId không hợp lệ: $($entry.eventId)"
        }

        $eventId = $eventGuid.ToString()
        $visitorId = $visitorGuid.ToString()

        if ($seenEventIds.ContainsKey($eventId)) {
            throw "Manifest bị trùng eventId: $eventId"
        }

        $seenEventIds[$eventId] = $true
        $seenVisitorIds[$visitorId] = $true

        $artifactId = 0

        if (
            -not [int]::TryParse(
                [string]$entry.artifactId,
                [ref]$artifactId
            ) -or
            $artifactId -le 0
        ) {
            throw "artifactId không hợp lệ: $eventId"
        }

        $type = [string]$entry.interactionType

        if (
            $type -notin @(
                'VIEW',
                'SCAN',
                'BEACON_TRIGGER',
                'AUDIO_PLAY'
            )
        ) {
            throw "interactionType không hợp lệ: $eventId"
        }

        $beaconSql = 'NULL'

        if ($type -eq 'BEACON_TRIGGER') {
            $beaconId = 0

            if (
                -not [int]::TryParse(
                    [string]$entry.beaconId,
                    [ref]$beaconId
                ) -or
                $beaconId -le 0
            ) {
                throw "BEACON_TRIGGER thiếu beaconId: $eventId"
            }

            $beaconSql = "$beaconId"
        }
        elseif (
            $null -ne $entry.PSObject.Properties['beaconId'] -and
            $null -ne $entry.PSObject.Properties['beaconId'].Value -and
            [string]$entry.PSObject.Properties['beaconId'].Value -ne ''
        ) {
            throw (
                "Interaction không phải BEACON_TRIGGER " +
                "nhưng có beaconId: $eventId"
            )
        }

        $language = [string]$entry.languageCode

        if ($language -notin @('vi', 'en')) {
            throw "languageCode không hợp lệ: $eventId"
        }

        $timestampColumns = @(
            'startedAt',
            'endedAt',
            'interactedAt'
        )

        $timestampSql = @()

        foreach ($column in $timestampColumns) {
            $dateValue = [DateTimeOffset]::MinValue

            if (
                -not [DateTimeOffset]::TryParse(
                    [string]$entry.$column,
                    [ref]$dateValue
                )
            ) {
                throw "Timestamp $column không hợp lệ: $eventId"
            }

            $utcValue = $dateValue.ToUniversalTime().ToString(
                "yyyy-MM-ddTHH:mm:ss.fffffff+00:00",
                [Globalization.CultureInfo]::InvariantCulture
            )

            $timestampSql += (
                (ConvertTo-SqlLiteral $utcValue) +
                '::timestamptz'
            )
        }

        if (
            [DateTimeOffset]::Parse(
                [string]$entry.endedAt
            ) -lt
            [DateTimeOffset]::Parse(
                [string]$entry.startedAt
            )
        ) {
            throw "endedAt trước startedAt: $eventId"
        }

        $expectedRows += (
            '(' +
            (ConvertTo-SqlLiteral $eventId) + '::uuid, ' +
            (ConvertTo-SqlLiteral $visitorId) + '::uuid, ' +
            "$artifactId, " +
            (ConvertTo-SqlLiteral $type) + ', ' +
            "$beaconSql, " +
            (ConvertTo-SqlLiteral $language) + ', ' +
            ($timestampSql -join ', ') +
            ')'
        )
    }

    # ---------------------------------------------------------
    # 13.9. Verify expected interaction count
    # ---------------------------------------------------------

    if ($expectedRows.Count -ne $expectedInteractionCount) {
        throw (
            "Expected $expectedInteractionCount manifest interactions, " +
            "got $($expectedRows.Count)."
        )
    }

    $expectedUniqueVisitorCount = $seenVisitorIds.Count

    $valuesSql = $expectedRows -join ",`n"

    # ---------------------------------------------------------
    # 13.10. Compare manifest interactions with PostgreSQL
    # ---------------------------------------------------------

    $sql = @"
WITH expected (
    event_id,
    visitor_id,
    artifact_id,
    interaction_type,
    beacon_id,
    language_code,
    started_at,
    ended_at,
    interacted_at
) AS (
    VALUES
    $valuesSql
),
comparison AS (
    SELECT
        e.event_id,
        vi.event_id AS actual_event_id
    FROM expected e
    LEFT JOIN public.visitor_interaction vi
        ON vi.event_id = e.event_id
    WHERE
        vi.event_id IS NULL
        OR vi.user_id IS NOT NULL
        OR vi.visitor_id IS DISTINCT FROM e.visitor_id
        OR vi.artifact_id IS DISTINCT FROM e.artifact_id
        OR vi.interaction_type::text IS DISTINCT FROM e.interaction_type
        OR vi.beacon_id IS DISTINCT FROM e.beacon_id
        OR vi.language_code IS DISTINCT FROM e.language_code
        OR vi.started_at IS DISTINCT FROM e.started_at
        OR vi.ended_at IS DISTINCT FROM e.ended_at
        OR vi.interacted_at IS DISTINCT FROM e.interacted_at
)
SELECT
    (SELECT COUNT(*) FROM public.visitor_interaction vi
     WHERE vi.event_id IN (SELECT event_id FROM expected))::text
    || '|' ||
    (SELECT COUNT(*) FROM comparison)::text
    || '|' ||
    (SELECT COUNT(DISTINCT vi.visitor_id)
     FROM public.visitor_interaction vi
     WHERE vi.event_id IN (SELECT event_id FROM expected))::text
    || '|' ||
    (SELECT COUNT(*) FROM public.visitor_interaction vi
     JOIN expected e ON e.event_id = vi.event_id
     WHERE e.interaction_type = 'BEACON_TRIGGER'
       AND (
           vi.beacon_id IS NULL
           OR NOT EXISTS (
               SELECT 1
               FROM public.beacon b
               WHERE b.beacon_id = vi.beacon_id
                 AND b.enabled = TRUE
                 AND b.artifact_id = vi.artifact_id
           )
       ))::text;
"@

    $stats = (Invoke-PostgresSql -Sql $sql).Trim().Split('|')

    if ($stats.Count -ne 4) {
        throw 'Không đọc được kết quả đối chiếu Interaction.'
    }

    $actualCounts = @(
        [int]$stats[0],
        [int]$stats[1],
        [int]$stats[2],
        [int]$stats[3]
    )

    $expectedStats = @(
        $expectedInteractionCount,
        0,
        $expectedUniqueVisitorCount,
        0
    )

    $statNames = @(
        'Total events',
        'Mismatched events',
        'Unique anonymous visitors',
        'Invalid beacon mappings'
    )

    for ($i = 0; $i -lt $expectedStats.Count; $i++) {
        if ($actualCounts[$i] -ne $expectedStats[$i]) {
            throw (
                "PostgreSQL Verify thất bại: $($statNames[$i]). " +
                "Actual=$($actualCounts[$i]) " +
                "Expected=$($expectedStats[$i])"
            )
        }
    }

    # ---------------------------------------------------------
    # 13.11. Verify success
    # ---------------------------------------------------------

    Write-Host ''
    Write-Host '======================================'
    Write-Host 'SMART HERITAGE VERIFY SUCCESS'
    Write-Host '======================================'
    Write-Host "HeritageSite      : $expectedSiteCount"
    Write-Host "Artifact          : $expectedArtifactCount"
    Write-Host "Multimedia        : $expectedMultimediaCount"
    Write-Host "Beacon            : $expectedBeaconCount"
    Write-Host "VisitorInteraction: $expectedInteractionCount"
    Write-Host "Unique Visitors   : $expectedUniqueVisitorCount"
    Write-Host "InteractionAnchor : $($verifyAnchor.ToString('o'))"
    Write-Host "Analytics 7 days  : $($analyticsCounts['7 ngày'])"
    Write-Host "Analytics 30 days : $($analyticsCounts['30 ngày'])"
    Write-Host "Analytics 90 days : $($analyticsCounts['90 ngày'])"
    Write-Host "Analytics All Time: $($analyticsCounts['All Time'])"
    Write-Host 'API records       : Valid'
    Write-Host 'Media files       : Valid'
    Write-Host 'PostgreSQL data   : Matched'
    Write-Host 'Beacon mapping    : Valid'
    Write-Host 'Anonymous visitor : Valid'
    Write-Host ''

    return
}

# ============================================================
# 14. CLEANUP MODE
# ============================================================


if ($Cleanup) {
    if ($null -eq $script:Manifest) {
        throw "Không tìm thấy manifest. Cleanup bị hủy."
    }

    Write-Host "Starting safe cleanup..." -ForegroundColor Yellow

    # --------------------------------------------------------
    # Load current API records.
    # Read-only operations; no deletion happens here.
    # --------------------------------------------------------

    $currentSites = @(Get-ApiList '/api/heritage-sites')
    $currentArtifacts = @(Get-ApiList '/api/artifacts')
    $currentMedia = @(Get-ApiList '/api/multimedia')
    $currentBeacons = @(Get-ApiList '/api/admin/beacons')

    # --------------------------------------------------------
    # Validate manifest ownership entries.
    # --------------------------------------------------------

    $cleanupGroups = @(
        @{
            Collection = 'multimedia'
            Endpoint = '/api/multimedia'
            Current = $currentMedia
            IdField = 'multimediaId'
            Checks = @(
                @{ Field = 'artifactId'; ManifestField = 'artifactId'; Type = 'Int' }
                @{ Field = 'url'; ManifestField = 'url'; Type = 'String' }
            )
        },
        @{
            Collection = 'beacons'
            Endpoint = '/api/admin/beacons'
            Current = $currentBeacons
            IdField = 'beaconId'
            Checks = @(
                @{ Field = 'uuid'; ManifestField = 'uuid'; Type = 'String' }
                @{ Field = 'major'; ManifestField = 'major'; Type = 'Int' }
                @{ Field = 'minor'; ManifestField = 'minor'; Type = 'Int' }
                @{ Field = 'artifactId'; ManifestField = 'artifactId'; Type = 'Int' }
            )
        },
        @{
            Collection = 'artifacts'
            Endpoint = '/api/artifacts'
            Current = $currentArtifacts
            IdField = 'artifactId'
            Checks = @(
                @{ Field = 'name'; ManifestField = 'name'; Type = 'String' }
                @{ Field = 'siteId'; ManifestField = 'siteId'; Type = 'Int' }
            )
        },
        @{
            Collection = 'sites'
            Endpoint = '/api/heritage-sites'
            Current = $currentSites
            IdField = 'siteId'
            Checks = @(
                @{ Field = 'name'; ManifestField = 'name'; Type = 'String' }
            )
        }
    )

    # Validate every owned API record before performing any deletion.
    foreach ($group in $cleanupGroups) {
        $entries = @(
            $script:Manifest.($group.Collection) |
            Where-Object { [bool]$_.createdBySeed }
        )

        $seenIds = @{}

        foreach ($entry in $entries) {
            $id = 0

            if (-not [int]::TryParse([string]$entry.id, [ref]$id) -or $id -le 0) {
                throw "Manifest $($group.Collection) chứa ID không hợp lệ."
            }

            if ($seenIds.ContainsKey($id)) {
                throw "Manifest $($group.Collection) có ID trùng: $id."
            }

            $seenIds[$id] = $true

            $matches = @(
                $group.Current |
                Where-Object {
                    [int]$_.($group.IdField) -eq $id
                }
            )

            if ($matches.Count -gt 1) {
                throw "API trả về nhiều bản ghi cùng ID $id trong $($group.Collection)."
            }

            if ($matches.Count -eq 0) {
                Write-Host "Already absent: $($group.Collection) ID=$id"
                continue
            }

            $actual = $matches[0]

            foreach ($check in $group.Checks) {
                $actualValue = $actual.($check.Field)
                $expectedValue = $entry.($check.ManifestField)

                if ($check.Type -eq 'Int') {
                    if (
                        $null -eq $actualValue -or
                        $null -eq $expectedValue -or
                        [int]$actualValue -ne [int]$expectedValue
                    ) {
                        throw (
                            "Identity mismatch: $($group.Collection) ID=$id, " +
                            "field=$($check.Field). Cleanup bị hủy."
                        )
                    }
                }
                else {
                    if (
                        [string]$actualValue -cne [string]$expectedValue
                    ) {
                        throw (
                            "Identity mismatch: $($group.Collection) ID=$id, " +
                            "field=$($check.Field). Cleanup bị hủy."
                        )
                    }
                }
            }
        }
    }

    # --------------------------------------------------------
    # Validate owned interaction identities.
    # --------------------------------------------------------

    $ownedEvents = @(
        $script:Manifest.interactions |
        Where-Object { [bool]$_.createdBySeed }
    )

    $seenEvents = @{}
    $expectedRows = @()

    foreach ($entry in $ownedEvents) {
        $eventGuid = [guid]::Empty
        $visitorGuid = [guid]::Empty

        if (
            -not [guid]::TryParse([string]$entry.eventId, [ref]$eventGuid) -or
            -not [guid]::TryParse([string]$entry.visitorId, [ref]$visitorGuid)
        ) {
            throw "Manifest Interaction có UUID không hợp lệ. Cleanup bị hủy."
        }

        $eventId = $eventGuid.ToString()

        if ($seenEvents.ContainsKey($eventId)) {
            throw "Manifest có eventId trùng: $eventId."
        }

        $seenEvents[$eventId] = $true

        $artifactId = 0
        if (
            -not [int]::TryParse([string]$entry.artifactId, [ref]$artifactId) -or
            $artifactId -le 0
        ) {
            throw "Interaction $eventId có artifactId không hợp lệ."
        }

        $interactionType = [string]$entry.interactionType
        if ($interactionType -notin @('VIEW', 'SCAN', 'AUDIO_PLAY', 'BEACON_TRIGGER')) {
            throw "Interaction $eventId có interactionType không hợp lệ."
        }

        $beaconSql = 'NULL::integer'
        if (
            $null -ne $entry.PSObject.Properties['beaconId'] -and
            $null -ne $entry.PSObject.Properties['beaconId'].Value
        ) {
            $beaconId = 0

            if (
                -not [int]::TryParse([string]$entry.beaconId, [ref]$beaconId) -or
                $beaconId -le 0
            ) {
                throw "Interaction $eventId có beaconId không hợp lệ."
            }

            if ($interactionType -ne 'BEACON_TRIGGER') {
                throw "Interaction $eventId có beaconId không phù hợp loại sự kiện."
            }

            $beaconSql = "$beaconId::integer"
        }
        elseif ($interactionType -eq 'BEACON_TRIGGER') {
            throw "BEACON_TRIGGER $eventId thiếu beaconId."
        }

        $languageCode = ([string]$entry.languageCode).Replace("'", "''")
        $interactionTypeSql = $interactionType.Replace("'", "''")

        foreach ($timestampField in @('startedAt', 'endedAt', 'interactedAt')) {
            $parsedTime = [DateTimeOffset]::MinValue

            if (
                -not [DateTimeOffset]::TryParse(
                    [string]$entry.$timestampField,
                    [ref]$parsedTime
                )
            ) {
                throw "Interaction $eventId có $timestampField không hợp lệ."
            }
        }

        $startedAt = ([string]$entry.startedAt).Replace("'", "''")
        $endedAt = ([string]$entry.endedAt).Replace("'", "''")
        $interactedAt = ([string]$entry.interactedAt).Replace("'", "''")

        $expectedRows += @"
(
    '$eventId'::uuid,
    '$($visitorGuid.ToString())'::uuid,
    $artifactId::integer,
    '$interactionTypeSql',
    $beaconSql,
    '$languageCode',
    '$startedAt'::timestamptz,
    '$endedAt'::timestamptz,
    '$interactedAt'::timestamptz
)
"@
    }

    # --------------------------------------------------------
    # 4. Delete only exact matching anonymous interactions.
    # Missing rows are allowed for interrupted-cleanup recovery.
    # Any existing identity mismatch aborts the transaction.
    # --------------------------------------------------------

    if ($expectedRows.Count -gt 0) {
        $valuesSql = $expectedRows -join ",`n"

        $interactionSql = @"
DO `$cleanup`$
DECLARE
    mismatch_count INTEGER;
BEGIN
    WITH expected (
        event_id,
        visitor_id,
        artifact_id,
        interaction_type,
        beacon_id,
        language_code,
        started_at,
        ended_at,
        interacted_at
    ) AS (
        VALUES
        $valuesSql
    )
    SELECT COUNT(*)
    INTO mismatch_count
    FROM public.visitor_interaction actual
    JOIN expected e ON e.event_id = actual.event_id
    WHERE
        actual.user_id IS NOT NULL
        OR actual.visitor_id IS DISTINCT FROM e.visitor_id
        OR actual.artifact_id IS DISTINCT FROM e.artifact_id
        OR actual.interaction_type IS DISTINCT FROM e.interaction_type
        OR actual.beacon_id IS DISTINCT FROM e.beacon_id
        OR actual.language_code IS DISTINCT FROM e.language_code
        OR actual.started_at IS DISTINCT FROM e.started_at
        OR actual.ended_at IS DISTINCT FROM e.ended_at
        OR actual.interacted_at IS DISTINCT FROM e.interacted_at;

    IF mismatch_count > 0 THEN
        RAISE EXCEPTION
            'Interaction identity mismatch. Cleanup aborted.';
    END IF;

    WITH expected (
        event_id,
        visitor_id,
        artifact_id,
        interaction_type,
        beacon_id,
        language_code,
        started_at,
        ended_at,
        interacted_at
    ) AS (
        VALUES
        $valuesSql
    )
    DELETE FROM public.visitor_interaction actual
    USING expected e
    WHERE
        actual.event_id = e.event_id
        AND actual.user_id IS NULL
        AND actual.visitor_id = e.visitor_id
        AND actual.artifact_id = e.artifact_id
        AND actual.interaction_type = e.interaction_type
        AND actual.beacon_id IS NOT DISTINCT FROM e.beacon_id
        AND actual.language_code = e.language_code
        AND actual.started_at = e.started_at
        AND actual.ended_at = e.ended_at
        AND actual.interacted_at = e.interacted_at;
END
`$cleanup`$;
"@

        if ($script:PSCmdlet.ShouldProcess(
            'Owned anonymous VisitorInteraction records',
            'DELETE exact matching rows from PostgreSQL'
        )) {
            Invoke-PostgresSql -Sql $interactionSql -AllowEmpty | Out-Null
            Write-Host "Deleted owned VisitorInteraction records."
        }
        elseif (-not $WhatIfPreference) {
            throw "Cleanup bị người dùng từ chối tại bước xóa VisitorInteraction. Đã dừng."
        }
    }

    # --------------------------------------------------------
    # Delete API resources in reverse dependency order.
    # --------------------------------------------------------

    foreach ($group in $cleanupGroups) {
        $entries = @(
            $script:Manifest.($group.Collection) |
            Where-Object { [bool]$_.createdBySeed }
        )

        foreach ($entry in $entries) {
            $id = [int]$entry.id

            $matches = @(
                $group.Current |
                Where-Object {
                    [int]$_.($group.IdField) -eq $id
                }
            )

            if ($matches.Count -eq 0) {
                Write-Host "Already absent: $($group.Collection) ID=$id"
                continue
            }

            $path = "$($group.Endpoint)/$id"

            if ($script:PSCmdlet.ShouldProcess(
                $path,
                "DELETE owned $($group.Collection) ID=$id"
            )) {
                Invoke-Api `
                    -Method DELETE `
                    -Path $path `
                    -AllowedStatus @(200, 204) | Out-Null

                Write-Host "Deleted $($group.Collection) ID=$id"
            }
            elseif (-not $WhatIfPreference) {
                throw "Cleanup bị người dùng từ chối tại $path. Đã dừng."
            }
        }
    }

    # --------------------------------------------------------
    #  Never update the manifest during WhatIf.
    # --------------------------------------------------------

    if (-not $WhatIfPreference) {
        $cleanupNow = [DateTimeOffset]::UtcNow

        Set-ManifestProperty `
            -Name 'cleanedAtUtc' `
            -Value $cleanupNow.ToString('o')

        Set-ManifestProperty `
            -Name 'updatedAtUtc' `
            -Value $cleanupNow.ToString('o')

        Set-ManifestProperty `
            -Name 'interactionAnchorAtUtc' `
            -Value $null

        $script:Manifest.interactions = @()
        Save-Manifest
    }
    else {
        Write-Host "WhatIf: manifest was not modified."
    }

    Write-Host ''
    Write-Host '======================================'
    Write-Host 'SMART HERITAGE DEMO CLEANUP FINISHED'
    Write-Host '======================================'

    return
}


# ============================================================
# 15. SEED MODE - INITIALIZE MANIFEST
# ============================================================

if (-not $script:PSCmdlet.ShouldProcess(
    $BaseUrl,
    'Seed Smart Heritage demo dataset'
)) {
    return
}

$now = [DateTimeOffset]::UtcNow
$anchorProperty = $null

if ($null -eq $script:Manifest) {
    $script:Manifest = [ordered]@{
        version = 2
        seedName = 'smart-heritage-demo'
        baseUrl = $BaseUrl

        createdAtUtc = $now.ToString('o')
        updatedAtUtc = $now.ToString('o')

        sites = @()
        artifacts = @()
        multimedia = @()
        beacons = @()
        interactions = @()
    }
}
else {
    $anchorProperty = $script:Manifest.PSObject.Properties[
        'interactionAnchorAtUtc'
    ]
}

$anchorWasStored = (
    $null -ne $anchorProperty -and
    -not [string]::IsNullOrWhiteSpace([string]$anchorProperty.Value)
)

$interactionAnchorAtUtc = Resolve-DemoSeedInteractionAnchor `
    -Manifest $script:Manifest `
    -Now $now

Set-ManifestProperty `
    -Name 'interactionAnchorAtUtc' `
    -Value $interactionAnchorAtUtc.ToString('o')

Save-Manifest

if (
    -not $anchorWasStored -and
    @($script:Manifest.interactions).Count -gt 0
) {
    Write-Warning (
        'Manifest cũ chưa có interactionAnchorAtUtc. ' +
        'Đã suy ra anchor từ dữ liệu hiện có để không thay đổi ' +
        'timestamp. Chạy Cleanup rồi Seed lại nếu cần làm mới ' +
        'các cửa sổ analytics 7/30/90 ngày.'
    )
}

$siteList = @(Get-ApiList '/api/heritage-sites')
$artifactList = @(Get-ApiList '/api/artifacts')
$mediaList = @(Get-ApiList '/api/multimedia')
$beaconList = @(Get-ApiList '/api/admin/beacons')

# ============================================================
# 16. SEED HERITAGE SITES
# ============================================================

$SiteIds = @{}

foreach ($site in $Sites) {
    $payload = @{
        name = $site.Name
        description = $site.Description.Trim()
        address = $site.Address
        latitude = $site.Latitude
        longitude = $site.Longitude
    }

    $result = Ensure-Record `
        -Kind 'HeritageSite' `
        -Path '/api/heritage-sites' `
        -Payload $payload `
        -Existing $siteList `
        -MatchProperty 'name' `
        -MatchValue $site.Name `
        -CompareProperties @(
            'name',
            'description',
            'address',
            'latitude',
            'longitude'
        ) `
        -IdProperty 'siteId' `
        -ManifestCollection 'sites' `
        -ManifestKey $site.Key

    $id = [int]$result.Data.siteId
    $SiteIds[$site.Key] = $id

    Set-ManifestEntry -Collection 'sites' -Entry (
        [pscustomobject]@{
            key = $site.Key
            id = $id
            name = $site.Name
            createdBySeed = $result.CreatedBySeed
        }
    )

    $siteList += $result.Data
}

# ============================================================
# 17. SEED ARTIFACTS
# ============================================================

$ArtifactIds = @{}

foreach ($artifact in $Artifacts) {
    $siteId = [int]$SiteIds[$artifact.SiteKey]

    $payload = @{
        siteId = $siteId
        name = $artifact.Name
        description = $artifact.Description.Trim()
    }

    $result = Ensure-Record `
        -Kind 'Artifact' `
        -Path '/api/artifacts' `
        -Payload $payload `
        -Existing $artifactList `
        -MatchProperty 'name' `
        -MatchValue $artifact.Name `
        -CompareProperties @(
            'name',
            'description',
            'siteId'
        ) `
        -IdProperty 'artifactId' `
        -ManifestCollection 'artifacts' `
        -ManifestKey $artifact.Key

    $id = [int]$result.Data.artifactId
    $ArtifactIds[$artifact.Key] = $id

    Set-ManifestEntry -Collection 'artifacts' -Entry (
        [pscustomobject]@{
            key = $artifact.Key
            id = $id
            name = $artifact.Name
            siteId = $siteId
            createdBySeed = $result.CreatedBySeed
        }
    )

    $artifactList += $result.Data
}

# ============================================================
# 18. SEED MULTIMEDIA
# ============================================================

foreach ($artifact in $Artifacts) {
    $artifactId = [int]$ArtifactIds[$artifact.Key]

    $url = "/demo-media/artifacts/$($artifact.Image)"

    Assert-MediaAvailable -Url $url

    $payload = @{
        artifactId = $artifactId
        type = 'IMAGE'
        title = $artifact.Name
        url = $url
    }

    $result = Ensure-Record `
        -Kind 'Multimedia' `
        -Path '/api/multimedia' `
        -Payload $payload `
        -Existing $mediaList `
        -MatchProperty 'url' `
        -MatchValue $url `
        -CompareProperties @(
            'url',
            'artifactId',
            'type',
            'title'
        ) `
        -IdProperty 'multimediaId' `
        -ManifestCollection 'multimedia' `
        -ManifestKey $artifact.Key

    $mediaList += $result.Data

    Set-ManifestEntry -Collection 'multimedia' -Entry (
        [pscustomobject]@{
            key = $artifact.Key
            id = [int]$result.Data.multimediaId
            artifactId = $artifactId
            url = $url
            createdBySeed = $result.CreatedBySeed
        }
    )
}

# ============================================================
# 19. SEED BEACONS
# ============================================================

$BeaconIds = @{}

foreach ($beacon in $Beacons) {
    $artifactId = [int]$ArtifactIds[$beacon.ArtifactKey]

    $result = Ensure-Beacon `
        -Definition $beacon `
        -ArtifactId $artifactId `
        -Existing $beaconList

    $id = [int]$result.Data.beaconId
    $BeaconIds[$beacon.Key] = $id

    Set-ManifestEntry -Collection 'beacons' -Entry (
        [pscustomobject]@{
            key = $beacon.Key
            id = $id
            uuid = $beacon.UUID
            major = $beacon.Major
            minor = $beacon.Minor
            artifactId = $artifactId
            createdBySeed = $result.CreatedBySeed
        }
    )

    $beaconList += $result.Data
}

# ============================================================
# 20. SEED VISITOR INTERACTIONS
# ============================================================

$interactionDefinitions = New-DemoSeedInteractionDefinitions `
    -Artifacts $Artifacts `
    -Beacons $Beacons `
    -VisitorIds $VisitorIds `
    -ArtifactIds $ArtifactIds `
    -BeaconIds $BeaconIds `
    -AnchorAtUtc $interactionAnchorAtUtc

foreach ($interaction in $interactionDefinitions) {
    $payload = @{
        eventId = $interaction.eventId
        visitorId = $interaction.visitorId
        artifactId = $interaction.artifactId
        interactionType = $interaction.interactionType
        languageCode = $interaction.languageCode
        startedAt = $interaction.startedAt
        endedAt = $interaction.endedAt
        interactedAt = $interaction.interactedAt
    }

    if (
        $interaction.PSObject.Properties.Name -contains 'beaconId'
    ) {
        $payload.beaconId = [int]$interaction.beaconId
    }

    $previous = @(
        $script:Manifest.interactions |
        Where-Object {
            $_.eventId -ceq $interaction.eventId
        }
    )

    if (-not $script:PSCmdlet.ShouldProcess(
        "Interaction $($interaction.eventId)",
        'POST /api/interactions'
    )) {
        throw 'Seed bị hủy khi đang tạo Interaction.'
    }

    # Anonymous visitor events must not include the ADMIN JWT.
    # 201 = new record; 200 = idempotent replay.

    $response = Invoke-Api `
        -Method POST `
        -Path '/api/interactions' `
        -Body $payload `
        -Anonymous `
        -AllowedStatus @(200, 201)

    if (
        $null -eq $response.Data -or
        $response.Data.eventId -cne $interaction.eventId
    ) {
        throw "Interaction response không khớp eventId."
    }

    $createdBySeed = ($response.StatusCode -eq 201)

    # Preserve ownership when replaying an event created by this seed.
    if (
        $previous.Count -eq 1 -and
        [bool]$previous[0].createdBySeed
    ) {
        $createdBySeed = $true
    }

    $interactionEntryData = @{
        key = $interaction.eventId
        eventId = $interaction.eventId
        visitorId = $interaction.visitorId
        artifactId = $interaction.artifactId
        interactionType = $interaction.interactionType
        languageCode = $interaction.languageCode
        startedAt = $interaction.startedAt
        endedAt = $interaction.endedAt
        interactedAt = $interaction.interactedAt
        createdBySeed = $createdBySeed
    }

    if ($interaction.PSObject.Properties.Name -contains 'beaconId') {
        $interactionEntryData.beaconId = [int]$interaction.beaconId
    }

    $interactionEntry = [pscustomobject]$interactionEntryData

    $script:Manifest.interactions = @(
        $script:Manifest.interactions |
        Where-Object {
            $_.eventId -cne $interaction.eventId
        }
    ) + @($interactionEntry)

    $script:Manifest.updatedAtUtc = [DateTime]::UtcNow.ToString('o')
    Save-Manifest

    $status = if ($response.StatusCode -eq 201) {
        'CREATED'
    }
    else {
        'REPLAYED'
    }

    Write-Host "$status Interaction $($interaction.eventId)"
}

# ============================================================
# 21. FINAL MANIFEST CHECK
# ============================================================

$expectedSiteCount = @($Sites).Count
$expectedArtifactCount = @($Artifacts).Count

$expectedMultimediaCount = @(
    $Artifacts |
        Where-Object {
            -not [string]::IsNullOrWhiteSpace($_.Image)
        }
).Count

$expectedBeaconCount = @($Beacons).Count
$expectedInteractionCount = $expectedArtifactCount * 3

$expectedCounts = @{
    sites = $expectedSiteCount
    artifacts = $expectedArtifactCount
    multimedia = $expectedMultimediaCount
    beacons = $expectedBeaconCount
    interactions = $expectedInteractionCount
}

foreach ($collection in $expectedCounts.Keys) {
    $actual = @($script:Manifest.$collection).Count
    $expected = $expectedCounts[$collection]

    if ($actual -ne $expected) {
        throw (
            "Manifest $collection không đủ số lượng. " +
            "Actual=$actual Expected=$expected"
        )
    }
}

Set-ManifestProperty -Name 'cleanedAtUtc' -Value $null
$script:Manifest.updatedAtUtc = [DateTime]::UtcNow.ToString('o')
Save-Manifest

Write-Host ''
Write-Host '======================================'
Write-Host 'SMART HERITAGE DEMO SEED COMPLETED'
Write-Host '======================================'
Write-Host "HeritageSite      : $expectedSiteCount"
Write-Host "Artifact          : $expectedArtifactCount"
Write-Host "Multimedia        : $expectedMultimediaCount"
Write-Host "Beacon            : $expectedBeaconCount"
Write-Host "VisitorInteraction: $expectedInteractionCount"
Write-Host "Manifest          : $ManifestPath"
Write-Host ''
Write-Host 'Next step:'
Write-Host '.\seed-demo-data.ps1 -Verify'
Write-Warning 'Ảnh và nội dung minh họa cần được đối chiếu nguồn và quyền sử dụng trước khi công bố.'