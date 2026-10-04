import { IonPage } from '@ionic/react';
import { Content } from '@/components/Content';
import { useParams } from 'react-router-dom';
import appConfig from '../../../app.config.json';
import { PageHeader } from '@/components/PageHeader';

/**
 * ST-8 / BRD §16: privacy policy and terms of use. The privacy text states what the BRD
 * requires (data stays on device, optional backup and Health access, anonymous opt-in
 * analytics). Have it reviewed before store submission.
 */
export default function LegalPage() {
  const { doc } = useParams();
  const privacy = doc === 'privacy';
  return (
    <IonPage>
      <PageHeader
        title={privacy ? 'Privacy Policy' : 'Terms of Use'}
        back={{ href: '/settings', text: 'Settings' }}
      />
      <Content className="ion-padding">
        <article className="gt-legal">{privacy ? <Privacy /> : <Terms />}</article>
      </Content>
    </IonPage>
  );
}

function Privacy() {
  return (
    <>
      <h1>Privacy Policy</h1>
      <p>Gym Tracker is built so your training data stays with you.</p>
      <h2>Data on your device</h2>
      <p>
        Workouts, exercises, body weight, measurements and notes are stored only on your device. We
        do not run accounts or servers that receive this data.
      </p>
      <h2>Leaving the device</h2>
      <p>Your data leaves the device only through actions you choose:</p>
      <ul>
        <li>Sharing a template, exercise or workout log.</li>
        <li>Exporting a CSV file or saving a backup file (for example to iCloud Drive).</li>
        <li>
          Turning on Apple Health or Health Connect sync, which writes workouts and reads and writes
          body weight.
        </li>
      </ul>
      <h2>Anonymous analytics</h2>
      <p>
        If you opt in, the app records anonymous usage events (such as "a set was completed") to
        help improve it. These events never include body weight, measurements, notes or names, are
        not linked to your identity and are not used for tracking. You can turn this off in Settings
        at any time.
      </p>
      <h2>Children</h2>
      <p>The app is rated 4+ and does not knowingly collect personal data from anyone.</p>
      {appConfig.supportEmail && (
        <>
          <h2>Contact</h2>
          <p>Questions: {appConfig.supportEmail}</p>
        </>
      )}
    </>
  );
}

function Terms() {
  return (
    <>
      <h1>Terms of Use</h1>
      <p>Gym Tracker is provided free of charge, without ads, accounts or in-app purchases.</p>
      <h2>Training safety</h2>
      <p>
        The app records your training; it does not give medical or coaching advice. Consult a
        qualified professional before starting a new programme and stop if you feel pain.
      </p>
      <h2>Your data</h2>
      <p>
        You own your data and are responsible for keeping backups. Deleting the app or using "Delete
        All Data" removes it from the device.
      </p>
      <h2>No warranty</h2>
      <p>
        The app is provided "as is" without warranties of any kind, to the extent permitted by law.
      </p>
    </>
  );
}
