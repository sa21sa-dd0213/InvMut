import { expect } from "chai";
import { ethers } from "hardhat";

describe("Roulette mutant detection - mda340d38", function () {
  it("should detect mutant where block.number % 15 == 0 is replaced with true", async function () {
    const [owner, user] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("Roulette");
    const instance = await Factory.deploy();
    await instance.waitForDeployment();

    // Fund the contract with initial balance for transfer comparison
    await owner.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });

    const initialBalance = await ethers.provider.getBalance(await instance.getAddress());

    // First call - sends 10 ether, updates pastBlockTime
    const tx1 = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx1.wait();

    // Mine a new block to satisfy timestamp requirement
    await ethers.provider.send("evm_mine", []);

    // Second call - on original, payout only if block%15==0; on mutant, always pays out
    const userBalanceBefore = await ethers.provider.getBalance(user.address);
    const tx2 = await user.sendTransaction({
      to: await instance.getAddress(),
      value: ethers.parseEther("10")
    });
    await tx2.wait();
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    // On mutant: user receives the entire contract balance (including previous 20 ether)
    // On original: user receives nothing unless block%15==0 (unlikely in two blocks)
    // If user balance increased, mutant is detected (payout happened unconditionally)
    expect(userBalanceAfter).to.be.gt(userBalanceBefore);
  });
});