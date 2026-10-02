import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant kill test - hasQuorum operator change", function () {
  it("should detect the mutant by asserting hasQuorum returns true when votes exceed 1/3 of total weight", async function () {
    const [owner, voter1, voter2] = await ethers.getSigners();

    // Deploy DAO (no constructor arguments needed)
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Deploy mock VADER (minimal implementation for testing)
    const VADERFactory = await ethers.getContractFactory("iVADER");
    const vader = await VADERFactory.deploy();
    await vader.waitForDeployment();

    // Deploy mock VAULT (minimal implementation for testing)
    const VAULTFactory = await ethers.getContractFactory("iVAULT");
    const vault = await VAULTFactory.deploy();
    await vault.waitForDeployment();

    // Initialize DAO
    await dao.init(await vader.getAddress(), ethers.ZeroAddress, await vault.getAddress());

    // Create a proposal to vote on
    await dao.newGrantProposal(owner.address, ethers.parseEther("100"));

    // Set up mock vault to return totalWeight and member weights
    // We need to simulate weights that make votes > totalWeight/3
    const totalWeight = ethers.parseEther("100");
    const memberWeight = ethers.parseEther("40"); // > 100/3 ≈ 33.33

    // Mock the vault's totalWeight and getMemberWeight
    await vault.setTotalWeight(totalWeight);
    await vault.setMemberWeight(voter1.address, memberWeight);

    // Vote on proposal 1
    await dao.connect(voter1).voteProposal(1);

    // Now check hasQuorum - should return true since votes (40) > totalWeight/3 (33.33)
    const hasQuorum = await dao.hasQuorum(1);
    expect(hasQuorum).to.be.true;

    // The mutant would return false here, killing the test
  });
});