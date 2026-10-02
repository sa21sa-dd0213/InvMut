import { expect } from "chai";
import { ethers } from "hardhat";

describe("EmergencyOracleFactory - Kill mutant mdc02fe09 (removed access control)", function () {
  it("should revert when non-jojoTeam address tries to call newEmergencyOracle", async function () {
    const [owner, addr1] = await ethers.getSigners();

    // Deploy EmergencyOracleFactory - the jojoTeam variable is public but never initialized
    // We need to set it by directly calling the contract or by deploying with a setter
    // Since there's no setter, we'll use owner as the authorized caller by calling the factory directly
    // to set jojoTeam (using storage manipulation is not possible in Hardhat tests, so we'll
    // deploy a modified version or use the fact that jojoTeam defaults to address(0))
    
    const Factory = await ethers.getContractFactory("EmergencyOracleFactory");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Since jojoTeam is not set in constructor and there's no setter, it defaults to address(0)
    // The test should verify that addr1 (non-owner, non-zero address) cannot call newEmergencyOracle
    // because msg.sender (addr1) != jojoTeam (address(0))
    
    // This should revert because addr1 is not jojoTeam (which is address(0))
    await expect(
      instance.connect(addr1).newEmergencyOracle("Test Oracle")
    ).to.be.revertedWith("Caller is not the JOJO team");
  });
});