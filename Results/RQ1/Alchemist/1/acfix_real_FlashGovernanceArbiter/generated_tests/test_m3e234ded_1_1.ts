import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection", function () {
  it("should revert when flash governance is attempted within the same epoch (non-emergency) but mutant allows it", async function () {
    // Deploy with a mock DAO that can simulate successful proposals
    const [owner, user, target] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for flash governance asset
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy("Test", "TST", ethers.parseEther("1000000"));
    await mockToken.waitForDeployment();
    
    // Mint tokens to user for flash governance
    await mockToken.mint(user.address, ethers.parseEther("1000"));
    await mockToken.connect(user).approve(owner.address, ethers.parseEther("1000"));
    
    // Deploy a mock DAO contract that returns the owner as flash governor and accepts proposals
    const MockLimboDAO = await ethers.getContractFactory("MockLimboDAOLike");
    const mockDAO = await MockLimboDAO.deploy(owner.address);
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Configure flash governance parameters via a successful proposal (owner is proposer)
    await mockDAO.setSuccessfulProposal(owner.address, true);
    await instance.connect(owner).configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false
    );
    
    // Configure security parameters with epoch size of 1 hour
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize = 1 hour
      50 // changeTolerance
    );
    
    // Set the DAO address as governed to allow flash governance
    await instance.connect(owner).setGoverned([await mockDAO.getAddress()], [true]);
    
    // Simulate first flash governance action - this should succeed
    await mockToken.connect(user).approve(await instance.getAddress(), ethers.parseEther("1000"));
    
    // First call should succeed
    await instance.connect(user).assertGovernanceApproved(
      user.address,
      target.address,
      false // emergency = false
    );
    
    // Immediately attempt a second flash governance within the same epoch (should revert in original)
    await expect(
      instance.connect(user).assertGovernanceApproved(
        user.address,
        target.address,
        false // emergency = false
      )
    ).to.be.revertedWith("LIMBO: flash governance disabled for rest of epoch");
  });
});