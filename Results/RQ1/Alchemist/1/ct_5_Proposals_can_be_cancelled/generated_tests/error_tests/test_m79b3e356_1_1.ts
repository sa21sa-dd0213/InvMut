import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant m79b3e356 - block.timestamp replaced with block.prevrandao", function () {
  it("should revert when calling finaliseProposal after coolOffPeriod because mutant uses block.prevrandao instead of block.timestamp", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();

    // Deploy mock VADER, USDV, and VAULT contracts that DAO depends on
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockUSDV = await MockERC20.deploy("USDV", "USDV", 18);
    await mockUSDV.waitForDeployment();

    const MockVAULT = await ethers.getContractFactory("MockVAULT");
    const mockVAULT = await MockVAULT.deploy();
    await mockVAULT.waitForDeployment();

    const MockVADER = await ethers.getContractFactory("MockVADER");
    const mockVADER = await MockVADER.deploy();
    await mockVADER.waitForDeployment();

    // Deploy DAO
    const Factory = await ethers.getContractFactory("DAO");
    const dao = await Factory.deploy();
    await dao.waitForDeployment();

    // Initialize DAO
    await dao.init(await mockVADER.getAddress(), await mockUSDV.getAddress(), await mockVAULT.getAddress());

    // Create a grant proposal
    await dao.newGrantProposal(addr1.address, ethers.parseEther("100"));
    
    // Get member weight from vault (should be > 0 for quorum)
    // First deposit some tokens to give addr1 weight
    await mockVAULT.setMemberWeight(owner.address, ethers.parseEther("1000"));
    
    // Vote on proposal to trigger finalising state (quorum needed)
    await dao.voteProposal(1);
    
    // Wait for coolOffPeriod (1 second) to pass
    await ethers.provider.send("evm_increaseTime", [2]);
    await ethers.provider.send("evm_mine", []);

    // This should revert on the mutant because block.prevrandao - timestamp won't exceed coolOffPeriod
    // On the original it would succeed because block.timestamp has advanced
    await expect(dao.finaliseProposal(1)).to.be.revertedWith("Must be after cool off");
  });
});