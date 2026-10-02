import { expect } from "chai";
import { ethers } from "hardhat";

describe("DAO mutant test - m110ec48e", function () {
  it("should revert when init is called twice, detecting the mutant that changed == to <=", async function () {
    const [owner] = await ethers.getSigners();
    
    const Factory = await ethers.getContractFactory("DAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    const mockAddress = "0x0000000000000000000000000000000000000001";
    
    // First call to init should succeed
    await instance.init(mockAddress, mockAddress, mockAddress);
    
    // Second call to init should revert because inited is already true
    await expect(
      instance.init(mockAddress, mockAddress, mockAddress)
    ).to.be.reverted;
  });
});