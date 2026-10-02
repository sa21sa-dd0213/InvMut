import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant kill test - m3aad18c1", function () {
  it("should revert when sending less than 10 ether to the fallback function", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 5 ether (less than the required 10 ether)
    // Original contract should revert, mutant should not
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });

    // Expect revert due to the require(msg.value == 10 ether) check
    await expect(tx).to.be.reverted;
  });
});