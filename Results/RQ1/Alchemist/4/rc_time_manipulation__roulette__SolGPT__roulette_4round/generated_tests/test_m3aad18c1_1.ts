import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m3aad18c1 - value check removed", function () {
  it("should revert when sending 1 ether (not 10 ether) to fallback in original, but mutant would not revert", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethert.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Wait for block timestamp to advance past initial pastBlockTime (0)
    await ethers.provider.send("evm_increaseTime", [1]);
    await ethers.provider.send("evm_mine", []);

    // Send 1 ether (not 10 ether) to fallback - original would revert, mutant would not
    const tx = owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("1")
    });

    // Expect revert because original requires exactly 10 ether
    await expect(tx).to.be.reverted;
  });
});