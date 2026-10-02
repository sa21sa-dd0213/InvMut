import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceTolerance v1=0, v2=0", function () {
  it("should pass on original but revert on mutant when v1=0 and v2=0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy with a DAO address (can be any address since we're testing enforceTolerance directly)
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(addr1.address);
    await instance.waitForDeployment();
    
    // We need to set up the contract so enforceTolerance doesn't return early
    // First, configure the contract to set configured=true via DAO
    const DAO = addr1;
    
    // Set DAO to allow configuration
    await instance.connect(owner).setDAO(DAO.address);
    
    // We need to make configured return true - call endConfiguration()
    // But first we need to be DAO or owner to call it... Actually endConfiguration has no modifier
    await instance.connect(owner).endConfiguration();
    
    // Now we need to set enforceLimitsActive for the caller
    // Call setEnforcement to enable enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Now call enforceTolerance with v1=0, v2=0
    // This should pass on original (0 <= 1) but revert on mutant (0 >= 1 is false)
    await expect(
      instance.connect(addr1).enforceTolerance(0, 0)
    ).to.be.revertedWith("FE1");
  });
});