package com.group5.premiumnews.service;
import org.junit.jupiter.api.Test;
import com.group5.premiumnews.exception.InvalidStateTransitionException;
import static org.junit.jupiter.api.Assertions.*;

class BusinessPartnershipApprovalTests {
    @Test void onlyApprovedPartnershipCanUseBookingAndCampaigns(){
        assertDoesNotThrow(()->BusinessWorkspaceService.requireApprovedStatus("APPROVED"));
        for(String status:new String[]{"DRAFT","PENDING_REVIEW","RESUBMITTED","NEEDS_REVISION","REJECTED",""})
            assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.requireApprovedStatus(status));
        assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.requireApprovedStatus(null));
    }
    @Test void pendingAndRejectedHaveAppropriateInstructions(){
        var pending=assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.requireApprovedStatus("PENDING_REVIEW"));
        assertTrue(pending.getMessage().contains("chờ"));
        var rejected=assertThrows(InvalidStateTransitionException.class,()->BusinessWorkspaceService.requireApprovedStatus("REJECTED"));
        assertTrue(rejected.getMessage().contains("Application mới"));
    }
}
