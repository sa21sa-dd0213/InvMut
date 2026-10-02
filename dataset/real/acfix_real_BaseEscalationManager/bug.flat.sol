// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

interface OptimisticAsserterCallbackRecipientInterface {
    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) external;

    function assertionDisputedCallback(bytes32 assertionId) external;
}

interface EscalationManagerInterface is OptimisticAsserterCallbackRecipientInterface {
    struct AssertionPolicy {
        bool blockAssertion;
        bool arbitrateViaEscalationManager;
        bool discardOracle;
        bool validateDisputers;
    }

    function getAssertionPolicy(bytes32 assertionId) external view returns (AssertionPolicy memory);

    function isDisputeAllowed(bytes32 assertionId, address disputeCaller) external view returns (bool);

    function getPrice(
        bytes32 identifier,
        uint256 time,
        bytes memory ancillaryData
    ) external returns (int256);

    function requestPrice(
        bytes32 identifier,
        uint256 time,
        bytes memory ancillaryData
    ) external;
}

contract BaseEscalationManager is EscalationManagerInterface {
    event PriceRequestAdded(bytes32 indexed identifier, uint256 time, bytes ancillaryData);

    function getAssertionPolicy(bytes32 assertionId) public view virtual override returns (AssertionPolicy memory) {
        return
            AssertionPolicy({
                blockAssertion: false,
                arbitrateViaEscalationManager: false,
                discardOracle: false,
                validateDisputers: false
            });
    }

    function isDisputeAllowed(bytes32 assertionId, address disputeCaller) public view virtual override returns (bool) {
        return true;
    }

    function getPrice(
        bytes32 identifier,
        uint256 time,
        bytes memory ancillaryData
    ) public view virtual override returns (int256) {}

    function requestPrice(
        bytes32 identifier,
        uint256 time,
        bytes memory ancillaryData
    ) public virtual override {
        emit PriceRequestAdded(identifier, time, ancillaryData);
    }

    function assertionResolvedCallback(bytes32 assertionId, bool assertedTruthfully) public virtual override {}

    function assertionDisputedCallback(bytes32 assertionId) public virtual override {}
}
