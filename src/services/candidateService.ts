// Adicione este método ao candidateService existente
async getCandidatesByAnalyst(analystEmail: string): Promise<Candidate[]> {
  try {
    const allCandidates = await this.loadFromSpreadsheet();
    return allCandidates.filter(candidate => 
      candidate.analista_triagem === analystEmail
    );
  } catch (error) {
    console.error('Erro ao buscar candidatos por analista:', error);
    throw error;
  }
}

// Ou modifique o getStatistics para aceitar filtro por analista
async getStatistics(analystEmail?: string) {
  try {
    const allCandidates = await this.loadFromSpreadsheet();
    
    let filteredCandidates = allCandidates;
    if (analystEmail) {
      filteredCandidates = allCandidates.filter(c => c.analista_triagem === analystEmail);
    }

    return {
      total: filteredCandidates.length,
      approved: filteredCandidates.filter(c => c.status_triagem === 'Aprovado').length,
      rejected: filteredCandidates.filter(c => c.status_triagem === 'Reprovado').length,
      revisar: filteredCandidates.filter(c => c.status_triagem === 'Revisar').length,
      pending: filteredCandidates.filter(c => 
        !c.status_triagem || c.status_triagem === '' || c.status_triagem === 'pending'
      ).length
    };
  } catch (error) {
    console.error('Erro ao carregar estatísticas:', error);
    throw error;
  }
}
