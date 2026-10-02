import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant test - m86c33676", function () {
  it("should revert when withdrawing with different asset address (original) but pass on mutant", async function () {
    const [owner, user] = await ethers.getSigners();
    
    // Deploy mock ERC20 token for asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const asset1 = await MockERC20.deploy("Asset1", "AST1", 18);
    const asset2 = await MockERC20.deploy("Asset2", "AST2", 18);
    await asset1.waitForDeployment();
    await asset2.waitForDeployment();
    
    // Deploy a mock DAO that returns valid proposal state
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAO");
    const mockDAO = await MockLimboDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await Factory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Setup: configure the arbiter to be governed by the mock DAO
    await arbiter.setDAO(await mockDAO.getAddress());
    
    // Configure flash governance with asset1
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await arbiter.configureFlashGovernance(
      await asset1.getAddress(),
      ethers.parseEther("100"),
      3600,
      false
    );
    
    // Fund user with asset1 tokens and approve arbiter
    await asset1.transfer(user.address, ethers.parseEther("1000"));
    await asset1.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("1000"));
    
    // Also fund user with asset2 tokens
    await asset2.transfer(user.address, ethers.parseEther("1000"));
    await asset2.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("1000"));
    
    // First, make the user a governed address so they can call assertGovernanceApproved
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await arbiter.setGoverned([user.address], [true]);
    
    // Call assertGovernanceApproved to create a pending decision with asset1
    const targetContract = ethers.Wallet.createRandom().address;
    await arbiter.connect(user).assertGovernanceApproved(
      user.address,
      targetContract,
      false
    );
    
    // Advance time past the unlock period
    await ethers.provider.send("evm_increaseTime", [7200]);
    await ethers.provider.send("evm_mine", []);
    
    // Try to withdraw with asset2 (different from stored asset1)
    // Original contract should revert (== check), mutant should pass (>= check)
    await expect(
      arbiter.connect(user).withdrawGovernanceAsset(
        targetContract,
        await asset2.getAddress()
      )
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});