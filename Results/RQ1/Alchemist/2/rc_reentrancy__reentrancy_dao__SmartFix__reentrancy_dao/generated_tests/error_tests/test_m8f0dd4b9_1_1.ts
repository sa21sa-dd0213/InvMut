import { expect } from "chai";
import { ethers } from "hardhat";

describe("ReentrancyDAO mutant m8f0dd4b9", function () {
  it("should kill mutant by calling withdrawAll with zero credit", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReentrancyDAO");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Create a contract that reverts on receiving 0 value
    const revertFactory = await ethers.getContractFactory("RevertOnZeroValue");
    const revertContract = await revertFactory.deploy();
    await revertContract.waitForDeployment();
    const revertAddress = await revertContract.getAddress();

    // Fund the revert contract with some ether to call withdrawAll
    await owner.sendTransaction({
      to: revertAddress,
      value: ethers.parseEther("1")
    });

    // Now call withdrawAll from the revert contract (which has 0 credit)
    const revertInstance = instance.connect(revertContract.runner);
    
    // Original contract would skip the if block and succeed, mutant would try call with 0 and revert
    // So we expect the transaction to revert for the mutant
    await expect(revertInstance.withdrawAll()).to.be.reverted;
  });
});