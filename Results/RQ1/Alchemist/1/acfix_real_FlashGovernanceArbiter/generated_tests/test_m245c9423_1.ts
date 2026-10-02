import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant m245c9423", function () {
  it("should revert when changeTolerance is set to 100 or greater", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a mock DAO contract that returns the owner as the flash governor
    const MockDAO = await ethers.getContractFactory("LimboDAOLike");
    const mockDAO = await MockDAO.deploy();
    await mockDAO.waitForDeployment();
    
    // Deploy the FlashGovernanceArbiter with the mock DAO
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await mockDAO.getAddress());
    await instance.waitForDeployment();
    
    // First, configure the DAO to make the owner a successful proposal sender
    // This is needed because configureSecurityParameters has onlySuccessfulProposal modifier
    // We need to set up the DAO to return true for successfulProposal(owner.address)
    
    // Configure the DAO to recognize owner as a successful proposal
    // Since we're using a mock, we need to simulate the successful proposal check
    // The onlySuccessfulProposal modifier calls assertSuccessfulProposal which checks
    // require(!configured || LimboDAOLike(DAO).successfulProposal(sender), "EJ");
    
    // Set configured to false by not calling endConfiguration, so the modifier passes
    // Now we can call configureSecurityParameters directly
    
    // Test: Try to set changeTolerance to 100 (should revert in original)
    await expect(
      instance.connect(owner).configureSecurityParameters(
        50, // maxGovernanceChangePerEpoch
        3600, // epochSize (1 hour)
        100 // changeTolerance - should be rejected as it's not < 100
      )
    ).to.be.revertedWith("Limbo: % between 0 and 100");
    
    // Test: Try to set changeTolerance to 150 (should also revert)
    await expect(
      instance.connect(owner).configureSecurityParameters(
        50,
        3600,
        150 // changeTolerance > 100 - should be rejected
      )
    ).to.be.revertedWith("Limbo: % between 0 and 100");
    
    // Verify that valid values still work
    await instance.connect(owner).configureSecurityParameters(
      50,
      3600,
      99 // changeTolerance = 99 (valid, < 100)
    );
    
    const security = await instance.security();
    expect(security.changeTolerance).to.equal(99);
  });
});