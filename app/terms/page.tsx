import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col items-center p-4 bg-gradient-to-b from-pink-500 to-purple-600">
      <div className="w-full max-w-3xl bg-white rounded-lg shadow-lg p-6 my-8">
        <div className="flex items-center mb-6">
          <Link href="/">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold ml-2">Termos de Uso e Política de Privacidade</h1>
        </div>

        <div className="prose max-w-none">
          <h2 className="text-xl font-semibold mb-4">1. Termos de Uso</h2>

          <p>Ao acessar e usar este serviço de OneMinute, você concorda com os seguintes termos e condições:</p>

          <h3 className="text-lg font-medium mt-4 mb-2">1.1 Elegibilidade</h3>
          <p>
            Você deve ter pelo menos 18 anos de idade para usar este serviço. Ao criar uma conta, você confirma que tem
            18 anos ou mais.
          </p>

          <h3 className="text-lg font-medium mt-4 mb-2">1.2 Conduta do Usuário</h3>
          <p>Você concorda em não usar o serviço para:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Assediar, intimidar ou ameaçar outros usuários</li>
            <li>Compartilhar conteúdo ilegal, ofensivo, obsceno ou inapropriado</li>
            <li>Violar direitos de propriedade intelectual</li>
            <li>Enganar ou fraudar outros usuários</li>
            <li>Distribuir spam ou conteúdo comercial não solicitado</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">1.3 Contas</h3>
          <p>
            Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrem em sua
            conta. Você concorda em notificar imediatamente qualquer uso não autorizado de sua conta.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">2. Política de Privacidade</h2>

          <h3 className="text-lg font-medium mt-4 mb-2">2.1 Informações Coletadas</h3>
          <p>Coletamos as seguintes informações:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Informações de perfil (nome, idade, interesses, preferências)</li>
            <li>Dados de uso (interações, matches, mensagens)</li>
            <li>Informações técnicas (endereço IP, tipo de dispositivo)</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">2.2 Uso de Informações</h3>
          <p>Usamos suas informações para:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Fornecer e melhorar nossos serviços</li>
            <li>Conectar você com outros usuários</li>
            <li>Personalizar sua experiência</li>
            <li>Garantir a segurança da plataforma</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">2.3 Compartilhamento de Dados</h3>
          <p>Não vendemos suas informações pessoais. Compartilhamos dados apenas:</p>
          <ul className="list-disc pl-5 mb-4">
            <li>Com outros usuários, conforme necessário para o funcionamento do serviço</li>
            <li>Com prestadores de serviços que nos ajudam a operar a plataforma</li>
            <li>Quando exigido por lei ou para proteger direitos legais</li>
          </ul>

          <h3 className="text-lg font-medium mt-4 mb-2">2.4 Segurança</h3>
          <p>
            Implementamos medidas de segurança para proteger suas informações, mas nenhum método de transmissão pela
            Internet é 100% seguro.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">3. Alterações nos Termos</h2>
          <p>
            Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão em vigor
            imediatamente após a publicação. O uso continuado do serviço após tais alterações constitui sua aceitação
            dos novos termos.
          </p>

          <h2 className="text-xl font-semibold mt-6 mb-4">4. Contato</h2>
          <p>
            Se você tiver dúvidas sobre estes termos, entre em contato conosco através do email: support@videodating.com
          </p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/">
            <Button>Voltar para o Início</Button>
          </Link>
        </div>
      </div>
    </main>
  )
}
