import { expect } from "chai";
import { ethers } from "hardhat";

describe("DEP_BANK mutant test - mcc46905a", function () {
  it("should detect mutant by expecting successful deposit to revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("DEP_BANK");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit 1 ether - should succeed on original but fail on mutant
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1.0")
    });
    
    await expect(tx).to.be.reverted;
  });
});