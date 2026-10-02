import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - m3aad18c1", function () {
  it("should revert when sending less than 10 ether to fallback, killing mutant that removed require", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Attempt to send 1 ether (not 10) to the fallback function
    // Original contract reverts due to require(msg.value == 10 ether)
    // Mutant (missing require) would accept the call and not revert
    const tx = addr1.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    await expect(tx).to.be.reverted;
  });
});