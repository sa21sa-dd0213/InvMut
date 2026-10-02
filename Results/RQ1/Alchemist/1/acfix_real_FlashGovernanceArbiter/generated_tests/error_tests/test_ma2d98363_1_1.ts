import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test", function () {
  it("should revert withdrawGovernanceAsset when asset address is less than stored asset (kills <= mutant)", async function () {
    // Deploy with a mock DAO that allows us to call onlySuccessfulProposal functions
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal mock DAO that returns true for successfulProposal
    const MockDAODef = await ethers.getContractFactory("contracts/mocks/MockLimboDAO.sol:LimboDAOLike");
    const mockDAO = await MockDAODef.deploy();
    await mockDAO.waitForDeployment();
    
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const arbiter = await Factory.deploy(await mockDAO.getAddress());
    await arbiter.waitForDeployment();
    
    // Configure flash governance via onlySuccessfulProposal (mockDAO returns true)
    const tokenAddress = addr1.address; // Use a simple address as asset
    await arbiter.configureFlashGovernance(
      tokenAddress,
      ethers.parseEther("100"),
      3600, // 1 hour unlock time
      false
    );
    
    // Simulate a pending flash decision for addr1 with tokenAddress as asset
    // First call assertGovernanceApproved to create a pending decision
    await arbiter.connect(addr1).assertGovernanceApproved(
      addr1.address,
      arbiter.getAddress(),
      false
    );
    
    // Now try to withdraw with a different asset address that is LESS than the stored asset
    const lesserAsset = "0x0000000000000000000000000000000000000001";
    
    // This should revert because the asset doesn't match exactly (original uses ==)
    // The mutant would allow it because lesserAsset <= tokenAddress
    await expect(
      arbiter.connect(addr1).withdrawGovernanceAsset(
        arbiter.getAddress(),
        lesserAsset
      )
    ).to.be.reverted;
  });
});