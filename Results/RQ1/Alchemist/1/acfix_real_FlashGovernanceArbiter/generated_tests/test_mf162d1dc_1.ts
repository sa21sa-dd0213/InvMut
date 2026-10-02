import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("FlashGovernanceArbiter mutant detection - mf162d1dc", function () {
  it("should kill mutant that inverts unlockTime check from < to >", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a flash governor address and supports successful proposals
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure the DAO to allow this contract to be governed
    await mockDAO.setSuccessfulProposal(await owner.getAddress(), true);
    
    // Configure flash governance parameters
    // First deploy a mock ERC20 token for the asset
    const MockToken = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockToken.deploy("Test", "TST", ethers.parseEther("1000"));
    await mockToken.waitForDeployment();
    
    // Transfer tokens to addr1 for the flash governance deposit
    await mockToken.transfer(await addr1.getAddress(), ethers.parseEther("100"));
    
    // Configure flash governance settings
    await instance.configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("10"),
      3600, // 1 hour unlock time
      false
    );
    
    // Set up the DAO to recognize this contract as governed
    await instance.setDAO(await mockDAO.getAddress());
    
    // Add addr1 as a governed address
    await instance.setGoverned([await addr1.getAddress()], [true]);
    
    // Approve the arbiter to spend tokens
    await mockToken.connect(addr1).approve(await instance.getAddress(), ethers.parseEther("100"));
    
    // First call - should succeed (unlock time < block.timestamp initially)
    const tx1 = await instance.connect(addr1).assertGovernanceApproved(
      await addr1.getAddress(),
      await instance.getAddress(),
      false
    );
    await tx1.wait();
    
    // Check that pending flash decision was set
    const pending1 = await instance.pendingFlashDecision(
      await instance.getAddress(),
      await addr1.getAddress()
    );
    expect(pending1.amount).to.equal(ethers.parseEther("10"));
    
    // Try to call withdrawGovernanceAsset - should fail because unlock time is in the future
    await expect(
      instance.connect(addr1).withdrawGovernanceAsset(
        await instance.getAddress(),
        await mockToken.getAddress()
      )
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
    
    // Wait until unlock time has passed
    await time.increase(3601);
    
    // Now attempt to call assertGovernanceApproved again
    // In the original: should succeed because unlockTime < block.timestamp (past)
    // In the mutant: should fail because it checks unlockTime > block.timestamp (future, which is false)
    const tx2 = await instance.connect(addr1).assertGovernanceApproved(
      await addr1.getAddress(),
      await instance.getAddress(),
      false
    );
    await tx2.wait();
    
    // Verify the pending flash decision was updated
    const pending2 = await instance.pendingFlashDecision(
      await instance.getAddress(),
      await addr1.getAddress()
    );
    expect(pending2.unlockTime).to.be.gt(0);
    
    // Now withdraw should work
    const tx3 = await instance.connect(addr1).withdrawGovernanceAsset(
      await instance.getAddress(),
      await mockToken.getAddress()
    );
    await tx3.wait();
    
    // Verify withdrawal
    const pending3 = await instance.pendingFlashDecision(
      await instance.getAddress(),
      await addr1.getAddress()
    );
    expect(pending3.amount).to.equal(0);
  });
});