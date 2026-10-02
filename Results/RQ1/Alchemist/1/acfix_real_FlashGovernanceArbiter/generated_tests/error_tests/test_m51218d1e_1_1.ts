import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant detection - withdrawGovernanceAsset asset equality", function () {
  it("should revert when calling withdrawGovernanceAsset with the correct matching asset due to mutant's != check", async function () {
    // Deploy contracts
    const [owner, user] = await ethers.getSigners();
    
    // Deploy a mock ERC20 token for testing
    const ERC20Factory = await ethers.getContractFactory("MockERC20");
    const token = await ERC20Factory.deploy("Test Token", "TST", ethers.parseEther("1000"));
    await token.waitForDeployment();
    
    // Deploy a mock DAO that returns valid data
    const DAOFactory = await ethers.getContractFactory("MockLimboDAO");
    const dao = await DAOFactory.deploy();
    await dao.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter
    const FlashGovernanceArbiterFactory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await FlashGovernanceArbiterFactory.deploy(await dao.getAddress());
    await arbiter.waitForDeployment();
    
    // Configure the DAO address in the mock
    await dao.setFlashGoverner(await arbiter.getAddress());
    
    // Set up flash governance config by making a successful proposal
    // First, make the owner a successful proposal sender
    await dao.setSuccessfulProposal(owner.address, true);
    
    // Configure flash governance
    await arbiter.configureFlashGovernance(
      await token.getAddress(),
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false // assetBurnable
    );
    
    // Configure security parameters
    await arbiter.configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      86400, // epochSize (1 day)
      50 // changeTolerance (50%)
    );
    
    // Fund user with tokens and approve arbiter
    await token.transfer(user.address, ethers.parseEther("500"));
    await token.connect(user).approve(await arbiter.getAddress(), ethers.parseEther("100"));
    
    // Set governed address to allow user to call assertGovernanceApproved
    await arbiter.setGoverned([user.address], [true]);
    
    // Call assertGovernanceApproved to create a pending flash decision
    await arbiter.connect(user).assertGovernanceApproved(
      user.address,
      await arbiter.getAddress(),
      true // emergency
    );
    
    // Now try to withdraw with the correct matching asset
    // In the original contract, this should succeed
    // In the mutant (with != instead of ==), this should revert
    await expect(
      arbiter.connect(user).withdrawGovernanceAsset(
        await arbiter.getAddress(),
        await token.getAddress()
      )
    ).to.be.reverted;
  });
});