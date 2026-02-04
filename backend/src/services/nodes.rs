//! Node abstraction (reserved for future multi-node support)

#[derive(Debug, Clone)]
pub struct LocalNode {
    pub id: String,
    pub name: String,
}

pub trait NodeProvider {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
}

impl NodeProvider for LocalNode {
    fn id(&self) -> &str {
        &self.id
    }

    fn name(&self) -> &str {
        &self.name
    }
}
