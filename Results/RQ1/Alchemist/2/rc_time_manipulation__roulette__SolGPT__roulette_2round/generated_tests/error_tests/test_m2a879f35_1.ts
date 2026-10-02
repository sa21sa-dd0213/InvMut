import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant test - fallback msg.value check", function () {
  it("should succeed when sending exactly 10 ether to fallback (detects mutant changing == to !=)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send exactly 10 ether to trigger fallback; original requires msg.value == 10 ether
    // Mutant requires msg.value != 10 ether, so this should revert in mutant but pass in original
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // In original: transaction succeeds (no revert)
    // In mutant: transaction reverts because 10 ether != 10 ether is false
    await expect(tx).to.not.be.reverted;
  });
});