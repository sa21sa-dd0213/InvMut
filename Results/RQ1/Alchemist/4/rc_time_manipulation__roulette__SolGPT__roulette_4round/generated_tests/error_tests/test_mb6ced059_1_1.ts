import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant mb6ced059 - msg.value+1 replacement", function () {
  it("should revert when sending exactly 10 ether because mutant expects msg.value+1 == 10 ether", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Wait for block time to advance past pastBlockTime (initialized to 0)
    await ethers.provider.send("evm_mine", []);

    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    await expect(tx).to.be.reverted;
  });
});