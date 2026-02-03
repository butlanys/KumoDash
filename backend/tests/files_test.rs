//! File management service unit tests

#[cfg(test)]
mod tests {
    mod validate_path {
        use kumadash::services::files::FileService;
        use std::path::PathBuf;

        #[test]
        fn rejects_relative_path() {
            let result = FileService::validate_path("relative/path");
            assert!(result.is_err());
        }

        #[test]
        fn rejects_dot_relative_path() {
            let result = FileService::validate_path("./relative");
            assert!(result.is_err());
        }

        #[test]
        fn accepts_absolute_path() {
            // /tmp should always exist on Linux
            let result = FileService::validate_path("/tmp");
            assert!(result.is_ok());
        }

        #[test]
        fn resolves_path_traversal() {
            // /tmp/../tmp should resolve to /tmp
            let result = FileService::validate_path("/tmp/../tmp");
            assert!(result.is_ok());
            assert_eq!(result.unwrap(), PathBuf::from("/tmp"));
        }
    }

    mod validate_path_for_create {
        use kumadash::services::files::FileService;

        #[test]
        fn rejects_relative_path() {
            let result = FileService::validate_path_for_create("relative/path");
            assert!(result.is_err());
        }

        #[test]
        fn rejects_path_with_double_dots() {
            let result = FileService::validate_path_for_create("/tmp/../etc/passwd");
            assert!(result.is_err());
        }

        #[test]
        fn rejects_path_ending_with_double_dots() {
            let result = FileService::validate_path_for_create("/tmp/..");
            assert!(result.is_err());
        }

        #[test]
        fn rejects_path_with_dot_slash() {
            let result = FileService::validate_path_for_create("/tmp/./test");
            assert!(result.is_err());
        }

        #[test]
        fn accepts_valid_absolute_path() {
            let result = FileService::validate_path_for_create("/tmp/new_file.txt");
            assert!(result.is_ok());
        }
    }

    mod list_dir {
        use kumadash::services::files::FileService;

        #[tokio::test]
        async fn lists_tmp_directory() {
            let result = FileService::list_dir("/tmp", false).await;
            assert!(result.is_ok());
            let listing = result.unwrap();
            assert_eq!(listing.path, "/tmp");
        }

        #[tokio::test]
        async fn returns_error_for_nonexistent_directory() {
            let result = FileService::list_dir("/nonexistent_dir_12345", false).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn returns_error_for_file_path() {
            let result = FileService::list_dir("/etc/passwd", false).await;
            assert!(result.is_err());
        }
    }

    mod read_file {
        use kumadash::services::files::FileService;

        #[tokio::test]
        async fn reads_existing_file() {
            let result = FileService::read_file("/etc/hostname", None).await;
            assert!(result.is_ok());
            let content = result.unwrap();
            assert_eq!(content.encoding, "utf-8");
        }

        #[tokio::test]
        async fn returns_error_for_nonexistent_file() {
            let result = FileService::read_file("/tmp/nonexistent_file_12345.txt", None).await;
            assert!(result.is_err());
        }

        #[tokio::test]
        async fn returns_error_for_directory() {
            let result = FileService::read_file("/tmp", None).await;
            assert!(result.is_err());
        }
    }

    mod write_and_delete {
        use kumadash::services::files::FileService;
        use std::time::{SystemTime, UNIX_EPOCH};

        #[tokio::test]
        async fn write_and_delete_file() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let path = format!("/tmp/kumadash_test_{}.txt", timestamp);
            
            // Write file
            let write_result = FileService::write_file(&path, "test content", false).await;
            assert!(write_result.is_ok());

            // Verify content
            let read_result = FileService::read_file(&path, None).await;
            assert!(read_result.is_ok());
            assert_eq!(read_result.unwrap().content, "test content");

            // Delete file
            let delete_result = FileService::delete(&path, false).await;
            assert!(delete_result.is_ok());

            // Verify deleted
            let verify_result = FileService::read_file(&path, None).await;
            assert!(verify_result.is_err());
        }
    }

    mod create_dir {
        use kumadash::services::files::FileService;
        use std::time::{SystemTime, UNIX_EPOCH};

        #[tokio::test]
        async fn create_and_delete_directory() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let path = format!("/tmp/kumadash_testdir_{}", timestamp);

            // Create directory
            let create_result = FileService::create_dir(&path, false).await;
            assert!(create_result.is_ok());

            // Verify exists
            let list_result = FileService::list_dir(&path, false).await;
            assert!(list_result.is_ok());

            // Delete directory
            let delete_result = FileService::delete(&path, false).await;
            assert!(delete_result.is_ok());
        }

        #[tokio::test]
        async fn create_nested_directory_recursive() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let path = format!("/tmp/kumadash_nested_{}/a/b/c", timestamp);

            // Create nested directory
            let create_result = FileService::create_dir(&path, true).await;
            assert!(create_result.is_ok());

            // Cleanup
            let root_path = format!("/tmp/kumadash_nested_{}", timestamp);
            let _ = FileService::delete(&root_path, true).await;
        }
    }

    mod rename {
        use kumadash::services::files::FileService;
        use std::time::{SystemTime, UNIX_EPOCH};

        #[tokio::test]
        async fn rename_file() {
            let timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_millis();
            let from_path = format!("/tmp/kumadash_rename_from_{}.txt", timestamp);
            let to_path = format!("/tmp/kumadash_rename_to_{}.txt", timestamp);

            // Create file
            FileService::write_file(&from_path, "test", false).await.unwrap();

            // Rename
            let rename_result = FileService::rename(&from_path, &to_path).await;
            assert!(rename_result.is_ok());

            // Verify new path exists
            let read_result = FileService::read_file(&to_path, None).await;
            assert!(read_result.is_ok());

            // Cleanup
            let _ = FileService::delete(&to_path, false).await;
        }
    }

    mod stat {
        use kumadash::services::files::FileService;

        #[tokio::test]
        async fn stat_file() {
            let result = FileService::stat("/etc/passwd").await;
            assert!(result.is_ok());
            let info = result.unwrap();
            assert_eq!(info.name, "passwd");
            assert!(info.size > 0);
        }

        #[tokio::test]
        async fn stat_directory() {
            let result = FileService::stat("/tmp").await;
            assert!(result.is_ok());
            let info = result.unwrap();
            assert_eq!(info.name, "tmp");
        }
    }

    mod search {
        use kumadash::services::files::FileService;

        #[tokio::test]
        async fn search_in_etc() {
            let result = FileService::search("/etc", "passwd", 1, 10).await;
            assert!(result.is_ok());
            let search = result.unwrap();
            assert!(search.matches.iter().any(|e| e.name == "passwd"));
        }
    }
}
