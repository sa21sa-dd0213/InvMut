import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m76caea4c - voteProposal majority bypass", function () {
  it("should NOT finalize DAO/UTILS/REWARD proposals during voting when votes reach quorum but not majority", async function () {
    const [owner, voter1, voter2, voter3, voter4] = await ethers.getSigners();

    // Deploy mock contracts for VADER, USDV, VAULT
    const MockERC20Factory = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20Factory.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const MockVADERFactory = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADERFactory.deploy();
    await mockVADER.waitForDeployment();

    const MockVAULTFactory = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULTFactory.deploy();
    await mockVAULT.waitForDeployment();

    // Setup vault weights: totalWeight = 100, voter1 weight = 40, voter2 weight = 30, voter3 weight = 20, voter4 weight = 10
    await mockVAULT.setMemberWeight(voter1.address, 40);
    await mockVAULT.setMemberWeight(voter2.address, 30);
    await mockVAULT.setMemberWeight(voter3.address, 20);
    await mockVAULT.setMemberWeight(voter4.address, 10);
    await mockVAULT.setTotalWeight(100);

    // Deploy DAO
    const DAOFactory = await ethers.getContractFactory("DAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a DAO type proposal (can also be UTILS or REWARD)
    await dao.connect(owner).newAddressProposal(voter1.address, "DAO");

    // Vote with voter1 (weight 40) - this reaches quorum (> 33.33) but not majority (<= 50)
    // Quorum: totalWeight/3 = 33.33, votes = 40 > 33.33 ✓
    // Majority: totalWeight/2 = 50, votes = 40 <= 50 ✗
    await dao.connect(voter1).voteProposal(1);

    // Verify that the proposal was NOT finalised during the vote (should remain false)
    const isFinalising = await dao.mapPID_finalising(1);
    expect(isFinalising).to.equal(false);

    // Verify that finaliseProposal can still be called after cool off period
    // This proves the proposal was not prematurely finalised
    const coolOffPeriod = await dao.coolOffPeriod();
    await ethers.provider.send("evm_increaseTime", [Number(coolOffPeriod) + 1]);
    await ethers.provider.send("evm_mine", []);

    // Should revert because it's not yet finalising
    await expect(dao.connect(voter2).finaliseProposal(1)).to.be.revertedWith("Must be finalising");
  });
});