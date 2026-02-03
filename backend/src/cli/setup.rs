//! First-time setup CLI interaction
//!
//! Handles the terminal-based setup wizard for first-time installation.

use dialoguer::{Input, theme::ColorfulTheme};
use rand::Rng;
use sqlx::SqlitePool;

// ============================================================================
// ASCII Art Banner - Replace with your own design
// ============================================================================
const BANNER: &str = r#"
                                                                    
            *#%%% %%# :.                                            
        =%#************%%=                                          
      .##****************#%:                                        
     .%#*******%%*%#******#%.                                       
     =%******%*.   -%******%:                                       
     :%*******     :%******#..:::::::::::::.                        
      :#%%%%+      *%******#::::::::::::::::::::.                   
                .=%#******#=:::::::::::::::::::::::                 
              =%%********#:::::-:::::::::::::::::::::.              
            :%********##-::::::::::::::::::::::::::-:::.            
           :%*******#+:::::::::::::....::::::::::::::::-:           
           =%******#:::::::::::::.*#**#=.:::::::::::-:::::          
           =%******#::::::::::-.*@=.*****::::::::::::-:::::         
           :##****#+::::-::-::.*@*%@::****.:::::::::.::.::::        
             .:==-:::::::::::::*   =@# =#*-.::::-::**#*#::--.       
            :*####*::::::-:::.#:   :@@@-:*+.:::-.=#*#*=::.::: .     
           =%*******+::::::-:.#:   =@@@@* :.-::.+#+:=@@@#.:::..:.   
           *#*******#:::-::::.=#. :%@@@@@%.::::::  =@@@@::::.  ..:. 
           .:%****#*::::::-:::.%@@@@@@@@@*.:::.#. .%@@@=.-::.::..:: 
            .==:::::::-:::::-:::%@@@@@@@#.::::.#. *@@@+.::...=: .::.
           :..==.:::::::-:::::::.-%@@@@= ::::::.%@@@%::::...==:. :-:
          :::.-=-.:::::::::::::::::....::::::::::...:--:...===.::.: 
         .::::.==-.::::::-:::::::::::::*%%%%%%%%*::::::::.-==::.:   
         ::::..:===..::::::::::::::::#%%%%%%%%%%%%%=:::..===-:%*..  
         ::::::.:===- .::::::::::::-%%%%%%%%%%%%%%%%=. :====:###*   
         ::::::..:====:..::-::::-::#%%%%%%=-*###=*%#-:====-:###@%.  
        .::::::::..-====-...:::::::+%%%%%%%%%%%%##=:-====:-%#%@@*=+ 
        .:::::.::::..======-. ..:::::+%%%%####+:.-======.*##%@@@:*#:
        .::::..:::.:...:=======-::.........::-=======-.+##%@@@@=+##.
         :::: :::::::.#:-.:========================..*%##@@@@@==##= 
         :::  .::::..=-=====-::::-============-::=*####%@@@@@==#%*. 
          :     :::..*:============:+=-::::=*#%#####%@@@@@@%: =#:   
                 :::.#::==========-=%############%%@@@@@@@=         
                  .:.=@@%#*+==--=+*%########%%@@@@@@@@@%-           
                 .*=. =@@@@@@@@@@@@@@@@@@@@@@@@@@@@@%+              
                 .*%##=:-#@@@@@@@@@@@@@@@@@@@@@@#=:                 
"#;

/// Generate a random port in the range 10000-65000
fn generate_random_port() -> u16 {
    rand::thread_rng().gen_range(10000..=65000)
}

/// Validate port number
fn validate_port(port: &str) -> Result<u16, String> {
    let port: u16 = port
        .parse()
        .map_err(|_| "请输入有效的数字".to_string())?;
    
    if port < 1024 {
        return Err("端口号必须大于 1023 (避免系统保留端口)".to_string());
    }
    
    Ok(port)
}

/// Check if a port is available
fn is_port_available(port: u16) -> bool {
    std::net::TcpListener::bind(format!("127.0.0.1:{}", port)).is_ok()
}

/// Run the first-time setup wizard
/// 
/// Returns the configured port number
pub fn run_first_time_setup() -> Result<u16, Box<dyn std::error::Error>> {
    // Print banner
    println!("{}", BANNER);
    println!("轻量级云端服务器控制台 v0.2.0");
    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!("首次启动，请配置服务");
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!();

    // Generate random default port
    let default_port = generate_random_port();
    
    // Check if we're running in a terminal
    let is_tty = std::io::IsTerminal::is_terminal(&std::io::stdin());
    
    let port: u16 = if is_tty {
        // Interactive mode: prompt for port
        loop {
            let input: String = Input::with_theme(&ColorfulTheme::default())
                .with_prompt("请输入服务端口号")
                .default(default_port.to_string())
                .interact_text()?;
            
            match validate_port(&input) {
                Ok(port) => {
                    if !is_port_available(port) {
                        println!("⚠️  端口 {} 已被占用，请选择其他端口", port);
                        continue;
                    }
                    break port;
                }
                Err(e) => {
                    println!("❌ {}", e);
                    continue;
                }
            }
        }
    } else {
        // Non-interactive mode: use default port
        println!("非交互模式，使用随机端口: {}", default_port);
        default_port
    };

    println!();
    println!("✓ 端口设置为 {}", port);
    
    Ok(port)
}

/// Save the configured port to database
pub async fn save_port_to_db(pool: &SqlitePool, port: u16) -> Result<(), sqlx::Error> {
    sqlx::query(
        "INSERT INTO system_settings (key, value, updated_at) VALUES ('https_port', $1, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = $1, updated_at = datetime('now')"
    )
    .bind(port.to_string())
    .execute(pool)
    .await?;
    
    Ok(())
}

/// Print the setup URL after configuration
pub fn print_setup_url(port: u16, token: &str) {
    println!("✓ 数据库已初始化");
    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!();
    println!("⚠️  请在浏览器中打开以下链接完成安装（链接仅有效一次）：");
    println!();
    println!("    http://localhost:{}/setup/{}", port, token);
    println!();
    println!("    此链接将在 30 分钟后过期");
    println!();
    println!("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    println!();
    println!("按 Ctrl+C 取消安装，或等待浏览器完成设置...");
}
