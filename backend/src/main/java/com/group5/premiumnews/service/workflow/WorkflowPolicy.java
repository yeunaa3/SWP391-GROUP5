package com.group5.premiumnews.service.workflow;

import com.group5.premiumnews.entity.enums.CampaignStatus;
import com.group5.premiumnews.entity.enums.ContractStatus;
import com.group5.premiumnews.entity.enums.PartnershipStatus;
import com.group5.premiumnews.entity.enums.PaymentStatus;
import com.group5.premiumnews.entity.enums.SubscriptionStatus;
import com.group5.premiumnews.exception.InvalidStateTransitionException;

import java.util.EnumMap;
import java.util.Map;
import java.util.Set;

public final class WorkflowPolicy {

    private static final Map<PartnershipStatus, Set<PartnershipStatus>> PARTNERSHIP = transitions(
            PartnershipStatus.class,
            entry(PartnershipStatus.DRAFT, PartnershipStatus.PENDING_REVIEW),
            entry(PartnershipStatus.PENDING_REVIEW, PartnershipStatus.APPROVED, PartnershipStatus.NEEDS_REVISION, PartnershipStatus.REJECTED),
            entry(PartnershipStatus.NEEDS_REVISION, PartnershipStatus.RESUBMITTED),
            entry(PartnershipStatus.RESUBMITTED, PartnershipStatus.APPROVED, PartnershipStatus.NEEDS_REVISION, PartnershipStatus.REJECTED));

    private static final Map<ContractStatus, Set<ContractStatus>> CONTRACT = transitions(
            ContractStatus.class,
            entry(ContractStatus.DRAFT, ContractStatus.PROPOSED, ContractStatus.CANCELLED),
            entry(ContractStatus.PROPOSED, ContractStatus.REVISION_REQUESTED, ContractStatus.ACCEPTED, ContractStatus.EXPIRED, ContractStatus.CANCELLED),
            entry(ContractStatus.REVISION_REQUESTED, ContractStatus.PROPOSED, ContractStatus.CANCELLED),
            entry(ContractStatus.ACCEPTED, ContractStatus.PENDING_PAYMENT, ContractStatus.CANCELLED),
            entry(ContractStatus.PENDING_PAYMENT, ContractStatus.ACTIVE, ContractStatus.PAYMENT_FAILED, ContractStatus.EXPIRED, ContractStatus.CANCELLED),
            entry(ContractStatus.PAYMENT_FAILED, ContractStatus.PENDING_PAYMENT, ContractStatus.CANCELLED),
            entry(ContractStatus.ACTIVE, ContractStatus.COMPLETED, ContractStatus.CANCELLED));

    private static final Map<CampaignStatus, Set<CampaignStatus>> CAMPAIGN = transitions(
            CampaignStatus.class,
            entry(CampaignStatus.DRAFT, CampaignStatus.PENDING_REVIEW, CampaignStatus.CANCELLED),
            entry(CampaignStatus.PENDING_REVIEW, CampaignStatus.NEEDS_REVISION, CampaignStatus.APPROVED, CampaignStatus.REJECTED),
            entry(CampaignStatus.NEEDS_REVISION, CampaignStatus.PENDING_REVIEW, CampaignStatus.CANCELLED),
            entry(CampaignStatus.APPROVED, CampaignStatus.SCHEDULED, CampaignStatus.CANCELLED),
            entry(CampaignStatus.SCHEDULED, CampaignStatus.ACTIVE, CampaignStatus.CANCELLED),
            entry(CampaignStatus.ACTIVE, CampaignStatus.PAUSED, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED),
            entry(CampaignStatus.PAUSED, CampaignStatus.ACTIVE, CampaignStatus.COMPLETED, CampaignStatus.CANCELLED));

    private static final Map<SubscriptionStatus, Set<SubscriptionStatus>> SUBSCRIPTION = transitions(
            SubscriptionStatus.class,
            entry(SubscriptionStatus.PENDING, SubscriptionStatus.ACTIVE, SubscriptionStatus.CANCELLED),
            entry(SubscriptionStatus.ACTIVE, SubscriptionStatus.EXPIRED, SubscriptionStatus.CANCELLED));

    private static final Map<PaymentStatus, Set<PaymentStatus>> PAYMENT = transitions(
            PaymentStatus.class,
            entry(PaymentStatus.PENDING, PaymentStatus.SUCCESS, PaymentStatus.FAILED, PaymentStatus.CANCELLED),
            entry(PaymentStatus.SUCCESS, PaymentStatus.REFUNDED));

    private WorkflowPolicy() {
    }

    public static void require(PartnershipStatus current, PartnershipStatus next) { requireAllowed(PARTNERSHIP, current, next); }
    public static void require(ContractStatus current, ContractStatus next) { requireAllowed(CONTRACT, current, next); }
    public static void require(CampaignStatus current, CampaignStatus next) { requireAllowed(CAMPAIGN, current, next); }
    public static void require(SubscriptionStatus current, SubscriptionStatus next) { requireAllowed(SUBSCRIPTION, current, next); }
    public static void require(PaymentStatus current, PaymentStatus next) { requireAllowed(PAYMENT, current, next); }

    private static <E extends Enum<E>> void requireAllowed(Map<E, Set<E>> rules, E current, E next) {
        if (!rules.getOrDefault(current, Set.of()).contains(next)) {
            throw new InvalidStateTransitionException("Invalid state transition: " + current + " -> " + next);
        }
    }

    @SafeVarargs
    private static <E extends Enum<E>> Map<E, Set<E>> transitions(Class<E> type, Transition<E>... entries) {
        Map<E, Set<E>> result = new EnumMap<>(type);
        for (Transition<E> transition : entries) {
            result.put(transition.from(), transition.to());
        }
        return Map.copyOf(result);
    }

    @SafeVarargs
    private static <E extends Enum<E>> Transition<E> entry(E from, E... to) {
        return new Transition<>(from, Set.of(to));
    }

    private record Transition<E>(E from, Set<E> to) {
    }
}
