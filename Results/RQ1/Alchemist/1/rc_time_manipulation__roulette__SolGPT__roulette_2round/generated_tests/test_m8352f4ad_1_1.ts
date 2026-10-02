import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant m8352f4ad - kill test", function () {
  it("should transfer balance when block.number % 15 == 0 on original, but fail on mutant that replaces condition with false", async function () {
    const [owner, player] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Send 10 ether to the contract to meet the require condition
    const tx = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx.wait();

    // Check the contract has 10 ether
    const contractBalanceBefore = await ethers.provider.getBalance(await instance.getAddress());
    expect(contractBalanceBefore).to.equal(ethers.parseEther("10"));

    // Now we need to trigger the fallback at a block where block.number % 15 == 0
    // We can mine blocks until we reach such a block
    let currentBlock = await ethers.provider.getBlockNumber();
    while (currentBlock % 15 !== 0) {
      await ethers.provider.send("evm_mine", []);
      currentBlock = await ethers.provider.getBlockNumber();
    }

    const playerBalanceBefore = await ethers.provider.getBalance(player.address);

    // Send another 10 ether to trigger the fallback again at the correct block
    const tx2 = await player.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();

    const playerBalanceAfter = await ethers.provider.getBalance(player.address);

    // On original: player should receive the full contract balance (10 ether from first deposit)
    // On mutant: condition false, no transfer happens, player only loses gas
    const expectedGain = ethers.parseEther("10");
    // We check that player gained at least 10 ether (accounting for gas costs)
    expect(playerBalanceAfter - playerBalanceBefore).to.be.gt(expectedGain - ethers.parseEther("0.01")); // allow small gas cost
  });
});