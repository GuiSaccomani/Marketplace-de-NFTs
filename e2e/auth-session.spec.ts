import { test, expect } from '@playwright/test'

test.describe('Autenticação, Sessão e Perfil do Colecionador', () => {
  test('deve gerenciar sessão: logout, login com credenciais simuladas e persistência após refresh', async ({
    page,
  }) => {
    // 1. Acessa a página de perfil
    await page.goto('/profile')

    // 2. Verifica perfil autenticado padrão
    await expect(page.getByRole('heading', { name: 'Guilherme Colecionador' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('heading', { name: /Carteiras Conectadas/i })).toBeVisible()

    // 3. Executa Logout clicando em "Sair"
    const logoutBtn = page.getByRole('button', { name: /Sair/i })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    // 4. Confirma que a sessão foi encerrada e a interface de visitante é exibida
    await expect(page.getByRole('heading', { name: /Acesso ao Perfil/i })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByText(/Você está navegando como visitante/i)).toBeVisible()

    // 5. Clica no botão "Entrar com Conta de Teste"
    const loginBtn = page.getByRole('button', { name: /Entrar com Conta de Teste/i })
    await expect(loginBtn).toBeVisible()
    await loginBtn.click()

    // 6. Confirma restauração da sessão autenticada
    await expect(page.getByRole('heading', { name: 'Guilherme Colecionador' })).toBeVisible({
      timeout: 10000,
    })

    // 7. Testa persistência após recarregamento (refresh)
    await page.reload()
    await expect(page.getByRole('heading', { name: 'Guilherme Colecionador' })).toBeVisible({
      timeout: 10000,
    })
    await expect(page.getByRole('heading', { name: /Carteiras Conectadas/i })).toBeVisible()
  })
})
