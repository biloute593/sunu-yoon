import React, { useState } from 'react';
import { Icons } from './Icons';

interface FAQItem {
  question: string;
  answer: string;
}

const faqData: FAQItem[] = [
  {
    question: "Comment fonctionne Sunu Yoon ?",
    answer: "Sunu Yoon est une plateforme de covoiturage qui met en relation conducteurs et passagers pour partager des trajets au Sénégal. Les conducteurs publient leurs trajets avec le prix, la date et les places disponibles. Les passagers recherchent un trajet et réservent directement."
  },
  {
    question: "Est-ce que je dois créer un compte pour réserver ?",
    answer: "Non ! Vous pouvez publier un trajet sans inscription. Pour réserver, un compte est nécessaire pour vous contacter et vous envoyer les détails du voyage. L'inscription prend moins d'une minute."
  },
  {
    question: "Comment payer mon trajet ?",
    answer: "Plusieurs options s'offrent à vous : paiement par Orange Money, Wave, ou en espèces directement au conducteur au moment du départ. Les paiements mobiles sont sécurisés et instantanés."
  },
  {
    question: "Est-ce sécurisé ?",
    answer: "Oui ! Tous nos membres sont vérifiés par numéro de téléphone. Vous pouvez consulter les avis et notes des conducteurs avant de réserver. En cas de problème, notre équipe support est disponible 7j/7."
  },
  {
    question: "Puis-je annuler ma réservation ?",
    answer: "Oui, vous pouvez annuler gratuitement jusqu'à 24h avant le départ. En cas d'annulation tardive ou d'absence, des frais peuvent s'appliquer. Le conducteur peut également annuler, et vous serez remboursé intégralement."
  },
  {
    question: "Comment devenir conducteur ?",
    answer: "C'est simple ! Créez un compte, vérifiez votre profil, et publiez votre premier trajet. Indiquez votre itinéraire, date, heure et prix. Vous recevrez des demandes de réservation que vous pouvez accepter ou refuser."
  },
  {
    question: "Combien coûte l'utilisation de Sunu Yoon ?",
    answer: "L'inscription et la publication de trajets sont 100% gratuites. Une petite commission est prélevée uniquement sur les paiements en ligne (Orange Money, Wave) pour couvrir les frais de transaction."
  },
  {
    question: "Puis-je emmener des bagages ?",
    answer: "Cela dépend du conducteur. Chaque conducteur indique dans son annonce s'il accepte les bagages. En général, un bagage cabine est accepté. Pour les gros bagages, contactez le conducteur avant de réserver."
  }
];

const FAQSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">
          Questions fréquentes ❓
        </h2>
        <p className="text-gray-600">
          Tout ce que vous devez savoir pour bien démarrer
        </p>
      </div>

      <div className="space-y-3">
        {faqData.map((faq, index) => (
          <div
            key={index}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden transition-all hover:border-emerald-200"
          >
            <button
              onClick={() => toggle(index)}
              className="w-full flex items-center justify-between p-5 text-left group"
            >
              <span className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors pr-4">
                {faq.question}
              </span>
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                openIndex === index 
                  ? 'bg-emerald-100 text-emerald-600 rotate-180' 
                  : 'bg-gray-100 text-gray-500 group-hover:bg-emerald-50 group-hover:text-emerald-600'
              }`}>
                <Icons.ChevronRight size={18} className="rotate-90" />
              </div>
            </button>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
              openIndex === index ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            }`}>
              <div className="px-5 pb-5 pt-0">
                <div className="pt-2 border-t border-gray-100">
                  <p className="text-gray-600 leading-relaxed pt-3">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 mb-4">Vous avez d'autres questions ?</p>
        <a 
          href="mailto:support@sunuyoon.sn" 
          className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
        >
          <Icons.MessageCircle size={18} />
          Contactez-nous
        </a>
      </div>
    </div>
  );
};

export default FAQSection;
