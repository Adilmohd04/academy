import { Request, Response } from 'express';
import * as certificateService from '../services/certificateService';

export const generateCertificate = async (req: Request, res: Response) => {
  try {
    const { enrollmentId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const certificate = await certificateService.generateCertificate(enrollmentId, studentId);

    res.json(certificate);
  } catch (error: any) {
    // Keep this response generic: callers must not be able to learn whether
    // another student's enrollment exists.
    if (error instanceof certificateService.EnrollmentCertificateAccessError) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }

    if (error instanceof certificateService.CertificateNotAvailableError) {
      return res.status(409).json({
        error: 'Certificate is not available yet. It will be issued automatically once all course requirements are met.',
      });
    }

    console.error('Error generating certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to generate certificate' });
  }
};

export const getStudentCertificates = async (req: Request, res: Response) => {
  try {
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const certificates = await certificateService.getStudentCertificates(studentId);

    res.json(certificates);
  } catch (error: any) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch certificates' });
  }
};

export const getCertificate = async (req: Request, res: Response) => {
  try {
    const { certificateId } = req.params;
    const studentId = req.auth?.userId;

    if (!studentId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const certificate = await certificateService.getCertificate(certificateId, studentId);

    if (!certificate) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    res.json(certificate);
  } catch (error: any) {
    console.error('Error fetching certificate:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch certificate' });
  }
};
