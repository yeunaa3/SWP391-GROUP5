package com.group5.premiumnews.service.workflow;

import com.group5.premiumnews.entity.enums.CampaignStatus;
import com.group5.premiumnews.entity.enums.ContractStatus;
import com.group5.premiumnews.entity.enums.PartnershipStatus;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class WorkflowPolicyTests {

    @Test
    void partnershipCanReturnForRevisionAndBeResubmitted() {
        assertDoesNotThrow(() -> WorkflowPolicy.require(
                PartnershipStatus.PENDING_REVIEW, PartnershipStatus.NEEDS_REVISION));
        assertDoesNotThrow(() -> WorkflowPolicy.require(
                PartnershipStatus.NEEDS_REVISION, PartnershipStatus.RESUBMITTED));
    }

    @Test
    void paidContractCannotReturnToDraft() {
        assertThrows(InvalidStateTransitionException.class,
                () -> WorkflowPolicy.require(ContractStatus.ACTIVE, ContractStatus.DRAFT));
    }

    @Test
    void pausedCampaignCanResumeButRejectedCampaignCannotActivate() {
        assertDoesNotThrow(() -> WorkflowPolicy.require(CampaignStatus.PAUSED, CampaignStatus.ACTIVE));
        assertThrows(InvalidStateTransitionException.class,
                () -> WorkflowPolicy.require(CampaignStatus.REJECTED, CampaignStatus.ACTIVE));
    }
}
