import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter - kill mutant m26466053 (|| instead of &&)", function () {
  let arbiter: any;
  let owner: any;
  let user: any;
  let mockToken: any;
  let mockDAO: any;

  before(async function () {
    [owner, user] = await ethers.getSigners();

    // Deploy a mock ERC20 token for testing
    const MockToken = await ethers.getContractFactory("MockERC20");
    mockToken = await MockToken.deploy("Test", "TST", 18);
    await mockToken.waitForDeployment();

    // Deploy a mock DAO contract that satisfies the interface requirements
    const MockDAO = await ethers.getContractFactory("MockLimboDAO");
    mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();

    // Deploy the FlashGovernanceArbiter with the DAO address
    const Arbiter = await ethers.getContractFactory("FlashGovernanceArbiter");
    arbiter = await Arbiter.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();

    // Configure flash governance to enable the test
    // First set up the DAO to make owner a successful proposal
    await mockDAO.setSuccessfulProposal(owner.address, true);
    
    // Configure flash governance settings
    await arbiter.connect(owner).configureFlashGovernance(
      await mockToken.getAddress(),
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false
    );

    // Transfer tokens to user for testing
    await mockToken.transfer(user.address, ethers.parseEther("1000"));
    await mockToken.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("100"));
  });

  it("should revert when trying to withdraw with mismatched asset (OR logic would pass but AND should fail)", async function () {
    // Deploy a second token to use as a different asset
    const MockToken2 = await ethers.getContractFactory("MockERC20");
    const mockToken2 = await MockToken2.deploy("Test2", "TST2", 18);
    await mockToken2.waitForDeployment();

    // First create a pending flash decision by calling assertGovernanceApproved
    // This requires the user to transfer tokens to the arbiter
    await mockToken.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("100"));
    
    // Call assertGovernanceApproved to create a pending decision with the original token
    await arbiter.connect(user).assertGovernanceApproved(
      user.address,
      await arbiter.getAddress(),
      false
    );

    // Now attempt to withdraw with a DIFFERENT asset (mockToken2 instead of mockToken)
    // The original contract should revert because asset != pendingFlashDecision.asset
    // The mutant with || would pass because amount > 0 and unlockTime < block.timestamp
    await expect(
      arbiter.connect(user).withdrawGovernanceAsset(
        await arbiter.getAddress(),
        await mockToken2.getAddress()
      )
    ).to.be.revertedWith("Limbo: Flashgovernance decision pending.");
  });
});