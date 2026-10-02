import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mba127442", function () {
  it("should revert when sending less than 10 ether to fallback (original behavior), but mutant would accept it", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 5 ether (less than 10) to the fallback function
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("5")
    });

    // Original contract reverts because msg.value != 10 ether
    // Mutant would accept it due to <= comparison, so this test kills the mutant
    await expect(tx).to.be.reverted;
  });
});