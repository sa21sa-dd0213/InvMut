import { expect } from "chai";
import { ethers } from "hardhat";

describe("ACCURAL_DEPOSIT mutant m5ffe518e test", function () {
  it("should revert when depositing non-zero amount due to mutant == check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ACCURAL_DEPOSIT");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // The mutant changes the require condition from >= to ==
    // Original: require(((balances[msg.sender] + msg.value) >= balances[msg.sender]));
    // Mutant:   require(((balances[msg.sender] + msg.value) == balances[msg.sender]));
    // Only msg.value == 0 would satisfy the mutant condition
    // Sending 1 wei should revert on the mutant
    await expect(
      instance.connect(owner).Deposit({ value: ethers.parseEther("1") })
    ).to.be.reverted;
  });
});