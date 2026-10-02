import { expect } from "chai";
import { ethers } from "hardhat";

describe("Wallet mutant m7961a6e9 - deposit assertion mutation", function () {
  it("should succeed when depositing ether, but mutant fails due to reversed assertion", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Wallet");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to deposit a positive amount of ether - should succeed on original, fail on mutant
    const depositAmount = ethers.parseEther("1.0");
    const tx = instance.connect(owner).deposit({ value: depositAmount });

    // The original assertion balances[msg.sender] + msg.value > balances[msg.sender] passes
    // The mutant uses < instead of >, so it will always revert
    await expect(tx).to.be.reverted;
  });
});