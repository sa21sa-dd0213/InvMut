import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant detection - hasQuorum", function () {
  it("should detect mutant mbe78c17d by testing quorum threshold calculation", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock vault that returns controlled totalWeight
    const MockVaultFactory = await ethers.getContractFactory("MockVAULT");
    const mockVault = await MockVaultFactory.deploy();
    await mockVault.waitForDeployment();

    // Deploy mock VADER and USDV (required for init)
    const MockTokenFactory = await ethers.getContractFactory("MockERC20");
    const mockVader = await MockTokenFactory.deploy();
    await mockVader.waitForDeployment();
    const mockUsdv = await MockTokenFactory.deploy();
    await mockUsdv.waitForDeployment();

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with mock addresses
    await dao.init(await mockVader.getAddress(), await mockUsdv.getAddress(), await mockVault.getAddress());

    // Set totalWeight to 9 (original: 9/3=3, mutant: 9-3=6)
    await mockVault.setTotalWeight(9);

    // Create a proposal to get a proposalID
    await dao.newAddressProposal(addr1.address, "DAO");

    // Get member weight from vault (set to 5)
    await mockVault.setMemberWeight(5);

    // Cast vote - this will call countMemberVotes which updates mapPID_votes[1]
    await dao.connect(addr1).voteProposal(1);

    // With totalWeight=9 and votes=5:
    // Original hasQuorum: 5 > 9/3 = 3 => true
    // Mutant hasQuorum: 5 > 9-3 = 6 => false
    // Test should pass on original, fail on mutant
    const hasQuorumResult = await dao.hasQuorum(1);
    expect(hasQuorumResult).to.equal(true);
  });
});

// Mock contracts needed for testing
contract MockVAULT {
    uint256 private _totalWeight;
    mapping(address => uint256) private _memberWeights;

    function setTotalWeight(uint256 weight) external {
        _totalWeight = weight;
    }

    function setMemberWeight(uint256 weight) external {
        _memberWeights[msg.sender] = weight;
    }

    function totalWeight() external view returns (uint256) {
        return _totalWeight;
    }

    function getMemberWeight(address member) external view returns (uint256) {
        return _memberWeights[member];
    }
}

contract MockERC20 {
    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }
}