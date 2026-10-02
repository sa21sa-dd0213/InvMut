import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette reference (ethers v6; deploy may require constructor arguments)", function () {
  it("should revert when sending 1 ether (not 10 ether) to fallback, killing mutant that removed amount check", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 1 ether (not the required 10) to the fallback function
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Original reverts due to require(msg.value == 10 ether); mutant would not revert
    await expect(tx).to.be.reverted;
  });
});