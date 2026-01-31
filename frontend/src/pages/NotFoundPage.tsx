import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export const NotFoundPage = () => {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Card className="border-none shadow-lg">
          <CardHeader className="text-center pb-2">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-8xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent select-none"
            >
              404
            </motion.div>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-muted-foreground">
              {t('page-not-found')}
            </p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default NotFoundPage
