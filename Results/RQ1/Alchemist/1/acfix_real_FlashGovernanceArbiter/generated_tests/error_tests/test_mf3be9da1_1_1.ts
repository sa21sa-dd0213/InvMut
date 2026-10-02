import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant mf3be9da1", function () {
  it("should revert when unauthorized address calls configureFlashGovernance (mutant removed onlySuccessfulProposal modifier)", async function () {
    const [owner, addr1, addr2] = await ethers.getSigners();
    
    // Deploy a mock DAO that returns a zero address for getFlashGoverner and has proposalConfig
    const MockDAO = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the mock DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // Ensure the contract is not configured yet (configured = false)
    // This allows the onlySuccessfulProposal modifier to pass even for unauthorized callers
    // when configured is false. So we need to configure the contract first.
    
    // Set DAO to a non-zero address to allow configuration
    // Note: setDAO is public and can be called by anyone if DAO == address(0)
    
    // Now call endConfiguration to set configured = true
    await instance.endConfiguration();
    
    // Now configured is true, so onlySuccessfulProposal modifier will check
    // that msg.sender has a successful proposal in the DAO
    // Since addr1 is not a successful proposer, the call should revert
    
    // Try to call configureFlashGovernance from an unauthorized address
    await expect(
      instance.connect(addr1).configureFlashGovernance(
        addr2.address, // asset
        ethers.parseEther("100"), // amount
        3600, // unlockTime
        true // assetBurnable
      )
    ).to.be.revertedWith("EJ");
    
    // Verify that the configuration was not changed
    const config = await instance.flashGovernanceConfig();
    expect(config.asset).to.equal(ethers.ZeroAddress);
    expect(config.amount).to.equal(0);
    expect(config.unlockTime).to.equal(0);
    expect(config.assetBurnable).to.equal(false);
  });
});