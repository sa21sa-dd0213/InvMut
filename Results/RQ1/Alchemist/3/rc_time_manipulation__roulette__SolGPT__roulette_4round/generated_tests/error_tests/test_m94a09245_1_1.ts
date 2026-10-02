import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m94a09245 test", function () {
  it("should revert when two calls are made in the same block (original) but mutant allows second call", async function () {
    const [owner] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // First call with 10 ether
    const tx1 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to ensure we're not on block 0
    await ethers.provider.send("evm_mine", []);

    // Set owner's balance to 100 ether to cover both transactions
    await ethers.provider.send("hardhat_setBalance", [
      owner.address,
      "0x56BC75E2D63100000" // 100 ether in hex
    ]);

    // Send both transactions without mining between them
    const tx3 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    
    const tx4 = await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    // Mine a block to include both
    await ethers.provider.send("evm_mine", []);

    // Both should succeed in the mutant (which removes the timestamp check)
    // In the original, the second would revert due to same timestamp
    // We check that both actually succeeded (no revert)
    const receipt3 = await tx3.wait();
    const receipt4 = await tx4.wait();

    expect(receipt3.status).to.equal(1);
    expect(receipt4.status).to.equal(1);

    // Additional check: the mutant allows both to execute, so contract balance should be 20 ether
    // In original, second would revert and balance would be only 10 ether
    const balance = await ethers.provider.getBalance(await instance.getAddress());
    expect(balance).to.equal(ethers.parseEther("20"));
  });
});