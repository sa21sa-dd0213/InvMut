import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 test", function () {
  it("should revert when sending exactly 10 ether (mutant expects 9.999999999999999999 ether)", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call to set pastBlockTime (succeeds with any value)
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Wait for next block to ensure block.timestamp > pastBlockTime
    await ethers.provider.send("evm_mine", []);

    // Now send exactly 10 ether again
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Original would accept this; mutant reverts because msg.value+1 != 10 ether
    await expect(tx).to.be.reverted;
  });
});