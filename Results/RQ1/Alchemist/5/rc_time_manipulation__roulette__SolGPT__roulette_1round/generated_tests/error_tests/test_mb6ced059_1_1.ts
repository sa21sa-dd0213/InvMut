import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 - msg.value+1 replacement", function () {
  it("should revert when sending exactly 10 ether because mutant expects 9 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Wait for a new block to ensure block.timestamp > pastBlockTime
    await ethers.provider.send("evm_mine", []);

    // Send exactly 10 ether - this should pass on original but fail on mutant
    // because mutant requires msg.value+1 == 10 ether, i.e., msg.value == 9 ether
    const tx = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});