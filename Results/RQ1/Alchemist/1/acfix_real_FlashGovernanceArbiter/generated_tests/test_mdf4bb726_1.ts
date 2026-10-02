import { expect } from "chai";
import { ethers } from "hardhat";

describe("FlashGovernanceArbiter mutant kill test - enforceTolerance exponentiation", function () {
  it("should revert when change exceeds tolerance (original) but mutant allows it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    
    // Deploy a minimal DAO mock that returns necessary values
    const DAOMock = await ethers.getContractFactory("LimboDAOMock");
    const daoMock = await DAOMock.deploy();
    await daoMock.waitForDeployment();
    
    // Deploy FlashGovernanceArbiter with the DAO address
    const Factory = await ethers.getContractFactory("FlashGovernanceArbiter");
    const instance = await Factory.deploy(await daoMock.getAddress());
    await instance.waitForDeployment();
    
    // Configure the contract to be "configured" by calling setDAO (already done in constructor)
    // and set security parameters with changeTolerance = 20
    // First, we need to make a successful proposal to call configureSecurityParameters
    // We'll set up the DAO mock to return true for successfulProposal
    await daoMock.setSuccessfulProposal(owner.address, true);
    
    // Configure security parameters
    await instance.connect(owner).configureSecurityParameters(
      10, // maxGovernanceChangePerEpoch
      3600, // epochSize
      20 // changeTolerance = 20%
    );
    
    // Enable enforcement for addr1
    await instance.connect(addr1).setEnforcement(true);
    
    // Now call enforceTolerance with v1=10, v2=5
    // In original: ((10-5)*100) < 20*10 => 500 < 200 => false => revert
    // In mutant: ((10-5)*100) < 20**10 => 500 < 10240000000000 => true => no revert
    await expect(
      instance.connect(addr1).enforceTolerance(10, 5)
    ).to.be.revertedWith("FE1");
  });
});