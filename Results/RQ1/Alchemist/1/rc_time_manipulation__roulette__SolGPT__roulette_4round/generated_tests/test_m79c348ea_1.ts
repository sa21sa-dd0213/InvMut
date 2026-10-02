import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m79c348ea test", function () {
  it("should detect the mutant by showing that two calls in the same block behave differently", async function () {
    const [owner, addr1] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with 10 ether so first call can succeed
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // First call: should succeed (block.timestamp > pastBlockTime, or prevrandao != pastBlockTime)
    await instance.connect(addr1).fallback({ value: ethers.parseEther("10") });

    // Attempt second call in the same block (by using evm_mine to ensure same block timestamp)
    // We'll mine a block with the same timestamp to simulate same-block call
    const blockBefore = await ethers.provider.getBlock("latest");
    await ethers.provider.send("evm_setNextBlockTimestamp", [blockBefore.timestamp]);
    await ethers.provider.send("evm_mine", []);

    // Now call again - original would revert (same timestamp), mutant might not (prevrandao changes)
    const tx = instance.connect(addr1).fallback({ value: ethers.parseEther("10") });
    
    // The mutant allows the second call to succeed, while original would revert
    // If it reverts, it's likely the original (or a correct mutant) - but we want to detect the mutant
    // So we expect the mutant to NOT revert (i.e., succeed)
    await expect(tx).to.not.be.reverted;
  });
});