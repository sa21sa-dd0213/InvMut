import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m1a62b90f - hasQuorum explicit else branch", function () {
  it("should return false when votes are less than or equal to quorum threshold", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy mock Vault that returns a fixed totalWeight
    const MockVault = await ethers.getContractFactory("MockVault");
    const mockVault = await MockVault.deploy();
    await mockVault.waitForDeployment();

    // Deploy DAO with mock addresses
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO with mock addresses
    const mockVader = ethers.ZeroAddress;
    const mockUsdv = ethers.ZeroAddress;
    await dao.init(mockVader, mockUsdv, await mockVault.getAddress());

    // Create a proposal to have a proposalID to test hasQuorum
    await dao.newAddressProposal(addr1.address, "GRANT");

    // Set totalWeight to a known value via mock
    const totalWeight = ethers.parseEther("100");
    await mockVault.setTotalWeight(totalWeight);

    // Calculate quorum threshold: totalWeight / 3
    const quorumThreshold = totalWeight / 3n;

    // Test case 1: votes equal to quorum threshold should return false
    // We need to manipulate the internal state to set votes exactly to quorumThreshold
    // Since we can't directly set votes, we'll simulate by having a voter with weight = quorumThreshold
    // and then call hasQuorum after voting

    // First, set the member weight for addr1 to exactly quorumThreshold
    await mockVault.setMemberWeight(addr1.address, quorumThreshold);

    // Vote on proposal 1
    await dao.connect(addr1).voteProposal(1);

    // Now votes should be quorumThreshold, which is NOT greater than consensus (quorumThreshold)
    // hasQuorum should return false
    const result = await dao.hasQuorum(1);
    expect(result).to.equal(false);

    // Test case 2: votes just above quorum threshold should return true
    const aboveQuorum = quorumThreshold + 1n;
    await mockVault.setMemberWeight(addr1.address, aboveQuorum);
    // Create new proposal
    await dao.newAddressProposal(addr1.address, "GRANT");
    await dao.connect(addr1).voteProposal(2);
    const result2 = await dao.hasQuorum(2);
    expect(result2).to.equal(true);

    // Test case 3: votes significantly below quorum threshold should return false
    const belowQuorum = 1n;
    await mockVault.setMemberWeight(addr1.address, belowQuorum);
    await dao.newAddressProposal(addr1.address, "GRANT");
    await dao.connect(addr1).voteProposal(3);
    const result3 = await dao.hasQuorum(3);
    expect(result3).to.equal(false);
  });
});