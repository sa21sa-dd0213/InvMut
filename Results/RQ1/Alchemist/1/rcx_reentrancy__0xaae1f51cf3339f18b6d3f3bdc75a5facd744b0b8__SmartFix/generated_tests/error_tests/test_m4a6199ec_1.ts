import { expect } from "chai";
import { ethers } } from "hardhat";

describe("DEP_BANK - Kill mutant m4a6199ec (require with * instead of +)", function () {
  it("should kill the mutant by depositing when balance > 0 and msg.value > 0", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First deposit to set a non-zero balance
    await instance.connect(addr1).deposit({ value: ethers.parseEther("1") });
    
    // Now deposit a small amount (1 wei) - original would pass, mutant should revert
    // because 1 * 1e18 >= 1e18 is false (1e18 >= 1e18 is true for addition)
    await expect(
      instance.connect(addr1).deposit({ value: 1 })
    ).to.not.be.reverted; // This will pass on original but fail on mutant
  });
});